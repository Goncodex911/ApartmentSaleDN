import React from 'react';
import { Card } from '../ui/Card.js';

/** Nhóm thẻ có tiêu đề + ghi chú nhỏ (Story 13.1). */
export const DashboardSection: React.FC<{ title: string; note?: string; children: React.ReactNode }> = ({ title, note, children }) => (
  <Card className="space-y-3">
    <div>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {note && <p className="text-xs text-slate-600">{note}</p>}
    </div>
    {children}
  </Card>
);

/** Ô số liệu: số lớn + nhãn; `dot` là chấm màu đi kèm chữ (không dùng màu thay chữ). */
export const StatTile: React.FC<{ label: string; value: number; dot?: string; alert?: boolean }> = ({ label, value, dot, alert }) => (
  <div className={`p-3 rounded-xl ${alert ? 'bg-rose-50 border border-rose-200' : 'bg-slate-50'}`}>
    <p className="text-2xl font-bold text-slate-900 tabular-nums">{value.toLocaleString('vi-VN')}</p>
    <p className="flex items-center gap-1.5 text-sm text-slate-700">
      {dot && <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} aria-hidden />}
      {label}
      {alert && <span className="w-2 h-2 rounded-full bg-rose-600 motion-safe:animate-pulse" aria-label="Cần xử lý" />}
    </p>
  </div>
);

/**
 * Thanh tỷ lệ ngang thuần CSS: 1 dãy số liệu → 1 màu, nhãn + số + % ghi trực tiếp (không cần chú thích màu).
 * Thanh mảnh 8px, bo đầu, nền ray nhạt để so độ dài với 100%.
 */
export const BarList: React.FC<{ rows: { label: string; count: number }[]; total: number; label: string }> = ({ rows, total, label }) => (
  <ul className="space-y-2.5" aria-label={label}>
    {rows.map((row) => {
      const percent = total ? Math.round((row.count / total) * 100) : 0;
      return (
        <li key={row.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-slate-800">{row.label}</span>
            <span className="text-slate-600 tabular-nums">
              {row.count} · {percent}%
            </span>
          </div>
          <div className="h-2 rounded bg-slate-100 overflow-hidden" aria-hidden>
            <div className="h-full rounded bg-brand-accent" style={{ width: `${percent}%` }} />
          </div>
        </li>
      );
    })}
  </ul>
);
