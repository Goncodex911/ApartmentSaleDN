import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage.js';
import { ApartmentsPage } from './pages/ApartmentsPage.js';
import { ProtectedRoute } from './components/layout/ProtectedRoute.js';
import { PublicListingPage } from './pages/PublicListingPage.js';
import { LeadsPage } from './pages/LeadsPage.js';
import { SubmissionsPage } from './pages/SubmissionsPage.js';
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
        </Route>
        <Route path="/" element={<Navigate to="/apartments" replace />} />
        <Route path="*" element={<Navigate to="/apartments" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

