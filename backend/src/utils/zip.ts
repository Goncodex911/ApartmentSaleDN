import { crc32 } from 'node:zlib';

export interface ZipEntry {
  name: string;
  data: Buffer;
}

/**
 * Tạo file ZIP dạng STORE (không nén) — ảnh JPEG đã nén sẵn nên nén lại không giảm dung lượng.
 * Cấu trúc theo chuẩn PKWARE APPNOTE: [Local header + data]... → Central directory → End record.
 * Giới hạn: < 65535 file và tổng < 4GB (đủ cho bộ ảnh một căn hộ). Cần Node >= 22.2 (zlib.crc32).
 */
export function createZip(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  // Định dạng ngày giờ MS-DOS: giờ (5 bit) | phút (6 bit) | giây/2 (5 bit); năm-1980 (7 bit) | tháng (4 bit) | ngày (5 bit)
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  for (const { name, data } of entries) {
    const nameBuffer = Buffer.from(name, 'utf8');
    const checksum = crc32(data);

    // Phần header dùng chung giữa Local header và Central directory (từ "version needed" đến "extra length")
    const common = Buffer.alloc(26);
    common.writeUInt16LE(20, 0); // version needed to extract (2.0)
    common.writeUInt16LE(0x0800, 2); // bit 11: tên file mã hóa UTF-8
    common.writeUInt16LE(0, 4); // method 0 = STORE
    common.writeUInt16LE(dosTime, 6);
    common.writeUInt16LE(dosDate, 8);
    common.writeUInt32LE(checksum, 10);
    common.writeUInt32LE(data.length, 14); // compressed size
    common.writeUInt32LE(data.length, 18); // uncompressed size
    common.writeUInt16LE(nameBuffer.length, 22);
    common.writeUInt16LE(0, 24); // extra field length

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    common.copy(localHeader, 4);
    localParts.push(localHeader, nameBuffer, data);

    const centralHeader = Buffer.alloc(46); // byte 32–41 (comment, disk, attrs) để 0
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4); // version made by
    common.copy(centralHeader, 6);
    centralHeader.writeUInt32LE(offset, 42); // vị trí Local header của file này
    centralParts.push(centralHeader, nameBuffer);

    offset += 30 + nameBuffer.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(entries.length, 8); // số entry trên disk này
  endRecord.writeUInt16LE(entries.length, 10); // tổng số entry
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(offset, 16); // vị trí bắt đầu Central directory

  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}
