import React, { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { User } from '../../api/authApi.js';
import { NotificationBell } from './NotificationBell.js';

interface NavbarProps {
  user: User | null;
  pendingCount: number;
  accountMenu: React.ReactNode; // Nội dung menu avatar (AccountMenu) — AppShell truyền vào
}

const NAV_ITEMS = [
  { to: '/apartments', label: 'Bảng hàng' },
  { to: '/leads', label: 'Khách hàng' },
  { to: '/submissions', label: 'Tin đăng' }, // Story 8.6: Quản lý thấy là "Duyệt tin" kèm số tin chờ
];

/**
 * Thanh trên. Máy tính: logo + tab + chuông + avatar. Điện thoại (Story 9.3): chỉ logo + chuông —
 * tab và tài khoản chuyển xuống menu đáy trong tầm ngón cái.
 */
export const Navbar: React.FC<NavbarProps> = ({ user, pendingCount, accountMenu }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  // Đóng menu khi chạm ra ngoài
  useEffect(() => {
    if (!isMenuOpen) return;
    const close = (e: PointerEvent) => !menuRef.current?.contains(e.target as Node) && setIsMenuOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 pt-[env(safe-area-inset-top)]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <NavLink to="/apartments" className="flex items-center gap-2 min-h-[44px] mr-2" aria-label="ApartmentDN — Bảng hàng">
            <img src="/icons/favicon-64.png" alt="" className="w-8 h-8 rounded-lg" />
            <span className="text-base font-bold text-[#0f2a45]">ApartmentDN</span>
          </NavLink>
          {user &&
            NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `hidden md:flex h-9 px-3 items-center gap-1 rounded-lg text-sm font-medium whitespace-nowrap ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'}`
                }
              >
                {to === '/submissions' && isManager ? 'Duyệt tin' : label}
                {to === '/submissions' && pendingCount > 0 && (
                  <span className="min-w-[20px] h-5 px-1 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center" aria-label={`${pendingCount} tin chờ duyệt`}>
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </NavLink>
            ))}
        </div>

        {user && (
          <div className="flex items-center gap-1">
            <NotificationBell user={user} />
            <div className="relative hidden md:block" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen((open) => !open)}
                aria-label="Tài khoản"
                aria-expanded={isMenuOpen}
                className="w-9 h-9 rounded-full bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center"
              >
                {user.name.trim().charAt(0).toUpperCase()}
              </button>
              {isMenuOpen && (
                // Bấm mục nào trong menu thì đóng menu (nút copy mã tự chặn để giữ chữ "Đã copy")
                <div
                  onClick={() => setIsMenuOpen(false)}
                  className="absolute right-0 top-11 w-60 p-1 bg-white rounded-xl border border-slate-200 shadow-lg z-50"
                >
                  {accountMenu}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
