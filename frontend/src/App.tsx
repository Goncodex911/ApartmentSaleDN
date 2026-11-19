import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage.js';
import { ApartmentsPage } from './pages/ApartmentsPage.js';
import { ProtectedRoute } from './components/layout/ProtectedRoute.js';
import { PublicListingPage } from './pages/PublicListingPage.js';
import { LeadsPage } from './pages/LeadsPage.js';
import { SubmissionsPage } from './pages/SubmissionsPage.js';
import { AdminDashboardPage } from './pages/AdminDashboardPage.js';
import { AdminUsersPage } from './pages/AdminUsersPage.js';
import { AdminAuditLogsPage } from './pages/AdminAuditLogsPage.js';
import { AdminPerformancePage } from './pages/AdminPerformancePage.js';
import { AdminSettingsPage } from './pages/AdminSettingsPage.js';
import { ModerationPage } from './pages/ModerationPage.js';
import { PwaStatus } from './components/layout/PwaStatus.js';
import { AppShell } from './components/layout/AppShell.js';

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
          <Route path="/admin" element={<AdminDashboardPage />} /> {/* [ADMIN] Trung tâm điều hành (Story 13.1) */}
          <Route path="/admin/users" element={<AdminUsersPage />} /> {/* [ADMIN] Thành viên (Story 13.2) */}
          <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} /> {/* [ADMIN] Nhật ký truy vết (Story 13.3) */}
          <Route path="/admin/performance" element={<AdminPerformancePage />} /> {/* [ADMIN] Hiệu suất CTV (Story 13.4) */}
          <Route path="/admin/settings" element={<AdminSettingsPage />} /> {/* [ADMIN] Cấu hình hệ thống (Story 13.5) */}
          <Route path="/moderation" element={<ModerationPage />} /> {/* Admin + Quản lý: kiểm duyệt báo lỗi (Story 13.6) */}
        </Route>
        <Route path="/" element={<Navigate to="/apartments" replace />} />
        <Route path="*" element={<Navigate to="/apartments" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

