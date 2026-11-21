import React, { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, MoreHorizontal, UserRound } from 'lucide-react';
import { useApp } from '../layout/AppShell.js';
import { BottomSheet } from '../layout/BottomSheet.js';
import { Skeleton } from '../ui/Skeleton.js';
import { adminApi } from '../../api/adminApi.js';
import { ADMIN_NAV, ALERTS_CHANGED, AdminNavItem } from './adminNav.js';
import { IncidentBanner } from './IncidentBanner.js';

const CountBadge: React.FC<{ count: number; className?: string }> = ({ count, className = '' }) =>
  count > 0 ? (
    <span className={`min-w-[20px] h-5 px-1 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center ${className}`} aria-label={`${count} chưa xử lý`}>
      {count > 99 ? '99+' : count}
    </span>
  ) : null;

// `end` cho "/admin": không tô nổi Tổng quan khi đang ở trang con
const isEnd = (to: string) => to === '/admin';

const SideLink: React.FC<{ item: AdminNavItem; count: number }> = ({ item: { to, label, icon: Icon }, count }) => (
  <NavLink
    to={to}
    end={isEnd(to)}
    className={({ isActive }) =>
      `flex items-center gap-3 min-h-[44px] px-3 rounded-xl text-sm font-medium transition-colors duration-150 ${
        isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`
    }
  >
    <Icon className="w-5 h-5 shrink-0" aria-hidden />
    <span className="flex-1">{label}</span>
    <CountBadge count={count} />
  </NavLink>
);

const barCell = 'relative flex-1 min-w-[64px] h-14 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium';

/**
 * Story 16.1: khung khu Quản trị — lồng trong AppShell (giữ thanh trên, chuông, toast realtime, hộp Tài khoản).
 * Máy tính (≥ 1024px): sidebar trái cố định. Điện thoại: menu đáy riêng 4 mục + "Thêm" (BottomSheet).
 * Kiểm tra quyền ADMIN tập trung tại đây cho mọi trang /admin/*.
 */
export const AdminLayout: React.FC = () => {
  const { user, openAccount } = useApp();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const isAdmin = user?.role === 'ADMIN';

  // Story 16.5: số cảnh báo chưa xử lý — tải khi đổi trang và khi trang Cảnh báo xử lý xong
  useEffect(() => {
    if (!isAdmin) return;
    const load = () => adminApi.countOpenAlerts().then(setAlertCount).catch(() => undefined);
    load();
    window.addEventListener(ALERTS_CHANGED, load);
    return () => window.removeEventListener(ALERTS_CHANGED, load);
  }, [isAdmin, pathname]);
  const countOf = (item: AdminNavItem) => (item.badge === 'alerts' ? alertCount : 0);

  // Đang tải hồ sơ lần đầu (chưa có bản lưu ở máy) → chờ, không đá ra nhầm
  if (!user) return <main className="max-w-3xl mx-auto px-4 pt-4"><Skeleton className="h-40 rounded-2xl" /></main>;
  if (user.role !== 'ADMIN') return <Navigate to="/apartments" replace />;

  const barItems = ADMIN_NAV.filter((item) => item.bar);
  const moreItems = ADMIN_NAV.filter((item) => !item.bar);
  const moreActive = moreItems.some((item) => pathname.startsWith(item.to));
  const go = (path: string) => {
    setMoreOpen(false);
    navigate(path);
  };

  return (
    <div className="lg:pl-60">
      <nav aria-label="Menu quản trị" className="hidden lg:flex fixed left-0 top-14 bottom-0 w-60 flex-col gap-1 p-3 bg-white border-r border-slate-200 overflow-y-auto">
        {ADMIN_NAV.map((item) => <SideLink key={item.to} item={item} count={countOf(item)} />)}
      </nav>

      <IncidentBanner />
      <Outlet />

      <nav aria-label="Menu quản trị" className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 pb-bottom-nav">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {barItems.map((item) => {
            const { to, label, short, icon: Icon } = item;
            return (
            <NavLink key={to} to={to} end={isEnd(to)} className={({ isActive }) => `${barCell} ${isActive ? 'text-indigo-600' : 'text-slate-600'}`}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-indigo-600" aria-hidden />}
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 2.4 : 2} aria-hidden />
                  {short ?? label}
                  <CountBadge count={countOf(item)} className="absolute top-1.5 left-1/2 ml-2" />
                </>
              )}
            </NavLink>
            );
          })}
          <button type="button" onClick={() => setMoreOpen(true)} aria-haspopup="dialog" className={`${barCell} ${moreActive ? 'text-indigo-600' : 'text-slate-600'}`}>
            {moreActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-indigo-600" aria-hidden />}
            <MoreHorizontal className="w-6 h-6" aria-hidden />
            Thêm
          </button>
        </div>
      </nav>

      {moreOpen && (
        <BottomSheet title="Quản trị" onClose={() => setMoreOpen(false)}>
          <div className="space-y-1 pb-2">
            {moreItems.map(({ to, label, icon: Icon }) => (
              <button key={to} type="button" onClick={() => go(to)} className="w-full flex items-center gap-3 min-h-[48px] px-3 rounded-xl text-left text-slate-800 active:bg-slate-100">
                <Icon className="w-5 h-5 text-slate-500" aria-hidden /> {label}
              </button>
            ))}
            <button type="button" onClick={() => go('/submissions')} className="w-full flex items-center gap-3 min-h-[48px] px-3 rounded-xl text-left text-slate-800 active:bg-slate-100">
              <ClipboardCheck className="w-5 h-5 text-slate-500" aria-hidden /> Duyệt tin CTV
            </button>
            <button type="button" onClick={() => { setMoreOpen(false); openAccount(); }} className="w-full flex items-center gap-3 min-h-[48px] px-3 rounded-xl text-left text-slate-800 active:bg-slate-100">
              <UserRound className="w-5 h-5 text-slate-500" aria-hidden /> Tài khoản
            </button>
            <button type="button" onClick={() => go('/apartments')} className="w-full flex items-center gap-3 min-h-[48px] px-3 rounded-xl text-left font-semibold text-indigo-700 active:bg-indigo-50">
              <ArrowLeft className="w-5 h-5" aria-hidden /> Về Bảng hàng
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
};
