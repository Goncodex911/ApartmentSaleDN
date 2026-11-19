import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ModerationItem, ResolveAction, reasonLabel } from '../../api/reportApi.js';
import { STATUS_STYLE } from '../../utils/statusStyle.js';
import { formatVnd } from '../../utils/format.js';
import { thumbSizeUrl } from '../../utils/cloudinaryImage.js';
import { Badge } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';
import { fieldClass } from '../ui/Input.js';

/**
 * 1 căn trong hàng đợi kiểm duyệt (Story 13.6): ảnh nhỏ, giá, số người báo theo lý do, chi tiết từng người báo,
 * xử lý 1 chạm: Đã thuê · Cập nhật giá · Tin vẫn đúng (tùy chọn đánh dấu báo sai → trừ điểm người báo).
 */
export const ModerationCard: React.FC<{ item: ModerationItem; onResolve: (action: ResolveAction) => Promise<void> }> = ({ item, onResolve }) => {
  const suggestedPrice = Math.max(0, ...item.reports.map((report) => report.newPrice ?? 0));
  const [mode, setMode] = useState<'idle' | 'price' | 'dismiss'>('idle');
  const [price, setPrice] = useState(suggestedPrice ? String(suggestedPrice) : '');
  const [wrongReport, setWrongReport] = useState(false);
  const [busy, setBusy] = useState(false);
  const reasonCounts = [...new Set(item.reports.map((report) => report.reason))].map((reason) => ({ reason, n: item.reports.filter((r) => r.reason === reason).length }));

  const run = async (action: ResolveAction) => {
    setBusy(true);
    try {
      await onResolve(action);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="p-3 rounded-2xl bg-white border border-slate-200 space-y-3">
      <div className="flex gap-3">
        {item.image ? (
          <img src={thumbSizeUrl(item.image)} alt="" loading="lazy" className="w-20 h-20 rounded-xl object-cover bg-slate-100 shrink-0" />
        ) : (
          <span className="w-20 h-20 rounded-xl bg-slate-100 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 space-y-1">
          <p className="font-semibold text-slate-900 line-clamp-2">{item.title}</p>
          <p className="text-sm text-slate-700">
            {formatVnd(item.price)}/tháng · <span className="text-slate-600">{STATUS_STYLE[item.status].label}</span>
          </p>
          <Badge tone="gold" icon={AlertTriangle}>{item.reports.length} người cùng báo</Badge>
        </div>
      </div>

      <p className="flex flex-wrap gap-1.5">
        {reasonCounts.map(({ reason, n }) => (
          <span key={reason} className="px-2 py-1 rounded-lg bg-slate-100 text-xs font-medium text-slate-800">{reasonLabel(reason)} · {n}</span>
        ))}
      </p>

      <ul className="space-y-1.5 text-sm">
        {item.reports.map((report) => (
          <li key={report._id} className="text-slate-700">
            <span className="font-medium">{report.reporterId?.name ?? 'Không rõ'}</span>
            <span className="text-slate-600"> · tín nhiệm {report.reporterId?.trustScore ?? 0} · {new Date(report.createdAt).toLocaleString('vi-VN')}</span>
            <span className="block">
              {reasonLabel(report.reason)}
              {report.newPrice ? ` · giá mới ${formatVnd(report.newPrice)}` : ''}
              {report.note ? ` · "${report.note}"` : ''}
            </span>
          </li>
        ))}
      </ul>

      {!item.canResolve ? (
        <p className="text-sm text-slate-600">Căn của Quản lý khác — chỉ Quản lý của căn hoặc Admin được xử lý.</p>
      ) : mode === 'price' ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (Number(price) > 0) run({ action: 'UPDATE_PRICE', price: Number(price) });
          }}
        >
          <label className="flex-1">
            <span className="sr-only">Giá mới</span>
            <input type="number" inputMode="numeric" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Giá mới (đ/tháng)" autoFocus className={fieldClass} />
          </label>
          <Button type="submit" loading={busy} disabled={!(Number(price) > 0)}>Lưu giá</Button>
          <Button variant="ghost" onClick={() => setMode('idle')}>Hủy</Button>
        </form>
      ) : mode === 'dismiss' ? (
        <div className="space-y-2">
          <label className="flex items-center gap-2 min-h-[44px] text-sm text-slate-800 cursor-pointer">
            <input type="checkbox" checked={wrongReport} onChange={(e) => setWrongReport(e.target.checked)} className="w-5 h-5 accent-rose-600" />
            Đánh dấu báo sai (trừ 5 điểm tín nhiệm mỗi người báo)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setMode('idle')}>Hủy</Button>
            <Button variant={wrongReport ? 'danger' : 'primary'} loading={busy} onClick={() => run({ action: 'DISMISS', wrongReport })}>Xác nhận</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {/* 3 nút trên 1 hàng ở 390px: chữ ngắn, không icon để không xuống dòng */}
          <Button size="sm" variant="secondary" loading={busy} onClick={() => run({ action: 'MARK_RENTED' })} className="px-2 whitespace-nowrap">Đã thuê</Button>
          <Button size="sm" variant="outline" onClick={() => setMode('price')} className="px-2 whitespace-nowrap">Sửa giá</Button>
          <Button size="sm" variant="outline" onClick={() => setMode('dismiss')} className="px-2 whitespace-nowrap">Tin đúng</Button>
        </div>
      )}
    </li>
  );
};
