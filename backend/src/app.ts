import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authRoutes } from './modules/auth/auth.routes.js';
import { apartmentRoutes } from './modules/apartments/apartment.routes.js';
import { submissionRoutes } from './modules/submissions/submission.routes.js';
import { userRoutes } from './modules/users/user.routes.js';
import { ingestionRoutes } from './modules/ingestion/ingestion.routes.js';
import { shareRoutes } from './modules/share/share.routes.js';
import { leadRoutes } from './modules/leads/lead.routes.js';
import { chatRoutes } from './modules/chat/chat.routes.js';
import { notificationRoutes } from './modules/notifications/notification.routes.js';
import { realtimeRoutes } from './modules/realtime/realtime.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { listingReportRoutes } from './modules/reports/listing-report.routes.js';
import { announcementRoutes } from './modules/announcements/announcement.routes.js';
import { errorHandler } from './middlewares/error.js';
import './modules/security/alert-rules.js'; // Story 16.5: gắn bộ phát hiện bất thường vào nhật ký

export const app = express();

// Chạy sau proxy (Netlify → Render = 2 tầng, Nginx = 1 tầng) phải khai báo số tầng proxy tin cậy
// để req.ip là IP thật của khách — bộ giới hạn tần suất chat/tìm kiếm AI đếm theo IP này
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));

// Middlewares cơ bản
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Health Check
app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime(), timestamp: new Date() });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/apartments', apartmentRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/ingestion', ingestionRoutes);
app.use('/api/v1/share', shareRoutes);
app.use('/api/v1/announcements', announcementRoutes); // Story 16.9
app.use('/api/v1/leads', leadRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/submissions', submissionRoutes);
app.use('/api/v1/realtime', realtimeRoutes);
app.use('/api/v1/admin', adminRoutes); // Epic 13 — khu quản trị (ADMIN)
app.use('/api/v1/reports', listingReportRoutes); // Story 13.6 — CTV báo lỗi tin + hàng đợi kiểm duyệt

// Xử lý lỗi tập trung
app.use(errorHandler);
