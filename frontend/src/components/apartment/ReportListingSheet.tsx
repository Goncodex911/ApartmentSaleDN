import React, { useState } from 'react';
import { BottomSheet } from '../layout/BottomSheet.js';
import { Button } from '../ui/Button.js';
import { fieldClass } from '../ui/Input.js';
import { REPORT_REASONS, ReportReason, reportApi } from '../../api/reportApi.js';

/**
 * Bảng chọn lý do báo lỗi tin (Story 13.6 / 11.4b): 4 lý do (nút cao 48px), "Chủ tăng giá" có ô giá mới, ghi chú ≤ 200 ký tự.
 * Gửi lại là cập nhật lý do của chính mình (máy chủ giữ 1 báo lỗi đang mở / người / căn).
 */
export const ReportListingSheet: React.FC<{ apartmentId: string; onSent: () => void; onClose: () => void }> = ({ apartmentId, onSent, onClose }) => {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    if (!reason) return;
    setSending(true);
    setError('');
    try {
      const price = reason === 'PRICE_CHANGED' && Number(newPrice) > 0 ? Number(newPrice) : undefined;
      await reportApi.report(apartmentId, { reason, note: note.trim() || undefined, newPrice: price });
      onSent();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không gửi được, vui lòng thử lại');
      setSending(false);
    }
  };

  return (
    <BottomSheet
      title="Báo lỗi tin"
      onClose={onClose}
      showClose
      footer={<Button className="w-full" size="lg" disabled={!reason} loading={sending} onClick={send}>Gửi báo lỗi</Button>}
    >
      <div className="px-4 pb-4 space-y-3">
        <p className="text-sm text-slate-600">Quản lý sẽ gọi lại chủ nhà để kiểm tra. Cần 2 người khác nhau cùng báo thì căn mới hiện nhãn "Chờ xác minh".</p>
        {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 text-sm text-rose-700">{error}</p>}
        <div role="radiogroup" aria-label="Lý do báo lỗi" className="grid gap-2">
          {REPORT_REASONS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={reason === item.id}
              onClick={() => setReason(item.id)}
              className={`min-h-[48px] px-4 rounded-xl border text-left text-sm font-medium cursor-pointer transition-colors ${
                reason === item.id ? 'border-brand-accent bg-indigo-50 text-slate-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {reason === 'PRICE_CHANGED' && (
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Giá mới chủ báo (đ/tháng, nếu biết)</span>
            <input type="number" inputMode="numeric" min={0} value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="9000000" className={fieldClass} />
          </label>
        )}
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Ghi chú (tùy chọn)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} rows={2} placeholder="VD: Gọi chủ lúc 10h, chủ nói đã cho thuê từ tuần trước" className={`${fieldClass} h-auto py-2`} />
          <span className="block text-right text-xs text-slate-600">{note.length}/200</span>
        </label>
      </div>
    </BottomSheet>
  );
};
