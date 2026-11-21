/** Định dạng tiền VNĐ dùng chung toàn app: 7200000 → "7.200.000đ". */
export const formatVnd = (value?: number) => new Intl.NumberFormat('vi-VN').format(value || 0) + 'đ';

// "5 phút trước" / "3 giờ trước" / ngày — dùng cho chuông thông báo (6.3), hoạt động cuối (16.3)
export const timeAgo = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)} giờ trước`;
  if (minutes < 7 * 24 * 60) return `${Math.round(minutes / 1440)} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
};

// Story 16.9 (Q5): báo cho thành viên biết thao tác được ghi nhật ký — màn hình đăng nhập + Hồ sơ cá nhân
export const ACTIVITY_LOG_NOTICE = 'Thao tác trong hệ thống được ghi nhật ký để bảo vệ dữ liệu và tài khoản của bạn.';
