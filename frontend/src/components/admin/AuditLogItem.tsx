import React from 'react';
import { Eye } from 'lucide-react';
import { AuditAction, AuditLogEntry } from '../../api/adminApi.js';
import { Badge } from '../ui/Badge.js';
import { STATUS_STYLE } from '../../utils/statusStyle.js';
import { formatVnd } from '../../utils/format.js';
import { deviceOf } from '../../utils/device.js';
import { ROLE_LABEL } from './UserBadges.js';
import { ACTION_META, fieldLabel } from './auditMeta.js';

const ACCOUNT_STATUS: Record<string, string> = { ACTIVE: 'Hoạt động', PENDING: 'Chờ duyệt', BLOCKED: 'Bị khóa' };
const valueLabel = (action: AuditAction, value?: string | number) => {
  if (value === undefined) return '?';
  if (action === 'UPDATE_PRICE') return formatVnd(Number(value));
  if (action === 'CHANGE_STATUS') return STATUS_STYLE[value as keyof typeof STATUS_STYLE]?.label ?? String(value);
  if (action === 'CHANGE_ROLE') return ROLE_LABEL[value as keyof typeof ROLE_LABEL] ?? String(value);
  if (action === 'CHANGE_USER_STATUS') return ACCOUNT_STATUS[value] ?? String(value);
  return String(value);
};

// Tóm tắt 1 dòng: "Từ → sang" / lý do / các trường đã sửa — chữ thường, đọc nhanh trên điện thoại
export const detailText = ({ action, details }: AuditLogEntry) => {
  if (!details) return '';
  if (details.changes) return `Đã sửa: ${Object.keys(details.changes).map(fieldLabel).join(', ')}`;
  if (details.reason) return `Lý do: ${details.reason}`;
  if (details.canReport !== undefined) return details.canReport ? 'Mở lại quyền báo lỗi' : 'Khóa quyền báo lỗi';
  if (details.reporters !== undefined) return `${details.reporters} người báo${details.wrongReport ? ' · đánh dấu báo sai' : ''}`;
  if (details.from !== undefined || details.to !== undefined) return `${valueLabel(action, details.from)} → ${valueLabel(action, details.to)}`;
  if (details.months) return `Thêm ${details.months} tháng`;
  if (details.rows !== undefined) return `${details.rows} dòng`;
  return '';
};

export const actionMeta = (action: AuditAction) => ACTION_META[action] ?? { label: action, icon: Eye, tone: 'neutral' as const }; // Hành động lạ → không hỏng trang
export const roleText = (role: AuditLogEntry['userRole']) => (role ? ROLE_LABEL[role] ?? role : 'Khách');

const pad = (value: number) => String(value).padStart(2, '0');
// DD/MM/YYYY HH:mm:ss theo giờ máy
export const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/** 1 thẻ nhật ký (điện thoại — Story 13.3 / 16.2): hành động + thời gian, đối tượng, tóm tắt, người thực hiện, IP & thiết bị. Bấm → chi tiết. */
export const AuditLogItem: React.FC<{ log: AuditLogEntry; onOpen: (log: AuditLogEntry) => void }> = ({ log, onOpen }) => {
  const meta = actionMeta(log.action);
  const detail = detailText(log);
  return (
    <li>
      <button type="button" onClick={() => onOpen(log)} className="w-full text-left p-3 rounded-2xl bg-white border border-slate-200 space-y-1.5 cursor-pointer active:bg-slate-50 transition-colors duration-100">
        <span className="flex items-center justify-between gap-2">
          <Badge tone={meta.tone} icon={meta.icon}>{meta.label}</Badge>
          <time dateTime={log.createdAt} className="text-xs text-slate-600 tabular-nums">{formatDateTime(log.createdAt)}</time>
        </span>
        <span className="block font-semibold text-slate-900 truncate">{log.targetTitle || '—'}</span>
        {detail && <span className="block text-sm text-slate-700 break-words">{detail}</span>}
        <span className="block text-sm text-slate-600">
          <span className="font-medium text-slate-800">{log.userName || 'Không rõ'}</span> · {roleText(log.userRole)}
        </span>
        <span className="block text-xs text-slate-600 truncate">
          {log.ipAddress || 'Không rõ IP'} · {deviceOf(log.userAgent)}
        </span>
      </button>
    </li>
  );
};
