import React, { useState } from 'react';
import { User, authApi } from '../../api/authApi.js';
import { Building2, UserCircle, LogOut, Copy, Check } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onOpenProfile: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onOpenProfile, onLogout }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (user?.ctvCode) {
      navigator.clipboard.writeText(user.ctvCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogoutClick = async () => {
    try {
      await authApi.logout();
    } catch (_e) {
      // Bỏ qua lỗi mạng khi logout
    }
    onLogout();
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-sm">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">RoomMaster</h1>
              <p className="text-xs text-slate-500 hidden sm:block">Quản lý Căn hộ & Môi giới CTV</p>
            </div>
          </div>

          {/* User Profile & Actions */}
          {user && (
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Mã CTV Badge (Nhấn để copy) */}
              {user.ctvCode && (
                <button
                  onClick={handleCopyCode}
                  title="Nhấn để copy mã định danh CTV"
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  <span>Mã: {user.ctvCode}</span>
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
                </button>
              )}

              {/* Vai trò Badge */}
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  user.role === 'ADMIN'
                    ? 'bg-purple-100 text-purple-700'
                    : user.role === 'MANAGER'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {user.role === 'ADMIN' ? 'Admin' : user.role === 'MANAGER' ? 'Quản lý' : 'CTV'}
              </span>

              {/* Tên & Mở Profile */}
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
              >
                <UserCircle className="w-5 h-5 text-slate-500" />
                <span className="hidden md:inline">{user.name}</span>
              </button>

              {/* Nút Đăng xuất */}
              <button
                onClick={handleLogoutClick}
                title="Đăng xuất"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

