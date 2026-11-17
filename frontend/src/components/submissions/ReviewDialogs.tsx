import React, { useState } from 'react';
import { DuplicateApartment } from '../../api/submissionApi.js';
import { formatVnd } from '../../utils/format.js';
import { BottomSheet as Sheet } from '../layout/BottomSheet.js';

const secondary = 'min-h-[44px] px-4 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100';
const primary = 'flex-1 min-h-[44px] px-4 rounded-xl text-sm font-semibold text-white disabled:opacity-60';

/** Từ chối tin: lý do bắt buộc (≥ 5 ký tự) để CTV biết cần sửa gì. */
export const RejectDialog: React.FC<{ title: string; busy: boolean; onConfirm: (reason: string) => void; onClose: () => void }> = ({
  title,
  busy,
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState('');
  const valid = reason.trim().length >= 5;
  return (
    <Sheet title="Từ chối tin" onClose={onClose}>
      <p className="text-sm text-slate-600 line-clamp-2">{title}</p>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">Lý do (CTV sẽ thấy)</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="VD: Thiếu ảnh thật của căn, giá chưa đúng..."
          className="w-full p-3 text-base sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className={secondary}>Hủy</button>
        <button type="button" disabled={!valid || busy} onClick={() => onConfirm(reason.trim())} className={`${primary} bg-rose-600 hover:bg-rose-700`}>
          {busy ? 'Đang gửi...' : 'Từ chối'}
        </button>
      </div>
    </Sheet>
  );
};

/** Có căn có thể trùng trong kho: mặc định gộp tin làm nguồn phụ, hoặc vẫn tạo căn mới. */
export const DuplicateDialog: React.FC<{
  duplicates: DuplicateApartment[];
  busy: boolean;
  onMerge: (apartmentId: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
}> = ({ duplicates, busy, onMerge, onCreateNew, onClose }) => (
  <Sheet title="Căn này có thể đã có trong kho" onClose={onClose}>
    <ul className="space-y-2">
      {duplicates.map((apt) => (
        <li key={apt._id} className="p-3 rounded-xl bg-amber-50 text-sm">
          <p className="font-semibold text-slate-900">{apt.title}</p>
          <p className="text-slate-600">{formatVnd(apt.price)}/tháng · {apt.address}</p>
          <p className="text-xs text-amber-800 mt-1">{apt.reason}</p>
        </li>
      ))}
    </ul>
    <div className="flex flex-col gap-2">
      <button type="button" disabled={busy} onClick={() => onMerge(duplicates[0]._id)} className={`${primary} bg-indigo-600 hover:bg-indigo-700`}>
        {busy ? 'Đang xử lý...' : 'Gộp làm nguồn phụ'}
      </button>
      <button type="button" disabled={busy} onClick={onCreateNew} className={`${secondary} border border-slate-200`}>
        Vẫn tạo căn mới
      </button>
      <button type="button" onClick={onClose} className={secondary}>Hủy</button>
    </div>
  </Sheet>
);
