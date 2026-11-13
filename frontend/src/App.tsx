import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage.js';
import { ApartmentsPage } from './pages/ApartmentsPage.js';
import { ProtectedRoute } from './components/layout/ProtectedRoute.js';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/apartments"
          element={
            <ProtectedRoute>
              <ApartmentsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/apartments" replace />} />
        <Route path="*" element={<Navigate to="/apartments" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

