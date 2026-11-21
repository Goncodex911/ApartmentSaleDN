import React from 'react';
import { NavLink } from 'react-router-dom';
import { ClipboardCheck, ClipboardList, LayoutGrid, Plus, ShieldCheck, Sparkles, UserRound, Users, LucideIcon } from 'lucide-react';

interface BottomNavProps {
  isManager: boolean;
  isAdmin: boolean; // Story 16.1: Admin thấy lối vào Quản trị thay cho Duyệt tin (Duyệt tin nằm trong menu Thêm của khu Quản trị)
  pendingCount: number;
  onMainAction: () => void; // Quản lý: Nhập tin AI · CTV: Đăng tin
  onAccount: () => void;
}

const cell = 'relative flex-1 min-w-[64px] h-14 flex items-center justify-center';

const Tab: React.FC<{ to: string; label: string; icon: LucideIcon; badge?: number }> = ({ to, label, icon: Icon, badge }) => (
  <NavLink to={to} aria-label={label} title={label} className={({ isActive }) => `${cell} ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>
    {({ isActive }) => (
      <>
        {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-indigo-600" aria-hidden />}
        <Icon className="w-6 h-6" strokeWidth={isActive ? 2.4 : 2} aria-hidden />
        {!!badge && (
          <span className="absolute top-2 left-1/2 ml-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </>
    )}
  </NavLink>
);

/**
 * Menu đáy cho thao tác 1 tay (Story 9.3) — chỉ trên điện thoại (< 768px), chỉ hiện icon (tên đọc qua aria-label / title).
 * Nằm phía trên huy hiệu "Powered by Netlify" (gói Free không tắt được, không ẩn bằng CSS) và thanh Home của iPhone.
 */
export const BottomNav: React.FC<BottomNavProps> = ({ isManager, isAdmin, pendingCount, onMainAction, onAccount }) => {
  const mainLabel = isManager ? 'Nhập tin AI' : 'Đăng tin';
  const MainIcon = isManager ? Sparkles : Plus;

  return (
    <nav aria-label="Menu chính" className="md:hidden fixed inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 pb-bottom-nav">
      <div className="flex items-center justify-around max-w-md mx-auto">
        <Tab to="/apartments" label="Bảng hàng" icon={LayoutGrid} />
        <Tab to="/leads" label="Khách hàng" icon={Users} />
        <div className={cell}>
          <button
            type="button"
            onClick={onMainAction}
            aria-label={mainLabel}
            title={mainLabel}
            className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform"
          >
            <MainIcon className="w-6 h-6" aria-hidden />
          </button>
        </div>
        {isAdmin ? (
          <Tab to="/admin" label="Quản trị" icon={ShieldCheck} />
        ) : (
        <Tab
          to="/submissions"
          label={isManager ? 'Duyệt tin' : 'Tin đăng'}
          icon={isManager ? ClipboardCheck : ClipboardList}
          badge={isManager ? pendingCount : 0}
        />
        )}
        <button type="button" onClick={onAccount} aria-label="Tài khoản" title="Tài khoản" className={`${cell} text-slate-500`}>
          <UserRound className="w-6 h-6" aria-hidden />
        </button>
      </div>
    </nav>
  );
};
