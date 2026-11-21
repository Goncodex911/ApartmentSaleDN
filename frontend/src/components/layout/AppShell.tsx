import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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
import { InstallPrompt } from './InstallPrompt.js';
import { ProfileModal } from '../profile/ProfileModal.js';
import { ChangePasswordSheet } from '../profile/ChangePasswordSheet.js';
import { QuickPasteModal } from '../apartment/QuickPasteModal.js';
import { ApartmentModal } from '../apartment/ApartmentModal.js';
import { LiveToast } from './LiveToast.js';
import { useRealtimeInventory } from '../../hooks/useRealtimeInventory.js';
import { saveAdminMode } from '../admin/adminNav.js';

interface AppContextValue {
  user: User | null;
  openQuickPaste: () => void;
  openSubmit: () => void;
  openAccount: () => void; // Story 16.1: menu "Thêm" của khu Quản trị mở hộp Tài khoản
}
const noop = () => undefined;
const AppContext = createContext<AppContextValue>({ user: null, openQuickPaste: noop, openSubmit: noop, openAccount: noop });
export const useApp = () => useContext(AppContext);

type Panel = 'account' | 'profile' | 'password' | 'quickPaste' | 'submit' | null;

/**
 * Khung chung của các trang sau đăng nhập (Story 9.3): tải người dùng 1 lần, thanh trên, menu đáy (điện thoại)
 * và các hộp dùng chung — Tài khoản, Hồ sơ, Nhập tin AI (Quản lý), Đăng tin (CTV).
 */
export const AppShell: React.FC = () => {
  const navigate = useNavigate();
  const adminArea = useLocation().pathname.startsWith('/admin'); // Story 16.1: khu Quản trị có menu riêng (AdminLayout)
  const { user, setUser } = useCurrentUser();
  const [panel, setPanel] = useState<Panel>(null);
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const pendingCount = usePendingSubmissionCount(isManager);
  const liveUpdates = useRealtimeInventory(user); // Story 11.4: kho phòng cập nhật tức thì
  const close = () => setPanel(null);
  // Story 13.9: đang dùng mật khẩu tạm Admin cấp → mỗi lần mở app tự mở bảng Đổi mật khẩu (đóng tạm được, không khóa app)
  const mustChangePassword = Boolean(user?.mustChangePassword);
  useEffect(() => {
    if (mustChangePassword) setPanel('password');
  }, [mustChangePassword]);
  // Story 16.1: Admin mở lại app ("/") vào chế độ dùng gần nhất
  const isAdmin = user?.role === 'ADMIN';
  useEffect(() => {
    if (isAdmin) saveAdminMode(adminArea ? 'admin' : 'app');
  }, [isAdmin, adminArea]);

  const logout = async () => {
    await authApi.logout().catch(() => undefined); // Lỗi mạng khi đăng xuất thì vẫn xóa phiên ở máy
    await clearOfflineData(); // Không để dữ liệu Bảng hàng (có SĐT chủ nhà) lại trên máy
    localStorage.clear();
    navigate('/login');
  };

  const context = useMemo(
    () => ({ user, openQuickPaste: () => setPanel('quickPaste'), openSubmit: () => setPanel('submit'), openAccount: () => setPanel('account') }),
    [user]
  );
  const accountMenu = user && (
    <AccountMenu user={user} onProfile={() => setPanel('profile')} onNavigate={(path) => {
        close();
        navigate(path);
      }} onLogout={logout} />
  );

  return (
    <AppContext.Provider value={context}>
      <div className="min-h-screen bg-slate-50">
        <Navbar user={user} pendingCount={pendingCount} accountMenu={accountMenu} adminArea={adminArea} />
        <Outlet />
        <LiveToast
          toast={liveUpdates.toast}
          onDismiss={liveUpdates.dismiss}
          onView={() => {
            window.dispatchEvent(new Event(APARTMENTS_CHANGED));
            navigate('/apartments');
          }}
        />
        {user && !panel && <InstallPrompt />}
        {user && !adminArea && (
          <BottomNav
            isManager={isManager}
            isAdmin={isAdmin}
            pendingCount={pendingCount}
            onMainAction={() => setPanel(isManager ? 'quickPaste' : 'submit')}
            onAccount={() => setPanel('account')}
          />
        )}
      </div>

      {panel === 'account' && accountMenu && <BottomSheet title="Tài khoản" onClose={close}>{accountMenu}</BottomSheet>}
      {panel === 'profile' && user && <ProfileModal user={user} onClose={close} onProfileUpdated={setUser} onChangePassword={() => setPanel('password')} />}
      {panel === 'password' && <ChangePasswordSheet forced={mustChangePassword} onDone={setUser} onClose={close} />}
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
