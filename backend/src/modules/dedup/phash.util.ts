import sharp from 'sharp';

/**
 * Tiện ích tính toán mã băm nhận thức ảnh (Perceptual Difference Hash - dHash 64-bit)
 * và so sánh độ tương đồng thị giác theo khoảng cách Hamming.
 */
export class PHashUtil {
  /**
   * Tính mã băm 64-bit dHash (16 ký tự Hex) từ Buffer ảnh (tải ảnh bằng utils/fetch-image.ts)
   */
  public static async computeDHash(buffer: Buffer): Promise<string> {
    // Chuyển ảnh về ảnh xám (grayscale) và resize kích thước 9x8 pixels
    const raw = await sharp(buffer)
      .grayscale()
      .resize(9, 8, { fit: 'fill' })
      .raw()
      .toBuffer();

    // Duyệt qua 8 hàng, mỗi hàng so sánh 8 cặp pixel liền kề (trái > phải) -> 64 bits
    let hexResult = '';
    for (let row = 0; row < 8; row++) {
      let byte = 0;
      for (let col = 0; col < 8; col++) {
        const leftPixel = raw[row * 9 + col];
        const rightPixel = raw[row * 9 + col + 1];
        if (leftPixel > rightPixel) {
          byte |= 1 << (7 - col);
        }
      }
      hexResult += byte.toString(16).padStart(2, '0');
    }

    return hexResult;
  }

  /**
   * Tính khoảng cách Hamming giữa hai chuỗi mã băm 64-bit (số bit khác nhau)
   */
  public static hammingDistance(hash1: string, hash2: string): number {
    if (!hash1 || !hash2 || hash1.length !== 16 || hash2.length !== 16) {
      return 64; // Không thể so khớp, trả về khoảng cách tối đa
    }

    let distance = 0;
    for (let i = 0; i < 16; i++) {
      let xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
      while (xor > 0) {
        distance += xor & 1;
        xor >>= 1;
      }
    }
    return distance;
  }

  /**
   * Tính phần trăm tương đồng giữa hai ảnh (0% - 100%)
   */
  public static calculateSimilarity(hash1: string, hash2: string): number {
    const dist = this.hammingDistance(hash1, hash2);
    return Math.round(((64 - dist) / 64) * 100);
  }

  /**
   * Kiểm tra xem 2 ảnh có phải là cùng một ảnh phòng hay không (ngưỡng mặc định dist <= 8, tức >= 87.5%)
   */
  public static isMatch(hash1: string, hash2: string, maxDistance = 8): boolean {
    return this.hammingDistance(hash1, hash2) <= maxDistance;
  }
}

