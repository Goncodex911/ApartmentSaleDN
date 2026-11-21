import React, { useState } from 'react';
import { ScrollText, WifiOff } from 'lucide-react';
import { AuditLogEntry, adminApi } from '../../api/adminApi.js';
import { usePagedList } from '../../hooks/usePagedList.js';
import { Badge } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';
import { EmptyState } from '../ui/EmptyState.js';
import { Skeleton } from '../ui/Skeleton.js';
import { AdminFilterTabs } from './AdminListControls.js';
import { AuditDetailSheet } from './AuditDetailSheet.js';
import { actionMeta, detailText } from './AuditLogItem.js';

const TABS = [
  { id: '', label: 'Tất cả' },
  { id: 'AUTH', label: 'Đăng nhập' },
  { id: 'INVENTORY', label: 'Kho căn' },
  { id: 'SUBMISSION', label: 'Tin đăng' },
  { id: 'ACCOUNT', label: 'Tài khoản' },
];

// "Hôm nay" / "Hôm qua" / "20/11/2026" theo giờ máy
const dayLabel = (iso: string) => {
  const date = new Date(iso);
  const today = new Date();
  const diffDays = Math.round((new Date(today.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86_400_000);
  return diffDays === 0 ? 'Hôm nay' : diffDays === 1 ? 'Hôm qua' : date.toLocaleDateString('vi-VN');
};
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

/** Story 16.3: dòng thời gian hoạt động của 1 thành viên — mới nhất trước, nhóm theo ngày, 30 mục / lần tải. */
export const UserTimeline: React.FC<{ userId: string }> = ({ userId }) => {
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const { items, state, loadingMore, hasMore, loadMore, reload } = usePagedList(`${userId}|${category}`, '', (page) =>
    adminApi.listAuditLogs({ userId, category: category || undefined, page })
  );

  const renderBody = () => {
    if (state === 'loading') return <div className="space-y-2" aria-busy="true" aria-label="Đang tải hoạt động">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>;
    if (state === 'error') return <EmptyState icon={WifiOff} title="Không tải được hoạt động" action={<Button onClick={reload}>Thử lại</Button>} />;
    if (!items.length) return <EmptyState icon={ScrollText} title="Chưa có hoạt động nào được ghi nhận" />;

    const groups = new Map<string, AuditLogEntry[]>();
    for (const log of items) groups.set(dayLabel(log.createdAt), [...(groups.get(dayLabel(log.createdAt)) ?? []), log]);
    return (
      <div className="space-y-4">
        {[...groups].map(([day, logs]) => (
          <section key={day} aria-label={day}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5">{day}</h3>
            <ol className="space-y-1">
              {logs.map((log) => {
                const meta = actionMeta(log.action);
                const detail = detailText(log);
                return (
                  <li key={log._id}>
                    <button type="button" onClick={() => setSelected(log)} className="w-full flex items-start gap-3 min-h-[44px] p-2 rounded-xl text-left hover:bg-slate-50 active:bg-slate-100 transition-colors duration-100">
                      <time dateTime={log.createdAt} className="w-12 shrink-0 pt-0.5 text-xs text-slate-600 tabular-nums">{timeOf(log.createdAt)}</time>
                      <span className="flex-1 min-w-0 space-y-0.5">
                        <Badge tone={meta.tone} icon={meta.icon}>{meta.label}</Badge>
                        <span className="block text-sm text-slate-900 truncate">{log.targetTitle || '—'}</span>
                        {detail && <span className="block text-xs text-slate-600 truncate">{detail}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <AdminFilterTabs tabs={TABS} value={category} onChange={setCategory} label="Lọc nhóm hoạt động" />
      {renderBody()}
      {state === 'ready' && hasMore && <Button variant="outline" loading={loadingMore} onClick={loadMore} className="w-full">Tải thêm</Button>}
      {selected && <AuditDetailSheet log={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};
