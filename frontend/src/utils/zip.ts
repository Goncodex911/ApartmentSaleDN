// CRC-32 (chuẩn ZIP) — trình duyệt không có sẵn như zlib.crc32 của Node
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (data: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

/**
 * File ZIP dạng STORE (không nén — ảnh JPEG đã nén sẵn) tạo ngay trên trình duyệt (Story 10.3).
 * Cấu trúc PKWARE APPNOTE: [Local header + dữ liệu]... → Central directory → End record. Chuyển từ backend/src/utils/zip.ts.
 */
export function createZip(entries: { name: string; data: Uint8Array }[]): Blob {
  const parts: BlobPart[] = [];
  const central: BlobPart[] = [];
  let offset = 0;
  let centralSize = 0;

  for (const { name, data } of entries) {
    const nameBytes = new TextEncoder().encode(name);
    // Phần chung của Local header & Central directory: version, cờ UTF-8, STORE, ngày giờ (để 0), CRC, kích thước, độ dài tên
    const common = new DataView(new ArrayBuffer(26));
    common.setUint16(0, 20, true);
    common.setUint16(2, 0x0800, true);
    common.setUint32(10, crc32(data), true);
    common.setUint32(14, data.length, true);
    common.setUint32(18, data.length, true);
    common.setUint16(22, nameBytes.length, true);

    const local = new Uint8Array(30);
    new DataView(local.buffer).setUint32(0, 0x04034b50, true);
    local.set(new Uint8Array(common.buffer), 4);
    parts.push(local, nameBytes, data);

    const header = new Uint8Array(46);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    header.set(new Uint8Array(common.buffer), 6);
    view.setUint32(42, offset, true);
    central.push(header, nameBytes);

    offset += 30 + nameBytes.length + data.length;
    centralSize += 46 + nameBytes.length;
  }

  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
}
