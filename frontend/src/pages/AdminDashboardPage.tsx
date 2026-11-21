import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ShieldAlert, WifiOff } from 'lucide-react';
import { DashboardStats, adminApi } from '../api/adminApi.js';
import { BarList, DashboardSection, StatTile } from '../components/admin/DashboardParts.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Button } from '../components/ui/Button.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { STATUS_ORDER, STATUS_STYLE } from '../utils/statusStyle.js';
import { ZONES } from '../utils/danang.js';
import { PRICE_RANGES } from '../components/apartment/FilterSheet.js';


/** [ADMIN] Trung tâm điều hành (Story 13.1): kho căn, thành viên, cào tin 24h, tương tác khách, phân bố khu vực & giá. */
export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    setStats(null);
    adminApi.getDashboardStats().then(setStats).catch(() => setError(true));
  }, []);
  useEffect(load, [load]);

  const renderStats = () => {
    if (error) return <EmptyState icon={WifiOff} title="Không tải được số liệu" description="Vui lòng kiểm tra mạng rồi thử lại." action={<Button onClick={load}>Thử lại</Button>} />;
    if (!stats) {
      return (
        <div className="space-y-3" aria-busy="true" aria-label="Đang tải số liệu">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      );
    }
    const { apartments, members, ingestion24h, market, openAlerts = 0 } = stats;
    const onMarket = apartments.total - (apartments.byStatus.RENTED ?? 0);
    const zoneRows = [...ZONES, 'UNKNOWN']
      .map((zone) => ({ label: zone === 'UNKNOWN' ? 'Chưa rõ khu vực' : zone, count: apartments.byZone[zone] ?? 0 }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count);
    const priceRows = PRICE_RANGES.map((range) => ({ label: range.label, count: apartments.byPrice[range.id] ?? 0 }));

    return (
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Story 16.5: cảnh báo chưa xử lý nằm đầu trang */}
        <Link to="/admin/alerts" className={`lg:col-span-2 flex items-center gap-3 p-4 rounded-2xl border transition-colors ${openAlerts ? 'bg-rose-50 border-rose-200 hover:border-rose-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
          <ShieldAlert className={`w-6 h-6 shrink-0 ${openAlerts ? 'text-rose-700' : 'text-emerald-700'}`} aria-hidden />
          <span className="flex-1 text-sm font-semibold text-slate-900">{openAlerts ? `${openAlerts} cảnh báo bảo mật chưa xử lý` : 'Không có cảnh báo bảo mật nào'}</span>
          <ChevronRight className="w-5 h-5 text-slate-500" aria-hidden />
        </Link>
        <DashboardSection title={`Kho căn hộ · ${apartments.total} căn`}>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_ORDER.map((status) => (
              <StatTile key={status} label={STATUS_STYLE[status].label} value={apartments.byStatus[status] ?? 0} dot={STATUS_STYLE[status].dot} />
            ))}
          </div>
          {apartments.needsReview > 0 && <p className="text-sm text-amber-900">{apartments.needsReview} căn AI nhập đang chờ Quản lý kiểm tra</p>}
        </DashboardSection>

        <DashboardSection title="Thành viên">
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="CTV hoạt động" value={members.collaborators} />
            <StatTile label="Quản lý" value={members.managers} />
            <StatTile label="Chờ duyệt" value={members.pending} alert={members.pending > 0} />
            <StatTile label="Bị khóa" value={members.blocked} />
          </div>
          {members.pending > 0 && (
            <Link to="/admin/users?tab=pending" className="inline-flex items-center min-h-[44px] text-sm font-semibold text-indigo-700 hover:underline">
              Duyệt {members.pending} tài khoản
            </Link>
          )}
        </DashboardSection>

        <DashboardSection title="Cào tin tự động · 24 giờ qua" note="Tính từ ngày bật thống kê, lưu 30 ngày.">
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Tin nhận được" value={ingestion24h.received} />
            <StatTile label="Tạo căn mới" value={ingestion24h.created} />
            <StatTile label="Gộp vì trùng" value={ingestion24h.merged} />
            <StatTile label="Loại (rác / lỗi)" value={ingestion24h.notRental + ingestion24h.failed} alert={ingestion24h.failed > 0} />
          </div>
        </DashboardSection>

        <DashboardSection title="Tương tác">
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Lượt xem trang khách" value={market.publicViews} />
            <StatTile label="Khách đang tìm" value={market.openLeads} />
            <StatTile label="Khách mới 7 ngày" value={market.newLeads7d} />
            <StatTile label="Tin CTV chờ duyệt" value={market.pendingSubmissions} />
          </div>
        </DashboardSection>

        <DashboardSection title="Theo khu vực" note={`${onMarket} căn đang chào (không tính Đã thuê)`}>
          {zoneRows.length ? <BarList rows={zoneRows} total={onMarket} label="Phân bố căn theo khu vực" /> : <p className="text-sm text-slate-600">Chưa có căn đang chào.</p>}
        </DashboardSection>

        <DashboardSection title="Theo khoảng giá" note="Khớp các mức giá trong bộ lọc Bảng hàng">
          <BarList rows={priceRows} total={onMarket} label="Phân bố căn theo khoảng giá" />
        </DashboardSection>
      </div>
    );
  };

  return (
    <main className="max-w-5xl mx-auto px-4 pt-4 pb-app space-y-3">
      <h1 className="text-xl font-bold text-slate-900">Tổng quan</h1>
      {renderStats()}
    </main>
  );
};
