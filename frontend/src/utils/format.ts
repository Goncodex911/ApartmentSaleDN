/** Định dạng tiền VNĐ dùng chung toàn app: 7200000 → "7.200.000đ". */
export const formatVnd = (value?: number) => new Intl.NumberFormat('vi-VN').format(value || 0) + 'đ';
