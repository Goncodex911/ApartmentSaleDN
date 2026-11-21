import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, ScrollText, WifiOff } from 'lucide-react';
import { AuditLogEntry, AuditQuery, adminApi } from '../api/adminApi.js';
import { usePagedList } from '../hooks/usePagedList.js';
import { AuditLogItem, actionMeta, detailText, formatDateTime, roleText } from '../components/admin/AuditLogItem.js';
import { deviceOf } from '../utils/device.js';
import { AuditDetailSheet } from '../components/admin/AuditDetailSheet.js';
import { AuditFilterValues, AuditFilters, rangeToDates } from '../components/admin/AuditFilters.js';
import { CATEGORY_TABS } from '../components/admin/auditMeta.js';
import { AdminFilterTabs, AdminSearch } from '../components/admin/AdminListControls.js';
import { Badge } from '../components/ui/Badge.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Button } from '../components/ui/Button.js';
import { Skeleton } from '../components/ui/Skeleton.js';

const FILTER_KEYS = ['category', 'severity', 'userId', 'range', 'from', 'to'] as const;

/**
 * [ADMIN] Nhật ký hoạt động (Story 13.3 → 16.2): mọi thao tác ghi dữ liệu + đăng nhập. Bộ lọc nằm trên URL
 * (F5 / chia sẻ link giữ nguyên). Máy tính: bảng; điện thoại: thẻ. Bấm 1 mục → chi tiết trước / sau.
 */
export const AdminAuditLogsPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const filters: AuditFilterValues & { category: string } = {
    category: params.get('category') ?? '',
    severity: (params.get('severity') ?? '') as AuditFilterValues['severity'],
    userId: params.get('userId') ?? '',
    range: (params.get('range') ?? '') as AuditFilterValues['range'],
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
  };
  const update = (patch: Partial<Record<string, string>>) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(patch)) value ? next.set(key, value) : next.delete(key);
        return next;
      },
      { replace: true }
    );

  const query = (text: string): AuditQuery => ({
    category: filters.category || undefined,
    severity: filters.severity || undefined,
    userId: filters.userId || undefined,
    search: text || undefined,
    ...rangeToDates(filters),
  });
  const filterKey = FILTER_KEYS.map((key) => filters[key]).join('|');
  const { items, total, state, loadingMore, hasMore, loadMore, reload } = usePagedList(filterKey, search, (page, text) => adminApi.listAuditLogs({ ...query(text), page }));

  const exportCsv = async () => {
    setExporting(true);
    setExportError('');
    try {
      await adminApi.exportAuditLogs(query(search.trim()));
    } catch {
      setExportError('Không xuất được file, vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  };

  const renderList = () => {
    if (state === 'loading') {
      return (
        <div className="space-y-2" aria-busy="true" aria-label="Đang tải nhật ký">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      );
    }
    if (state === 'error') {
      return <EmptyState icon={WifiOff} title="Không tải được nhật ký" description="Vui lòng kiểm tra mạng rồi thử lại." action={<Button onClick={reload}>Thử lại</Button>} />;
    }
    if (items.length === 0) {
      return <EmptyState icon={ScrollText} title="Không có hoạt động phù hợp" description="Thử đổi khoảng thời gian, nhóm hoặc người thực hiện." />;
    }
    return (
      <>
        <ul className="space-y-2 lg:hidden">{items.map((log) => <AuditLogItem key={log._id} log={log} onOpen={setSelected} />)}</ul>
        <div className="hidden lg:block overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                {['Thời gian', 'Người thực hiện', 'Hành động', 'Đối tượng', 'IP · Thiết bị'].map((head) => (
                  <th key={head} scope="col" className="px-3 py-2.5 font-semibold">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((log) => {
                const meta = actionMeta(log.action);
                return (
                  <tr key={log._id} onClick={() => setSelected(log)} className="border-t border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors duration-100">
                    <td className="px-3 py-2.5 tabular-nums whitespace-nowrap text-slate-700">{formatDateTime(log.createdAt)}</td>
                    <td className="px-3 py-2.5">
                      <span className="font-medium text-slate-900">{log.userName || 'Không rõ'}</span>
                      <span className="block text-xs text-slate-600">{roleText(log.userRole)}</span>
                    </td>
                    <td className="px-3 py-2.5"><Badge tone={meta.tone} icon={meta.icon}>{meta.label}</Badge></td>
                    <td className="px-3 py-2.5 max-w-xs">
                      {/* Nút trong ô: bàn phím Tab tới được, Enter mở chi tiết */}
                      <button type="button" onClick={() => setSelected(log)} className="block w-full text-left font-medium text-slate-900 truncate hover:text-indigo-700">
                        {log.targetTitle || '—'}
                      </button>
                      <span className="block text-xs text-slate-600 truncate">{detailText(log)}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{log.ipAddress || '—'}<span className="block">{deviceOf(log.userAgent)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <main className="max-w-6xl mx-auto px-4 pt-4 pb-app space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Nhật ký hoạt động</h1>
          {state === 'ready' && <p className="text-sm text-slate-600">{total.toLocaleString('vi-VN')} mục</p>}
        </div>
        <Button variant="outline" icon={Download} onClick={exportCsv} loading={exporting} disabled={state !== 'ready' || !total}>
          Xuất CSV
        </Button>
      </div>
      {exportError && <p role="alert" className="text-sm text-rose-700">{exportError}</p>}
      <p className="text-sm text-slate-600">Thao tác thông thường lưu 60 ngày; quan trọng và bảo mật lưu 180 ngày. Không ghi mật khẩu, nội dung chat hay ghi chú khách.</p>
      <AdminSearch
        value={search}
        onChange={(value) => {
          setSearch(value);
          update({ search: value.trim() });
        }}
        placeholder="Tên người thực hiện hoặc tên căn"
      />
      <AdminFilterTabs tabs={CATEGORY_TABS} value={filters.category} onChange={(category) => update({ category })} label="Lọc nhóm hoạt động" />
      <AuditFilters values={filters} onChange={update} />
      {renderList()}
      {state === 'ready' && hasMore && (
        <Button variant="outline" loading={loadingMore} onClick={loadMore} className="w-full">Tải thêm</Button>
      )}
      {selected && <AuditDetailSheet log={selected} onClose={() => setSelected(null)} />}
    </main>
  );
};
