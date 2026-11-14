/** Bỏ dấu tiếng Việt + chữ thường để so khớp không phân biệt dấu (VD: "Cầu Giấy" ≈ "cau giay"). */
export const removeVietnameseTones = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();

/** Chuẩn hóa tên quận để so khớp: bỏ dấu và bỏ tiền tố "quận/huyện/thị xã" (VD: "Quận Cầu Giấy" → "cau giay"). */
export const normalizeDistrict = (district: string) =>
  removeVietnameseTones(district).replace(/^(quan|huyen|thi xa)\s+/, '').trim();
