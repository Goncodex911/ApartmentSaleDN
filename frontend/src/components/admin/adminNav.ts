import { Activity, Archive, BellRing, LayoutDashboard, LucideIcon, MapPin, Megaphone, ScrollText, Settings, ShieldAlert, Trash2, Trophy, Users } from 'lucide-react';

/**
 * Story 16.1: điều hướng khu Quản trị — 1 nguồn cho sidebar (máy tính) và menu đáy (điện thoại).
 * `bar: true` → nằm trên menu đáy (tối đa 4 mục + "Thêm"); còn lại vào bảng "Thêm". Story sau chỉ thêm 1 dòng ở đây.
 */
export interface AdminNavItem {
  to: string;
  label: string;
  short?: string; // Nhãn ngắn cho menu đáy
  icon: LucideIcon;
  bar?: boolean;
  badge?: 'alerts'; // Story 16.5: số cảnh báo chưa xử lý
}

export const ADMIN_NAV: AdminNavItem[] = [
  { to: '/admin', label: 'Tổng quan', icon: LayoutDashboard, bar: true },
  { to: '/admin/users', label: 'Thành viên', icon: Users, bar: true },
  { to: '/admin/audit-logs', label: 'Nhật ký hoạt động', short: 'Nhật ký', icon: ScrollText, bar: true },
  { to: '/admin/alerts', label: 'Cảnh báo', icon: BellRing, bar: true, badge: 'alerts' },
  { to: '/admin/moderation', label: 'Kiểm duyệt báo lỗi', short: 'Kiểm duyệt', icon: ShieldAlert },
  { to: '/admin/announcements', label: 'Thông báo chung', icon: Megaphone }, // Story 16.9
  { to: '/admin/stale', label: 'Kho tồn', icon: Archive }, // Story 16.7
  { to: '/admin/map-qa', label: 'Rà soát bản đồ', short: 'Bản đồ', icon: MapPin }, // Story 17.6
  { to: '/admin/trash', label: 'Thùng rác', icon: Trash2 },
  { to: '/admin/performance', label: 'Hiệu suất CTV', icon: Trophy },
  { to: '/admin/health', label: 'Sức khỏe hệ thống', icon: Activity }, // Story 16.8a
  { to: '/admin/settings', label: 'Cấu hình', icon: Settings },
];

// Story 16.5: trang Cảnh báo xử lý xong → menu tải lại số chưa xử lý
export const ALERTS_CHANGED = 'admin-alerts-changed';
export const notifyAlertsChanged = () => window.dispatchEvent(new Event(ALERTS_CHANGED));
// Story 16.8a: kiểm tra lại dịch vụ xong → dải cảnh báo sự cố tải lại
export const HEALTH_CHANGED = 'admin-health-changed';
export const notifyHealthChanged = () => window.dispatchEvent(new Event(HEALTH_CHANGED));

// Chế độ dùng gần nhất của Admin (Quản trị / Bảng hàng) — mở lại app ("/") vào đúng chế độ
const MODE_KEY = 'admin-last-mode';
export const saveAdminMode = (mode: 'admin' | 'app') => {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Trình duyệt chặn lưu trữ → luôn vào Bảng hàng
  }
};
export const lastAdminMode = () => {
  try {
    return localStorage.getItem(MODE_KEY);
  } catch {
    return null;
  }
};
