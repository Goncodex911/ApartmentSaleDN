import React, { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { User, authApi } from '../../api/authApi.js';
import { copyText } from '../../utils/clipboard.js';
import { PendingUsersModal } from './PendingUsersModal.js';
import { NotificationBell } from './NotificationBell.js';

interface NavbarProps {
  user: User | null;
  onOpenProfile: () => void;
  onLogout: () => void;
}

const ROLE_LABEL: Record<User['role'], string> = { ADMIN: 'Admin', MANAGER: 'Quản lý', COLLABORATOR: 'CTV' };
const NAV_ITEMS = [
  { to: '/apartments', label: 'Bảng hàng' },
  { to: '/leads', label: 'Khách hàng' },
];

// Thanh trên tối giản: logo + 2 tab + chuông + avatar (Hồ sơ, Duyệt tài khoản, Đăng xuất nằm trong menu avatar)
export const Navbar: React.FC<NavbarProps> = ({ user, onOpenProfile, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Đóng menu khi chạm ra ngoài
  useEffect(() => {
    if (!isMenuOpen) return;
    const close = (e: PointerEvent) => !menuRef.current?.contains(e.target as Node) && setIsMenuOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [isMenuOpen]);

  const handleLogout = async () => {
    await authApi.logout().catch(() => undefined); // Lỗi mạng khi đăng xuất thì vẫn xóa phiên ở máy
    onLogout();
  };

  const handleCopyCode = async () => {
    if (user && (await copyText(user.ctvCode))) {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1500);
    }
  };

  const menuItem = 'w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <span className="hidden sm:inline mr-2 text-base font-bold text-indigo-600">RoomMaster</span>
          {user &&
            NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `h-9 px-3 flex items-center rounded-lg text-sm font-medium whitespace-nowrap ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'}`
                }
              >
                {label}
              </NavLink>
            ))}
        </div>

        {user && (
          <div className="flex items-center gap-1">
            <NotificationBell user={user} />
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen((open) => !open)}
                aria-label="Tài khoản"
                aria-expanded={isMenuOpen}
                className="w-9 h-9 rounded-full bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center"
              >
                {user.name.trim().charAt(0).toUpperCase()}
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 top-11 w-60 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                    <button onClick={handleCopyCode} className="text-xs text-slate-500 hover:text-slate-700">
                      {ROLE_LABEL[user.role]} · {codeCopied ? 'Đã copy mã' : user.ctvCode}
                    </button>
                  </div>
                  <button className={menuItem} onClick={() => { setIsMenuOpen(false); onOpenProfile(); }}>Hồ sơ cá nhân</button>
                  {user.role === 'ADMIN' && (
                    <button className={menuItem} onClick={() => { setIsMenuOpen(false); setIsApprovalOpen(true); }}>Duyệt tài khoản</button>
                  )}
                  <button className={`${menuItem} text-rose-600 border-t border-slate-100`} onClick={handleLogout}>Đăng xuất</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {isApprovalOpen && <PendingUsersModal onClose={() => setIsApprovalOpen(false)} />}
    </header>
  );
};
