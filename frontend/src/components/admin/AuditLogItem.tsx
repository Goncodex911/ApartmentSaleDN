import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Eye, KeyRound, RefreshCw, ShieldCheck, Tag, Trash2, UserCog, XCircle } from 'lucide-react';
import { AuditAction, AuditLogEntry } from '../../api/adminApi.js';
import { Badge } from '../ui/Badge.js';
import { STATUS_STYLE } from '../../utils/statusStyle.js';
import { formatVnd } from '../../utils/format.js';
import { ROLE_LABEL } from './UserBadges.js';

type Tone = React.ComponentProps<typeof Badge>['tone'];
export const ACTION_META: Record<AuditAction, { label: string; icon: React.ElementType; tone: Tone }> = {
  UNMASK_OWNER_CONTACT: { label: 'Xem SĐT chủ', icon: Eye, tone: 'gold' },
  CHANGE_STATUS: { label: 'Đổi trạng thái', icon: RefreshCw, tone: 'accent' },
  UPDATE_PRICE: { label: 'Đổi giá', icon: Tag, tone: 'accent' },
  DELETE_APARTMENT: { label: 'Xóa căn', icon: Trash2, tone: 'danger' },
  APPROVE_SUBMISSION: { label: 'Duyệt tin', icon: CheckCircle2, tone: 'AVAILABLE' },
  REJECT_SUBMISSION: { label: 'Từ chối tin', icon: XCircle, tone: 'danger' },
  CHANGE_USER_STATUS: { label: 'Khóa / mở tài khoản', icon: UserCog, tone: 'navy' },
  CHANGE_ROLE: { label: 'Đổi vai trò', icon: UserCog, tone: 'navy' },
  RESET_PASSWORD: { label: 'Reset mật khẩu', icon: KeyRound, tone: 'navy' },
  CHANGE_PASSWORD: { label: 'Tự đổi mật khẩu', icon: KeyRound, tone: 'navy' },
  DISMISS_REPORT: { label: 'Bỏ qua báo lỗi', icon: ShieldCheck, tone: 'neutral' },
};

const ACCOUNT_STATUS: Record<string, string> = { ACTIVE: 'Hoạt động', PENDING: 'Chờ duyệt', BLOCKED: 'Bị khóa' };
const valueLabel = (action: AuditAction, value?: string | number) => {
  if (value === undefined) return '?';
  if (action === 'UPDATE_PRICE') return formatVnd(Number(value));
  if (action === 'CHANGE_STATUS') return STATUS_STYLE[value as keyof typeof STATUS_STYLE]?.label ?? String(value);
  if (action === 'CHANGE_ROLE') return ROLE_LABEL[value as keyof typeof ROLE_LABEL] ?? String(value);
  if (action === 'CHANGE_USER_STATUS') return ACCOUNT_STATUS[value] ?? String(value);
  return String(value);
};

// "Từ → sang" / lý do từ chối — chữ thường, đọc nhanh trên điện thoại
const detailText = ({ action, details }: AuditLogEntry) => {
  if (!details) return '';
  if (details.reason) return `Lý do: ${details.reason}`;
  if (details.canReport !== undefined) return details.canReport ? 'Mở lại quyền báo lỗi' : 'Khóa quyền báo lỗi';
  if (details.reporters !== undefined) return `${details.reporters} người báo${details.wrongReport ? ' · đánh dấu báo sai' : ''}`;
  if (details.from !== undefined || details.to !== undefined) return `${valueLabel(action, details.from)} → ${valueLabel(action, details.to)}`;
  return '';
};

// Thiết bị rút gọn từ User-Agent (đủ để nhận ra "máy lạ"), không cần thư viện
const deviceOf = (userAgent = '') => {
  const os = /iPhone|iPad/.test(userAgent) ? 'iPhone/iPad' : /Android/.test(userAgent) ? 'Android' : /Windows/.test(userAgent) ? 'Windows' : /Mac OS/.test(userAgent) ? 'Mac' : '';
  const app = /Zalo/i.test(userAgent) ? 'Zalo' : /Edg\//.test(userAgent) ? 'Edge' : /Chrome\//.test(userAgent) ? 'Chrome' : /Safari\//.test(userAgent) ? 'Safari' : /Firefox\//.test(userAgent) ? 'Firefox' : '';
  return [os, app].filter(Boolean).join(' · ') || 'Không rõ thiết bị';
};

const pad = (value: number) => String(value).padStart(2, '0');
// DD/MM/YYYY HH:mm:ss theo giờ máy
export const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/** 1 dòng nhật ký (Story 13.3): hành động + thời gian, đối tượng (bấm mở căn), người thực hiện, IP & thiết bị. */
export const AuditLogItem: React.FC<{ log: AuditLogEntry }> = ({ log }) => {
  const meta = ACTION_META[log.action] ?? { label: log.action, icon: Eye, tone: 'neutral' }; // Hành động mới chưa có nhãn → không làm hỏng trang
  const detail = detailText(log);
  const canOpen = log.targetType === 'APARTMENT' && log.action !== 'DELETE_APARTMENT';
  return (
    <li className="p-3 rounded-2xl bg-white border border-slate-200 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Badge tone={meta.tone} icon={meta.icon}>{meta.label}</Badge>
        <time dateTime={log.createdAt} className="text-xs text-slate-600 tabular-nums">{formatDateTime(log.createdAt)}</time>
      </div>
      {canOpen ? (
        <Link to="/apartments" state={{ openApartmentId: log.targetId }} className="block font-semibold text-indigo-700 hover:underline truncate">
          {log.targetTitle || 'Căn hộ'}
        </Link>
      ) : (
        <p className="font-semibold text-slate-900 truncate">{log.targetTitle || '—'}</p>
      )}
      {detail && <p className="text-sm text-slate-700 break-words">{detail}</p>}
      <p className="text-sm text-slate-600">
        <span className="font-medium text-slate-800">{log.userName || 'Không rõ'}</span> · {ROLE_LABEL[log.userRole] ?? log.userRole}
      </p>
      <p className="text-xs text-slate-600 truncate">
        {log.ipAddress || 'Không rõ IP'} · {deviceOf(log.userAgent)}
      </p>
    </li>
  );
};
