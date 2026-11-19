import React, { useEffect, useState } from 'react';
import { LeaseInput } from '../../api/apartmentApi.js';
import { userApi } from '../../api/userApi.js';
import { BottomSheet } from '../layout/BottomSheet.js';
import { ToggleChip } from './formFields.js';
import { Button } from '../ui/Button.js';
import { fieldClass } from '../ui/Input.js';

const DURATIONS = [1, 3, 6, 12];
const inputClass = fieldClass; // Ô nhập chuẩn dùng chung (Story 12.1)
const todayInput = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
// Xem trước ngày hết hạn; tháng đích ngắn hơn thì lấy ngày cuối tháng (giống backend addMonths)
const endDateText = (start: string, months: number) => {
  const [year, month, day] = start.split('-').map(Number);
  if (!year) return '';
  const lastDay = new Date(year, month - 1 + months + 1, 0).getDate();
  return new Date(year, month - 1 + months, Math.min(day, lastDay)).toLocaleDateString('vi-VN');
};

/**
 * Ghi hợp đồng khi chuyển căn sang Đã cho thuê (Story 11.5). "Bỏ qua" vẫn đổi trạng thái, không lưu hợp đồng
 * — để không làm chậm Quản lý. Tên / SĐT khách thuê chỉ Quản lý xem được.
 */
export const LeaseFormSheet: React.FC<{ onSubmit: (lease?: LeaseInput) => Promise<void>; onClose: () => void; allowSkip?: boolean }> = ({
  onSubmit,
  onClose,
  allowSkip = true,
}) => {
  const [startDate, setStartDate] = useState(todayInput);
  const [durationMonths, setDurationMonths] = useState(6);
  const [closedBy, setClosedBy] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [collaborators, setCollaborators] = useState<{ _id: string; name: string; ctvCode: string }[] | null>(null);
  const [saving, setSaving] = useState<'save' | 'skip' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    userApi.listCollaborators().then(setCollaborators).catch(() => setCollaborators([]));
  }, []);

  const submit = async (mode: 'save' | 'skip') => {
    setSaving(mode);
    setError('');
    try {
      await onSubmit(mode === 'skip' ? undefined : { startDate, durationMonths, closedBy: closedBy || undefined, tenantName: tenantName.trim() || undefined, tenantPhone: tenantPhone.trim() || undefined });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không lưu được, vui lòng thử lại');
      setSaving(null);
    }
  };

  return (
    <BottomSheet
      title="Hợp đồng thuê"
      onClose={onClose}
      showClose
      footer={
        <div className={`grid gap-2 ${allowSkip ? 'grid-cols-[auto_1fr]' : ''}`}>
          {allowSkip && (
            <Button variant="outline" size="lg" disabled={!!saving} loading={saving === 'skip'} onClick={() => submit('skip')}>Bỏ qua</Button>
          )}
          <Button variant="secondary" size="lg" disabled={!!saving || !startDate} loading={saving === 'save'} onClick={() => submit('save')}>Lưu hợp đồng</Button>
        </div>
      }
    >
      <div className="space-y-3 text-sm">
        {error && <p role="alert" className="p-2.5 rounded-xl bg-rose-50 text-rose-700">{error}</p>}
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-600">Ngày bắt đầu</span>
          <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </label>
        <fieldset className="space-y-1.5">
          <legend className="text-xs font-semibold text-slate-600">Thời hạn</legend>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((months) => (
              <ToggleChip key={months} checked={durationMonths === months} onChange={() => setDurationMonths(months)}>{months} tháng</ToggleChip>
            ))}
          </div>
          {startDate && <p className="text-xs text-slate-500">Hết hạn: {endDateText(startDate, durationMonths)}</p>}
        </fieldset>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-600">CTV chốt căn (nhận nhắc tái ký cùng bạn)</span>
          <select value={closedBy} onChange={(e) => setClosedBy(e.target.value)} disabled={!collaborators} className={inputClass}>
            <option value="">{collaborators ? 'Không chọn' : 'Đang tải danh sách CTV…'}</option>
            {collaborators?.map((ctv) => (
              <option key={ctv._id} value={ctv._id}>{ctv.name} · {ctv.ctvCode}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="Tên khách thuê" value={tenantName} onChange={(e) => setTenantName(e.target.value)} className={inputClass} />
          <input type="tel" inputMode="tel" placeholder="SĐT khách thuê" value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)} className={inputClass} />
        </div>
      </div>
    </BottomSheet>
  );
};
