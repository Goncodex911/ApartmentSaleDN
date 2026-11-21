import type { AuditAction, AuditCategory, AuditSeverity } from './audit-log.model.js';

/**
 * Story 16.2: nhóm + mức độ suy ra từ tên hành động (nơi gọi AuditService.log không phải truyền thêm).
 * Mức Thông thường giữ 60 ngày; Quan trọng / Bảo mật giữ 180 ngày (Q1).
 */
type Meta = { category: AuditCategory; severity: AuditSeverity; label: string };

export const ACTION_META: Record<AuditAction, Meta> = {
  LOGIN: { category: 'AUTH', severity: 'NORMAL', label: 'Đăng nhập' },
  LOGOUT: { category: 'AUTH', severity: 'NORMAL', label: 'Đăng xuất' },
  LOGIN_FAILED: { category: 'AUTH', severity: 'SECURITY', label: 'Đăng nhập sai' },
  LOGIN_BLOCKED: { category: 'AUTH', severity: 'SECURITY', label: 'Bị chặn đăng nhập' },

  UNMASK_OWNER_CONTACT: { category: 'INVENTORY', severity: 'SECURITY', label: 'Xem SĐT chủ' },
  CREATE_APARTMENT: { category: 'INVENTORY', severity: 'NORMAL', label: 'Tạo căn' },
  UPDATE_APARTMENT: { category: 'INVENTORY', severity: 'NORMAL', label: 'Sửa căn' },
  CHANGE_STATUS: { category: 'INVENTORY', severity: 'IMPORTANT', label: 'Đổi trạng thái' },
  UPDATE_PRICE: { category: 'INVENTORY', severity: 'IMPORTANT', label: 'Đổi giá' },
  DELETE_APARTMENT: { category: 'INVENTORY', severity: 'IMPORTANT', label: 'Chuyển căn vào Thùng rác' },
  RESTORE_APARTMENT: { category: 'INVENTORY', severity: 'IMPORTANT', label: 'Khôi phục căn' },
  PURGE_APARTMENT: { category: 'INVENTORY', severity: 'IMPORTANT', label: 'Xóa vĩnh viễn căn' },
  ADD_SUBLISTING: { category: 'INVENTORY', severity: 'NORMAL', label: 'Thêm nguồn phụ' },
  REMOVE_SUBLISTING: { category: 'INVENTORY', severity: 'NORMAL', label: 'Gỡ nguồn phụ' },
  RENEW_LEASE: { category: 'INVENTORY', severity: 'NORMAL', label: 'Gia hạn hợp đồng' },
  AI_IMPORT: { category: 'INVENTORY', severity: 'NORMAL', label: 'Nhập tin AI' },

  SUBMIT_LISTING: { category: 'SUBMISSION', severity: 'NORMAL', label: 'Gửi tin đăng' },
  UPDATE_SUBMISSION: { category: 'SUBMISSION', severity: 'NORMAL', label: 'Sửa tin đăng' },
  WITHDRAW_SUBMISSION: { category: 'SUBMISSION', severity: 'NORMAL', label: 'Rút tin đăng' },
  APPROVE_SUBMISSION: { category: 'SUBMISSION', severity: 'IMPORTANT', label: 'Duyệt tin' },
  REJECT_SUBMISSION: { category: 'SUBMISSION', severity: 'IMPORTANT', label: 'Từ chối tin' },
  CREATE_REPORT: { category: 'SUBMISSION', severity: 'NORMAL', label: 'Báo lỗi tin' },
  RESOLVE_REPORT: { category: 'SUBMISSION', severity: 'NORMAL', label: 'Xử lý báo lỗi' },
  DISMISS_REPORT: { category: 'SUBMISSION', severity: 'IMPORTANT', label: 'Gỡ cờ báo lỗi' },

  CREATE_SHARE_LINK: { category: 'SHARE', severity: 'NORMAL', label: 'Tạo link xem phòng' },

  CHANGE_USER_STATUS: { category: 'ACCOUNT', severity: 'SECURITY', label: 'Khóa / mở tài khoản' },
  CHANGE_ROLE: { category: 'ACCOUNT', severity: 'SECURITY', label: 'Đổi vai trò' },
  RESET_PASSWORD: { category: 'ACCOUNT', severity: 'SECURITY', label: 'Đặt lại mật khẩu' },
  CHANGE_PASSWORD: { category: 'ACCOUNT', severity: 'SECURITY', label: 'Đổi mật khẩu' },
  CREATE_USER: { category: 'ACCOUNT', severity: 'SECURITY', label: 'Tạo tài khoản' },
  UPDATE_USER: { category: 'ACCOUNT', severity: 'SECURITY', label: 'Sửa thông tin thành viên' },
  ADD_USER_NOTE: { category: 'ACCOUNT', severity: 'NORMAL', label: 'Thêm ghi chú nội bộ' },
  DELETE_USER_NOTE: { category: 'ACCOUNT', severity: 'NORMAL', label: 'Xóa ghi chú nội bộ' },
  REVOKE_SESSION: { category: 'ACCOUNT', severity: 'SECURITY', label: 'Đăng xuất 1 thiết bị' },
  REVOKE_ALL_SESSIONS: { category: 'ACCOUNT', severity: 'SECURITY', label: 'Đăng xuất mọi thiết bị' },

  UPDATE_SETTINGS: { category: 'ADMIN', severity: 'IMPORTANT', label: 'Đổi cấu hình' },
  ADD_TELEGRAM_SOURCE: { category: 'ADMIN', severity: 'IMPORTANT', label: 'Thêm nhóm Telegram' },
  TOGGLE_TELEGRAM_SOURCE: { category: 'ADMIN', severity: 'IMPORTANT', label: 'Bật / tắt nhóm Telegram' },
  REMOVE_TELEGRAM_SOURCE: { category: 'ADMIN', severity: 'IMPORTANT', label: 'Xóa nhóm Telegram' },
  EXPORT_AUDIT_CSV: { category: 'ADMIN', severity: 'IMPORTANT', label: 'Xuất nhật ký CSV' },
  SEND_ANNOUNCEMENT: { category: 'ADMIN', severity: 'IMPORTANT', label: 'Gửi thông báo chung' },
  REVOKE_ANNOUNCEMENT: { category: 'ADMIN', severity: 'IMPORTANT', label: 'Thu hồi thông báo chung' },
};

export const NORMAL_RETENTION_MS = 60 * 24 * 60 * 60 * 1000;

// SĐT che 3 số giữa: 0905123456 → 0905***456
export const maskPhone = (phone: string) => phone.replace(/^(\d{4})\d{3}(\d+)$/, '$1***$2');
