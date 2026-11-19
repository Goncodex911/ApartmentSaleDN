import React, { useEffect, useState } from 'react';
import { Apartment, LeaseInput, apartmentApi } from '../../api/apartmentApi.js';
import { userApi } from '../../api/userApi.js';
import { LeaseFormSheet } from './LeaseFormSheet.js';
import { ToggleChip } from './formFields.js';
import { Phone } from 'lucide-react';

const DAY_MS = 24 * 60 * 60 * 1000;
const dateText = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');
/** Số ngày còn lại tới ngày hết hạn (âm = đã quá hạn) — dùng cả cho nhãn trên thẻ căn. */
export const leaseDaysLeft = (endDate: string) => Math.ceil((new Date(endDate).getTime() - Date.now()) / DAY_MS);

/**
 * Mục Hợp đồng trong chi tiết căn Đã cho thuê (Story 11.5, chỉ Quản lý): ngày bắt đầu / hết hạn, khách thuê,
 * Gia hạn thêm tháng, hoặc "Khách không gia hạn → Sắp trống" để căn hiện lại trên bảng hàng cho CTV chào khách mới.
 */
export const LeaseSection: React.FC<{ apartment: Apartment; onChanged: () => void }> = ({ apartment, onChanged }) => {
  const { lease } = apartment;
  const [panel, setPanel] = useState<'renew' | 'vacate' | 'form' | null>(null);
  const [vacateDate, setVacateDate] = useState(lease ? lease.endDate.slice(0, 10) : '');
  const [closerName, setCloserName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!lease?.closedBy) return;
    userApi
      .listCollaborators()
      .then((list) => setCloserName(list.find((ctv) => ctv._id === lease.closedBy)?.name || ''))
      .catch(() => undefined);
  }, [lease?.closedBy]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      setPanel(null);
      onChanged();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không lưu được, vui lòng thử lại');
    } finally {
      setBusy(false);
    }
  };
  const saveLease = (input?: LeaseInput) => apartmentApi.updateStatus(apartment._id, { status: 'RENTED', lease: input }).then(() => onChanged());

  const daysLeft = lease ? leaseDaysLeft(lease.endDate) : 0;
  const button = 'h-11 px-3 rounded-xl border text-sm font-semibold disabled:opacity-50';

  return (
    <section className="p-3 rounded-xl border border-slate-200 space-y-2 text-sm">
      <p className="text-xs font-bold uppercase text-slate-600">Hợp đồng thuê</p>
      {!lease ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-slate-600">Chưa có hợp đồng — không được nhắc tái ký.</p>
          <button type="button" onClick={() => setPanel('form')} className={`${button} shrink-0 border-indigo-200 bg-indigo-50 text-indigo-700`}>Nhập hợp đồng</button>
        </div>
      ) : (
        <>
          <p className="text-slate-800">
            {dateText(lease.startDate)} → <b>{dateText(lease.endDate)}</b> ({lease.durationMonths} tháng)
          </p>
          <p className={daysLeft <= 0 ? 'font-semibold text-rose-700' : daysLeft <= 30 ? 'font-semibold text-amber-700' : 'text-slate-600'}>
            {daysLeft > 0 ? `Còn ${daysLeft} ngày` : `Đã hết hạn ${-daysLeft} ngày`}
          </p>
          {closerName && <p className="text-slate-600">CTV chốt: {closerName}</p>}
          {(lease.tenantName || lease.tenantPhone) && (
            <p className="flex items-center gap-1.5 text-slate-600">
              Khách: {lease.tenantName}
              {lease.tenantPhone && (
                <a href={`tel:${lease.tenantPhone}`} className="inline-flex items-center gap-1 text-indigo-700 font-semibold">
                  <Phone className="w-3.5 h-3.5" aria-hidden /> {lease.tenantPhone}
                </a>
              )}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button type="button" aria-expanded={panel === 'renew'} onClick={() => setPanel(panel === 'renew' ? null : 'renew')} className={`${button} border-slate-200 text-slate-800`}>Gia hạn</button>
            <button type="button" aria-expanded={panel === 'vacate'} onClick={() => setPanel(panel === 'vacate' ? null : 'vacate')} className={`${button} border-sky-200 bg-sky-50 text-sky-800`}>Khách không gia hạn</button>
          </div>
          {panel === 'renew' && (
            <div className="flex flex-wrap gap-2">
              {[1, 3, 6, 12].map((months) => (
                <ToggleChip key={months} checked={false} onChange={() => !busy && run(() => apartmentApi.renewLease(apartment._id, months))}>+{months} tháng</ToggleChip>
              ))}
            </div>
          )}
          {panel === 'vacate' && (
            <div className="flex gap-2">
              <label className="flex-1">
                <span className="sr-only">Ngày dự kiến trống</span>
                <input type="date" value={vacateDate} onChange={(e) => setVacateDate(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-base sm:text-sm" />
              </label>
              <button
                type="button"
                disabled={!vacateDate || busy}
                onClick={() => run(() => apartmentApi.updateStatus(apartment._id, { status: 'UPCOMING', availableDate: new Date(vacateDate).toISOString() }))}
                className={`${button} border-sky-600 bg-sky-600 text-white`}
              >
                Chuyển Sắp trống
              </button>
            </div>
          )}
        </>
      )}
      {panel === 'form' && <LeaseFormSheet allowSkip={false} onSubmit={saveLease} onClose={() => setPanel(null)} />}
    </section>
  );
};
