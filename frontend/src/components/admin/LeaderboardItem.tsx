import React from 'react';
import { Medal, Trophy } from 'lucide-react';
import { BrokerPerformance } from '../../api/adminApi.js';

// Huy hiệu Top 1–3: icon + chữ (không dùng emoji, không chỉ dựa vào màu)
const RANK_STYLE = {
  1: { icon: Trophy, className: 'bg-amber-50 text-amber-900 border-amber-300' },
  2: { icon: Medal, className: 'bg-slate-100 text-slate-800 border-slate-300' },
  3: { icon: Medal, className: 'bg-orange-50 text-orange-900 border-orange-200' },
} as const;

const Metric: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-base font-bold text-slate-900 tabular-nums">{value}</p>
    <p className="text-xs text-slate-600">{label}</p>
  </div>
);

/** 1 CTV trên bảng xếp hạng (Story 13.4): hạng, tên, chỉ số đóng góp; tab Không hoạt động hiện lần hoạt động cuối. */
export const LeaderboardItem: React.FC<{ row: BrokerPerformance; position: number; showLastActivity: boolean }> = ({ row, position, showLastActivity }) => {
  const rank = row.rank ? RANK_STYLE[row.rank] : null;
  return (
    <li className={`p-3 rounded-2xl bg-white border space-y-3 ${rank ? 'border-amber-200' : 'border-slate-200'}`}>
      <div className="flex items-start gap-3">
        {rank ? (
          <span className={`shrink-0 inline-flex items-center gap-1 h-7 px-2 rounded-full border text-xs font-bold ${rank.className}`}>
            <rank.icon className="w-3.5 h-3.5" aria-hidden />
            Top {row.rank}
          </span>
        ) : (
          <span className="shrink-0 w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center" aria-label={`Hạng ${position}`}>
            {position}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 truncate">{row.name}</p>
          <p className="text-sm text-slate-600 truncate">
            {row.ctvCode} · {row.phone}
          </p>
        </div>
      </div>
      {showLastActivity ? (
        <p className="text-sm text-slate-700">
          {row.lastActivityAt ? `Hoạt động cuối: ${new Date(row.lastActivityAt).toLocaleDateString('vi-VN')}` : 'Chưa đăng tin hay tạo link nào'}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Tin duyệt / đăng" value={`${row.approved}/${row.submitted}`} />
          <Metric label="Căn chốt" value={row.deals} />
          <Metric label="Link tạo" value={row.links} />
          <Metric label="Lượt khách xem" value={row.views} />
          <Metric label="Khách mới" value={row.leadsCreated} />
          <Metric label="Khách đang chăm" value={row.leadsOpen} />
        </div>
      )}
    </li>
  );
};
