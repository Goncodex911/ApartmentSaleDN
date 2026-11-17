import React, { createContext, useContext, useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { User, authApi } from '../../api/authApi.js';
import { submissionApi } from '../../api/submissionApi.js';
import { useCurrentUser } from '../../hooks/useCurrentUser.js';
import { notifySubmissionsChanged, usePendingSubmissionCount } from '../../hooks/useSubmissions.js';
import { APARTMENTS_CHANGED } from '../../hooks/useApartmentSearch.js';
import { clearOfflineData } from '../../utils/offlineCache.js';
import { Navbar } from './Navbar.js';
import { BottomNav } from './BottomNav.js';
import { AccountMenu } from './AccountMenu.js';
import { BottomSheet } from './BottomSheet.js';
import { PendingUsersModal } from './PendingUsersModal.js';
import { ProfileModal } from '../profile/ProfileModal.js';
import { QuickPasteModal } from '../apartment/QuickPasteModal.js';
import { ApartmentModal } from '../apartment/ApartmentModal.js';

interface AppContextValue {
  user: User | null;
  openQuickPaste: () => void;
  openSubmit: () => void;
}
const AppContext = createContext<AppContextValue>({ user: null, openQuickPaste: () => undefined, openSubmit: () => undefined });
export const useApp = () => useContext(AppContext);

type Panel = 'account' | 'profile' | 'approvals' | 'quickPaste' | 'submit' | null;

/**
 * Khung chung của các trang sau đăng nhập (Story 9.3): tải người dùng 1 lần, thanh trên, menu đáy (điện thoại)
 * và các hộp dùng chung — Tài khoản, Hồ sơ, Duyệt tài khoản, Nhập tin AI (Quản lý), Đăng tin (CTV).
 */
export const AppShell: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useCurrentUser();
  const [panel, setPanel] = useState<Panel>(null);
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const pendingCount = usePendingSubmissionCount(isManager);
  const close = () => setPanel(null);

  const logout = async () => {
    await authApi.logout().catch(() => undefined); // Lỗi mạng khi đăng xuất thì vẫn xóa phiên ở máy
    await clearOfflineData(); // Không để dữ liệu Bảng hàng (có SĐT chủ nhà) lại trên máy
    localStorage.clear();
    navigate('/login');
  };

  const context = useMemo(
    () => ({ user, openQuickPaste: () => setPanel('quickPaste'), openSubmit: () => setPanel('submit') }),
    [user]
  );
  const accountMenu = user && (
    <AccountMenu user={user} onProfile={() => setPanel('profile')} onApprovals={() => setPanel('approvals')} onLogout={logout} />
  );

  return (
    <AppContext.Provider value={context}>
      <div className="min-h-screen bg-slate-50">
        <Navbar user={user} pendingCount={pendingCount} accountMenu={accountMenu} />
        <Outlet />
        {user && (
          <BottomNav
            isManager={isManager}
            pendingCount={pendingCount}
            onMainAction={() => setPanel(isManager ? 'quickPaste' : 'submit')}
            onAccount={() => setPanel('account')}
          />
        )}
      </div>

      {panel === 'account' && accountMenu && <BottomSheet title="Tài khoản" onClose={close}>{accountMenu}</BottomSheet>}
      {panel === 'profile' && user && <ProfileModal user={user} onClose={close} onProfileUpdated={setUser} />}
      {panel === 'approvals' && <PendingUsersModal onClose={close} />}
      {panel === 'quickPaste' && (
        <QuickPasteModal
          onClose={close}
          onSuccess={() => {
            window.dispatchEvent(new Event(APARTMENTS_CHANGED));
            navigate('/apartments');
          }}
        />
      )}
      {panel === 'submit' && (
        <ApartmentModal
          heading="Đăng tin"
          submitLabel="Gửi Quản lý duyệt"
          onSave={async (payload) => {
            await submissionApi.create(payload);
            notifySubmissionsChanged();
            navigate('/submissions'); // Xem tin vừa gửi ở trạng thái Chờ duyệt
          }}
          onClose={close}
        />
      )}
    </AppContext.Provider>
  );
};
