import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ChevronRight, ScrollText, Settings, ShieldAlert, Trophy, Users, WifiOff } from 'lucide-react';
import { useApp } from '../components/layout/AppShell.js';
import { DashboardStats, adminApi } from '../api/adminApi.js';
import { BarList, DashboardSection, StatTile } from '../components/admin/DashboardParts.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Button } from '../components/ui/Button.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { STATUS_ORDER, STATUS_STYLE } from '../utils/statusStyle.js';
import { ZONES } from '../utils/danang.js';
import { PRICE_RANGES } from '../components/apartment/FilterSheet.js';

// Lối vào các trang quản trị (Epic 13)
const ADMIN_LINKS = [
  { to: '/admin/users', label: 'Thành viên', icon: Users },
  { to: '/admin/performance', label: 'Hiệu suất CTV', icon: Trophy },
  { to: '/admin/audit-logs', label: 'Nhật ký truy vết', icon: ScrollText },
  { to: '/admin/settings', label: 'Cấu hình', icon: Settings },
  { to: '/moderation', label: 'Kiểm duyệt báo lỗi', icon: ShieldAlert },
];

/** [ADMIN] Trung tâm điều hành (Story 13.1): kho căn, thành viên, cào tin 24h, tương tác khách, phân bố khu vực & giá. */
export const AdminDashboardPage: React.FC = () => {
  const { user } = useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    setStats(null);
    adminApi.getDashboardStats().then(setStats).catch(() => setError(true));
  }, []);
  useEffect(load, [load]);

  if (user && user.role !== 'ADMIN') return <Navigate to="/apartments" replace />;

  const renderStats = () => {
    if (error) return <EmptyState icon={WifiOff} title="Không tải được số liệu" description="Vui lòng kiểm tra mạng rồi thử lại." action={<Button onClick={load}>Thử lại</Button>} />;
    if (!stats) {
      return (
        <div className="space-y-3" aria-busy="true" aria-label="Đang tải số liệu">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      );
    }
    const { apartments, members, ingestion24h, market } = stats;
    const onMarket = apartments.total - (apartments.byStatus.RENTED ?? 0);
    const zoneRows = [...ZONES, 'UNKNOWN']
      .map((zone) => ({ label: zone === 'UNKNOWN' ? 'Chưa rõ khu vực' : zone, count: apartments.byZone[zone] ?? 0 }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count);
    const priceRows = PRICE_RANGES.map((range) => ({ label: range.label, count: apartments.byPrice[range.id] ?? 0 }));

    return (
      <div className="grid gap-3 lg:grid-cols-2">
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
      <h1 className="text-xl font-bold text-slate-900">Quản trị</h1>
      <nav aria-label="Trang quản trị" className="grid grid-cols-2 gap-2">
        {ADMIN_LINKS.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="flex items-center gap-2 min-h-[52px] px-3 rounded-2xl bg-white border border-slate-200 text-sm font-semibold text-slate-800 hover:border-slate-300">
            <Icon className="w-5 h-5 text-indigo-600 shrink-0" aria-hidden />
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-4 h-4 text-slate-400" aria-hidden />
          </Link>
        ))}
      </nav>
      {renderStats()}
    </main>
  );
};
