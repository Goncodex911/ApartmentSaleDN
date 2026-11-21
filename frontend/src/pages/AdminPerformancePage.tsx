import React, { useCallback, useEffect, useState } from 'react';
import { Download, Trophy, WifiOff } from 'lucide-react';
import { BrokerPerformance, PerformanceRange, adminApi } from '../api/adminApi.js';
import { AdminFilterTabs } from '../components/admin/AdminListControls.js';
import { LeaderboardItem } from '../components/admin/LeaderboardItem.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Button } from '../components/ui/Button.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { downloadCsv } from '../utils/csv.js';

const TABS = [
  { id: 'this_month', label: 'Tháng này' },
  { id: 'last_month', label: 'Tháng trước' },
  { id: 'all', label: 'Toàn thời gian' },
  { id: 'inactive', label: 'Không hoạt động' },
];

/** [ADMIN] Bảng xếp hạng & hiệu suất CTV (Story 13.4): lọc theo tháng, tab CTV không hoạt động 30 ngày, xuất CSV. */
export const AdminPerformancePage: React.FC = () => {
  const [tab, setTab] = useState('this_month');
  const [rows, setRows] = useState<BrokerPerformance[] | null>(null);
  const [error, setError] = useState(false);
  const inactiveTab = tab === 'inactive';
  const range: PerformanceRange = inactiveTab ? 'all' : (tab as PerformanceRange);

  const load = useCallback(() => {
    let active = true;
    setRows(null);
    setError(false);
    adminApi
      .getBrokerPerformance(range)
      .then((data) => active && setRows(data))
      .catch(() => active && setError(true));
    return () => {
      active = false; // Đổi tab nhanh → bỏ kết quả của tab cũ
    };
  }, [range]);
  useEffect(load, [load]);

  const visible = (inactiveTab ? rows?.filter((row) => row.inactive) : rows) ?? [];
  const exportCsv = () => {
    const label = TABS.find((item) => item.id === tab)?.label ?? tab;
    downloadCsv(
      `hieu-suat-ctv-${tab}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Mã CTV', 'Họ tên', 'Số điện thoại', 'Số tin duyệt', 'Số tin đăng', 'Số căn chốt', 'Số lượt share link', 'Tổng lượt xem khách', 'Số lead tạo', 'Lead đang chăm', 'Kỳ'],
      visible.map((row) => [row.ctvCode, row.name, row.phone, row.approved, row.submitted, row.deals, row.links, row.views, row.leadsCreated, row.leadsOpen, label])
    );
  };

  const renderList = () => {
    if (error) return <EmptyState icon={WifiOff} title="Không tải được bảng xếp hạng" description="Vui lòng kiểm tra mạng rồi thử lại." action={<Button onClick={load}>Thử lại</Button>} />;
    if (!rows) {
      return (
        <div className="space-y-2" aria-busy="true" aria-label="Đang tải bảng xếp hạng">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      );
    }
    if (!visible.length) {
      return <EmptyState icon={Trophy} title={inactiveTab ? 'Mọi CTV đều đang hoạt động' : 'Chưa có CTV nào'} description={inactiveTab ? 'Không ai im lặng quá 30 ngày.' : 'CTV đăng ký sẽ hiện ở đây.'} />;
    }
    return (
      <ol className="space-y-2">
        {visible.map((row, index) => <LeaderboardItem key={row._id} row={row} position={index + 1} showLastActivity={inactiveTab} />)}
      </ol>
    );
  };

  return (
    <main className="max-w-3xl mx-auto px-4 pt-4 pb-app space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-900">Hiệu suất CTV</h1>
        <Button variant="outline" size="sm" icon={Download} onClick={exportCsv} disabled={!visible.length}>Xuất CSV</Button>
      </div>
      <p className="text-sm text-slate-600">
        {inactiveTab
          ? 'CTV không đăng tin, không tạo link xem phòng trong 30 ngày qua.'
          : 'Xếp theo tin được duyệt, rồi căn chốt, link tạo. Lượt xem cộng dồn từ lúc tạo link; "Khách đang chăm" là số hiện tại.'}
      </p>
      <AdminFilterTabs tabs={TABS} value={tab} onChange={setTab} label="Khoảng thời gian" />
      {renderList()}
    </main>
  );
};
