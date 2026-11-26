import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage.js';
import { ApartmentsPage } from './pages/ApartmentsPage.js';
import { ProtectedRoute } from './components/layout/ProtectedRoute.js';
import { PwaStatus } from './components/layout/PwaStatus.js';
import { AppShell } from './components/layout/AppShell.js';
import { AdminLayout } from './components/admin/AdminLayout.js';
import { lastAdminMode } from './components/admin/adminNav.js';
import { Skeleton } from './components/ui/Skeleton.js';

/**
 * Story 19.11: trang ít dùng (Quản trị, Cào tin, Kiểm duyệt, Khách hàng, trang khách...) tải khi cần → bundle chính nhẹ cho CTV dùng 4G.
 * Mỗi trang tự bọc Suspense → khung app (menu, thanh trên) đứng yên trong lúc tải trang con.
 */
function lazyPage<K extends string>(loader: () => Promise<Record<K, React.ComponentType>>, name: K): React.FC {
  const Page = lazy(async () => ({ default: (await loader())[name] as React.ComponentType }));
  return () => (
    <Suspense fallback={<PageFallback />}>
      <Page />
    </Suspense>
  );
}

const PageFallback: React.FC = () => (
  <div className="max-w-5xl mx-auto px-4 pt-4 space-y-3" aria-busy="true" aria-label="Đang tải trang">
    <Skeleton className="h-7 w-48 rounded-lg" />
    <Skeleton className="h-40 rounded-2xl" />
    <Skeleton className="h-40 rounded-2xl" />
  </div>
);

const PublicListingPage = lazyPage(() => import('./pages/PublicListingPage.js'), 'PublicListingPage');
const LeadsPage = lazyPage(() => import('./pages/LeadsPage.js'), 'LeadsPage');
const SubmissionsPage = lazyPage(() => import('./pages/SubmissionsPage.js'), 'SubmissionsPage');
const AdminDashboardPage = lazyPage(() => import('./pages/AdminDashboardPage.js'), 'AdminDashboardPage');
const AdminUsersPage = lazyPage(() => import('./pages/AdminUsersPage.js'), 'AdminUsersPage');
const AdminUserDetailPage = lazyPage(() => import('./pages/AdminUserDetailPage.js'), 'AdminUserDetailPage');
const AdminAlertsPage = lazyPage(() => import('./pages/AdminAlertsPage.js'), 'AdminAlertsPage');
const AdminTrashPage = lazyPage(() => import('./pages/AdminTrashPage.js'), 'AdminTrashPage');
const AdminStalePage = lazyPage(() => import('./pages/AdminStalePage.js'), 'AdminStalePage');
const AdminHealthPage = lazyPage(() => import('./pages/AdminHealthPage.js'), 'AdminHealthPage');
const AdminAnnouncementsPage = lazyPage(() => import('./pages/AdminAnnouncementsPage.js'), 'AdminAnnouncementsPage');
const AdminAuditLogsPage = lazyPage(() => import('./pages/AdminAuditLogsPage.js'), 'AdminAuditLogsPage');
const AdminPerformancePage = lazyPage(() => import('./pages/AdminPerformancePage.js'), 'AdminPerformancePage');
const AdminSettingsPage = lazyPage(() => import('./pages/AdminSettingsPage.js'), 'AdminSettingsPage');
const MapQAPage = lazyPage(() => import('./pages/admin/MapQAPage.js'), 'MapQAPage');
const TelegramScraperPage = lazyPage(() => import('./pages/admin/TelegramScraperPage.js'), 'TelegramScraperPage');
const ModerationPage = lazyPage(() => import('./pages/ModerationPage.js'), 'ModerationPage');

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <PwaStatus />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* Trang xem phòng công khai cho khách — không cần đăng nhập (Story 5.3) */}
        <Route path="/p/:slug" element={<PublicListingPage />} />
        {/* Các trang sau đăng nhập dùng chung khung AppShell: thanh trên, menu đáy, hộp Tài khoản / Nhập tin AI / Đăng tin (Story 9.3) */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/apartments" element={<ApartmentsPage />} />
          <Route path="/leads" element={<LeadsPage />} /> {/* Phễu khách hàng CRM (Story 6.1) */}
          <Route path="/submissions" element={<SubmissionsPage />} /> {/* Tin CTV đăng chờ duyệt (Story 8.6) */}
          {/* [ADMIN] Khu Quản trị (Story 16.1): khung + kiểm tra quyền tập trung trong AdminLayout */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} /> {/* Trung tâm điều hành (Story 13.1) */}
            <Route path="users" element={<AdminUsersPage />} /> {/* Thành viên (Story 13.2) */}
            <Route path="users/:id" element={<AdminUserDetailPage />} /> {/* Hồ sơ 360° (Story 16.3) */}
            <Route path="audit-logs" element={<AdminAuditLogsPage />} /> {/* Nhật ký (Story 13.3) */}
            <Route path="performance" element={<AdminPerformancePage />} /> {/* Hiệu suất CTV (Story 13.4) */}
            <Route path="settings" element={<AdminSettingsPage />} /> {/* Cấu hình hệ thống (Story 13.5) */}
            <Route path="alerts" element={<AdminAlertsPage />} /> {/* Cảnh báo bảo mật (Story 16.5) */}
            <Route path="trash" element={<AdminTrashPage />} /> {/* Thùng rác (Story 16.7) */}
            <Route path="stale" element={<AdminStalePage />} /> {/* Kho tồn (Story 16.7) */}
            <Route path="telegram-scraper" element={<TelegramScraperPage />} /> {/* Cào tin Telegram (Story CE-01) */}
            <Route path="map-qa" element={<MapQAPage />} /> {/* Rà soát bản đồ (Story 17.6) */}
            <Route path="health" element={<AdminHealthPage />} /> {/* Sức khỏe hệ thống (Story 16.8) */}
            <Route path="announcements" element={<AdminAnnouncementsPage />} /> {/* Thông báo chung (Story 16.9) */}
            <Route path="moderation" element={<ModerationPage />} /> {/* Kiểm duyệt báo lỗi trong khung Quản trị */}
          </Route>
          <Route path="/moderation" element={<ModerationPage />} /> {/* Admin + Quản lý: kiểm duyệt báo lỗi (Story 13.6) */}
          <Route path="/telegram-scraper" element={<TelegramScraperPage />} /> {/* Quản lý: cào tin Telegram (CE-02) */}
        </Route>
        {/* Story 16.1: Admin vào lại chế độ dùng gần nhất (khu /admin tự kiểm tra quyền) */}
        <Route path="/" element={<Navigate to={lastAdminMode() === 'admin' ? '/admin' : '/apartments'} replace />} />
        <Route path="*" element={<Navigate to="/apartments" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

