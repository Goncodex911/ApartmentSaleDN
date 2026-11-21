import React, { useEffect, useState } from 'react';
import { AdminUser, userApi } from '../../api/userApi.js';
import { AuditSeverity } from '../../api/adminApi.js';
import { Select, fieldClass } from '../ui/Input.js';
import { SEVERITY_LABEL } from './auditMeta.js';

export type AuditRange = '' | 'today' | '7d' | '30d' | 'custom';
export interface AuditFilterValues {
  severity: '' | AuditSeverity;
  userId: string;
  range: AuditRange;
  from: string; // YYYY-MM-DD (khoảng tự chọn)
  to: string;
}

const RANGES: { id: AuditRange; label: string }[] = [
  { id: '', label: 'Mọi lúc' },
  { id: 'today', label: 'Hôm nay' },
  { id: '7d', label: '7 ngày' },
  { id: '30d', label: '30 ngày' },
  { id: 'custom', label: 'Tự chọn' },
];

/** Khoảng thời gian → from / to dạng ISO gửi API (theo giờ máy người xem). */
export function rangeToDates({ range, from, to }: AuditFilterValues): { from?: string; to?: string } {
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const now = new Date();
  if (range === 'today') return { from: startOfDay(now).toISOString() };
  if (range === '7d' || range === '30d') return { from: new Date(startOfDay(now).getTime() - (range === '7d' ? 6 : 29) * 86_400_000).toISOString() };
  if (range === 'custom') {
    return {
      from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
    };
  }
  return {};
}

/** Story 16.2: lọc mức độ · người thực hiện · thời gian. Ô nhập 16px, vùng chạm ≥ 44px. */
export const AuditFilters: React.FC<{ values: AuditFilterValues; onChange: (patch: Partial<AuditFilterValues>) => void }> = ({ values, onChange }) => {
  const [members, setMembers] = useState<AdminUser[]>([]);
  useEffect(() => {
    userApi.listUsers({ limit: 100 }).then((result) => setMembers(result.items)).catch(() => setMembers([])); // Lỗi → vẫn lọc được bằng ô tìm tên
  }, []);

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <Select aria-label="Mức độ" value={values.severity} onChange={(e) => onChange({ severity: e.target.value as AuditFilterValues['severity'] })}>
        <option value="">Mọi mức độ</option>
        {(Object.keys(SEVERITY_LABEL) as AuditSeverity[]).map((severity) => (
          <option key={severity} value={severity}>{SEVERITY_LABEL[severity]}</option>
        ))}
      </Select>
      <Select aria-label="Người thực hiện" value={values.userId} onChange={(e) => onChange({ userId: e.target.value })}>
        <option value="">Mọi người</option>
        {members.map((member) => (
          <option key={member._id} value={member._id}>{member.name} · {member.ctvCode}</option>
        ))}
      </Select>
      <Select aria-label="Thời gian" value={values.range} onChange={(e) => onChange({ range: e.target.value as AuditRange })}>
        {RANGES.map((range) => (
          <option key={range.id} value={range.id}>{range.label}</option>
        ))}
      </Select>
      {values.range === 'custom' && (
        <div className="grid grid-cols-2 gap-2 sm:col-span-3">
          <label className="text-sm text-slate-700">
            Từ ngày
            <input type="date" value={values.from} max={values.to || undefined} onChange={(e) => onChange({ from: e.target.value })} className={`${fieldClass} mt-1`} />
          </label>
          <label className="text-sm text-slate-700">
            Đến ngày
            <input type="date" value={values.to} min={values.from || undefined} onChange={(e) => onChange({ to: e.target.value })} className={`${fieldClass} mt-1`} />
          </label>
        </div>
      )}
    </div>
  );
};
