import {
  Ban, CheckCircle2, Megaphone, Download, Eye, FilePen, FilePlus2, FileX2, Flag, KeyRound, Link2, LogIn, LogOut, Pencil, PlusCircle, RefreshCw,
  Send, Settings, ShieldAlert, ShieldCheck, Sparkles, StickyNote, Tag, Trash2, Undo2, UserCog, UserPlus, XCircle,
} from 'lucide-react';
import type React from 'react';
import { AuditAction, AuditCategory, AuditSeverity } from '../../api/adminApi.js';
import type { Badge } from '../ui/Badge.js';

type Tone = React.ComponentProps<typeof Badge>['tone'];

/** Nhãn + icon + màu từng hành động (Story 13.3, mở rộng 16.2). */
export const ACTION_META: Record<AuditAction, { label: string; icon: React.ElementType; tone: Tone }> = {
  LOGIN: { label: 'Đăng nhập', icon: LogIn, tone: 'neutral' },
  LOGOUT: { label: 'Đăng xuất', icon: LogOut, tone: 'neutral' },
  LOGIN_FAILED: { label: 'Đăng nhập sai', icon: ShieldAlert, tone: 'danger' },
  LOGIN_BLOCKED: { label: 'Bị chặn đăng nhập', icon: Ban, tone: 'danger' },
  UNMASK_OWNER_CONTACT: { label: 'Xem SĐT chủ', icon: Eye, tone: 'gold' },
  CREATE_APARTMENT: { label: 'Tạo căn', icon: PlusCircle, tone: 'AVAILABLE' },
  UPDATE_APARTMENT: { label: 'Sửa căn', icon: Pencil, tone: 'accent' },
  CHANGE_STATUS: { label: 'Đổi trạng thái', icon: RefreshCw, tone: 'accent' },
  UPDATE_PRICE: { label: 'Đổi giá', icon: Tag, tone: 'accent' },
  DELETE_APARTMENT: { label: 'Chuyển vào Thùng rác', icon: Trash2, tone: 'danger' },
  RESTORE_APARTMENT: { label: 'Khôi phục căn', icon: Undo2, tone: 'AVAILABLE' },
  PURGE_APARTMENT: { label: 'Xóa vĩnh viễn căn', icon: Trash2, tone: 'danger' },
  ADD_SUBLISTING: { label: 'Thêm nguồn phụ', icon: PlusCircle, tone: 'neutral' },
  REMOVE_SUBLISTING: { label: 'Gỡ nguồn phụ', icon: Undo2, tone: 'neutral' },
  RENEW_LEASE: { label: 'Gia hạn hợp đồng', icon: RefreshCw, tone: 'neutral' },
  AI_IMPORT: { label: 'Nhập tin AI', icon: Sparkles, tone: 'accent' },
  SUBMIT_LISTING: { label: 'Gửi tin đăng', icon: FilePlus2, tone: 'neutral' },
  UPDATE_SUBMISSION: { label: 'Sửa tin đăng', icon: FilePen, tone: 'neutral' },
  WITHDRAW_SUBMISSION: { label: 'Rút tin đăng', icon: FileX2, tone: 'neutral' },
  APPROVE_SUBMISSION: { label: 'Duyệt tin', icon: CheckCircle2, tone: 'AVAILABLE' },
  REJECT_SUBMISSION: { label: 'Từ chối tin', icon: XCircle, tone: 'danger' },
  CREATE_REPORT: { label: 'Báo lỗi tin', icon: Flag, tone: 'gold' },
  RESOLVE_REPORT: { label: 'Xử lý báo lỗi', icon: ShieldCheck, tone: 'neutral' },
  DISMISS_REPORT: { label: 'Bỏ qua báo lỗi', icon: ShieldCheck, tone: 'neutral' },
  CREATE_SHARE_LINK: { label: 'Tạo link xem phòng', icon: Link2, tone: 'neutral' },
  CHANGE_USER_STATUS: { label: 'Khóa / mở tài khoản', icon: UserCog, tone: 'navy' },
  CHANGE_ROLE: { label: 'Đổi vai trò', icon: UserCog, tone: 'navy' },
  RESET_PASSWORD: { label: 'Reset mật khẩu', icon: KeyRound, tone: 'navy' },
  CHANGE_PASSWORD: { label: 'Tự đổi mật khẩu', icon: KeyRound, tone: 'navy' },
  CREATE_USER: { label: 'Tạo tài khoản', icon: UserPlus, tone: 'navy' },
  UPDATE_USER: { label: 'Sửa thông tin thành viên', icon: UserCog, tone: 'navy' },
  ADD_USER_NOTE: { label: 'Thêm ghi chú nội bộ', icon: StickyNote, tone: 'neutral' },
  DELETE_USER_NOTE: { label: 'Xóa ghi chú nội bộ', icon: StickyNote, tone: 'neutral' },
  REVOKE_SESSION: { label: 'Đăng xuất 1 thiết bị', icon: LogOut, tone: 'danger' },
  REVOKE_ALL_SESSIONS: { label: 'Đăng xuất mọi thiết bị', icon: LogOut, tone: 'danger' },
  UPDATE_SETTINGS: { label: 'Đổi cấu hình', icon: Settings, tone: 'navy' },
  ADD_TELEGRAM_SOURCE: { label: 'Thêm nhóm Telegram', icon: Send, tone: 'navy' },
  TOGGLE_TELEGRAM_SOURCE: { label: 'Bật / tắt nhóm Telegram', icon: Send, tone: 'navy' },
  REMOVE_TELEGRAM_SOURCE: { label: 'Xóa nhóm Telegram', icon: Send, tone: 'navy' },
  EXPORT_AUDIT_CSV: { label: 'Xuất nhật ký CSV', icon: Download, tone: 'navy' },
  SEND_ANNOUNCEMENT: { label: 'Gửi thông báo chung', icon: Megaphone, tone: 'navy' },
  REVOKE_ANNOUNCEMENT: { label: 'Thu hồi thông báo chung', icon: Megaphone, tone: 'neutral' },
  CONNECT_TELEGRAM_ACCOUNT: { label: 'Kết nối Telegram cá nhân', icon: Send, tone: 'accent' },
  DISCONNECT_TELEGRAM_ACCOUNT: { label: 'Hủy kết nối Telegram cá nhân', icon: Send, tone: 'neutral' },
  TELEGRAM_SCRAPE: { label: 'Cào tin Telegram', icon: Send, tone: 'AVAILABLE' },
  TOGGLE_TELEGRAM_LISTENER: { label: 'Bật / tắt đón tin Telegram', icon: Send, tone: 'accent' },
};

export const CATEGORY_TABS: { id: '' | AuditCategory; label: string }[] = [
  { id: '', label: 'Tất cả' },
  { id: 'AUTH', label: 'Đăng nhập' },
  { id: 'INVENTORY', label: 'Kho căn' },
  { id: 'SUBMISSION', label: 'Tin đăng & báo lỗi' },
  { id: 'SHARE', label: 'Chia sẻ' },
  { id: 'ACCOUNT', label: 'Tài khoản' },
  { id: 'ADMIN', label: 'Quản trị' },
];

export const SEVERITY_LABEL: Record<AuditSeverity, string> = { NORMAL: 'Thông thường', IMPORTANT: 'Quan trọng', SECURITY: 'Bảo mật' };

// Tên trường dễ đọc cho mục "Sửa căn" (trường lạ → giữ đường dẫn gốc)
const FIELD_LABEL: Record<string, string> = {
  title: 'Tiêu đề', description: 'Mô tả', priceUsd: 'Giá USD', minLeaseMonths: 'Thuê tối thiểu', includedServices: 'Dịch vụ bao gồm',
  images: 'Ảnh', videos: 'Video', availableDate: 'Ngày trống', 'location.street': 'Tên đường', 'location.houseNumber': 'Số nhà',
  'location.zone': 'Khu vực', 'location.district': 'Quận', 'location.ward': 'Phường', 'location.mapUrl': 'Link Google Maps',
  'location.coordinates': 'Vị trí trên bản đồ', 'location.buildingName': 'Tên tòa nhà', 'attributes.propertyType': 'Loại căn',
  'attributes.area': 'Diện tích', 'attributes.bedrooms': 'Phòng ngủ', 'attributes.bathrooms': 'Phòng tắm', 'attributes.furnishing': 'Nội thất',
  name: 'Tên', phone: 'SĐT', email: 'Email', reviewPolicy: 'Chính sách duyệt tin', hotline: 'Hotline', zaloOaUrl: 'Zalo OA',
  needsReview: 'Cần kiểm tra',
  'ownerContact.phone': 'SĐT chủ', 'ownerContact.name': 'Tên chủ', 'ownerContact.note': 'Ghi chú chủ',
};
export const fieldLabel = (path: string) => FIELD_LABEL[path] ?? path;
export const changeValue = (value: unknown) => (value === null || value === undefined || value === '' ? '(trống)' : Array.isArray(value) ? value.join(', ') : String(value));
