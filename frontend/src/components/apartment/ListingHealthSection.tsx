import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Apartment, apartmentApi } from '../../api/apartmentApi.js';
import { ListingReport, reasonLabel, reportApi } from '../../api/reportApi.js';
import { formatVnd } from '../../utils/format.js';
import { Button } from '../ui/Button.js';
import { ReportListingSheet } from './ReportListingSheet.js';

/**
 * Sức khỏe tin trong chi tiết căn (Story 13.6 / 11.4b):
 * - Mọi vai trò: nhãn "Chờ xác minh" + nút Báo lỗi (căn Trống / Sắp trống)
 * - Quản lý / Admin: danh sách báo lỗi đang mở; Quản lý của căn / Admin bấm "Tin vẫn đúng" để gỡ cờ
 */
export const ListingHealthSection: React.FC<{ apartment: Apartment; isManager: boolean; canResolve: boolean; onChanged: () => void }> = ({
  apartment,
  isManager,
  canResolve,
  onChanged,
}) => {
  const [reports, setReports] = useState<ListingReport[]>([]);
  const [reporting, setReporting] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verification, setVerification] = useState(apartment.verification);
  useEffect(() => setVerification(apartment.verification), [apartment.verification]);
  const canReport = apartment.status === 'AVAILABLE' || apartment.status === 'UPCOMING';

  useEffect(() => {
    if (isManager) reportApi.listForApartment(apartment._id).then(setReports).catch(() => setReports([]));
  }, [apartment._id, isManager, sent]);

  const dismiss = async () => {
    setBusy(true);
    try {
      await reportApi.resolve(apartment._id, { action: 'DISMISS' });
      setReports([]);
      setVerification(undefined);
      onChanged();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không xử lý được, vui lòng thử lại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {verification && (
        <p className="flex gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
          <span>
            <strong>Chờ xác minh</strong>
            {verification.reasons.length > 0 && `: ${verification.reasons.join(', ')}`}
          </span>
        </p>
      )}

      {isManager && reports.length > 0 && (
        <div className="p-3 rounded-xl border border-slate-200 space-y-2">
          <p className="text-sm font-semibold text-slate-900">Báo lỗi đang mở ({reports.length})</p>
          <ul className="space-y-1.5 text-sm">
            {reports.map((report) => (
              <li key={report._id} className="text-slate-700">
                <span className="font-medium">{reasonLabel(report.reason)}</span>
                {report.newPrice ? ` · giá mới ${formatVnd(report.newPrice)}` : ''}
                {report.note ? ` · "${report.note}"` : ''}
                <span className="block text-xs text-slate-600">
                  {report.reporterId?.name ?? 'Không rõ'} ({report.reporterId?.ctvCode}) · {new Date(report.createdAt).toLocaleString('vi-VN')}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            {canResolve && (
              <Button size="sm" variant="outline" icon={CheckCircle2} loading={busy} onClick={dismiss}>Tin vẫn đúng</Button>
            )}
            <Link to="/moderation" className="inline-flex items-center h-11 sm:h-9 px-3 text-sm font-semibold text-indigo-700 hover:underline">Mở Kiểm duyệt</Link>
          </div>
        </div>
      )}

      {canReport && (
        <button
          type="button"
          onClick={() => setReporting(true)}
          className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-medium text-slate-700 hover:text-amber-900 cursor-pointer"
        >
          <AlertTriangle className="w-4 h-4" aria-hidden />
          {sent ? 'Cảm ơn, Quản lý sẽ kiểm tra · Sửa lý do' : 'Báo lỗi tin'}
        </button>
      )}
      {reporting && (
        <ReportListingSheet
          apartmentId={apartment._id}
          onSent={() => {
            setReporting(false);
            setSent(true);
            // Lấy lại cờ "Chờ xác minh" (có thể vừa đủ 2 người báo) rồi cập nhật thẻ ngoài danh sách
            apartmentApi.getApartmentById(apartment._id).then((res) => setVerification(res.data.verification)).catch(() => undefined);
            onChanged();
          }}
          onClose={() => setReporting(false)}
        />
      )}
    </div>
  );
};
