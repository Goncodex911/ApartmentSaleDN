import React, { useState } from 'react';
import { User } from '../../api/authApi.js';
import { copyText } from '../../utils/clipboard.js';

const ROLE_LABEL: Record<User['role'], string> = { ADMIN: 'Admin', MANAGER: 'Quản lý', COLLABORATOR: 'CTV' };
const itemClass = 'w-full min-h-[44px] text-left px-4 py-3 text-sm hover:bg-slate-50 rounded-lg';

/**
 * Nội dung menu tài khoản (Story 9.3) — dùng chung cho menu avatar (máy tính) và nút Tài khoản ở menu đáy (điện thoại).
 */
export const AccountMenu: React.FC<{
  user: User;
  onProfile: () => void;
  onApprovals: () => void;
  onLogout: () => void;
}> = ({ user, onProfile, onApprovals, onLogout }) => {
  const [codeCopied, setCodeCopied] = useState(false);

  const handleCopyCode = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Không đóng menu avatar → người dùng thấy "Đã copy mã"
    if (await copyText(user.ctvCode)) {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1500);
    }
  };

  return (
    <div className="space-y-1">
      <div className="px-4 py-2">
        <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
        <button type="button" onClick={handleCopyCode} className="min-h-[32px] text-xs text-slate-500 hover:text-slate-700">
          {ROLE_LABEL[user.role]} · {codeCopied ? 'Đã copy mã' : user.ctvCode}
        </button>
      </div>
      <button type="button" className={`${itemClass} text-slate-700`} onClick={onProfile}>Hồ sơ cá nhân</button>
      {user.role === 'ADMIN' && (
        <button type="button" className={`${itemClass} text-slate-700`} onClick={onApprovals}>Duyệt tài khoản</button>
      )}
      <button type="button" className={`${itemClass} text-rose-600`} onClick={onLogout}>Đăng xuất</button>
    </div>
  );
};
