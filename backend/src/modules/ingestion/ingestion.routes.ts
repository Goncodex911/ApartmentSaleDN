import { Router } from 'express';
import { IngestionController } from './ingestion.controller.js';
import { telegramUserbotRoutes } from './telegram-userbot.routes.js';
import { authMiddleware } from '../../middlewares/auth.js';
import { requireRoles } from '../../middlewares/rbac.js';
import { requireWebhookSecret } from '../../middlewares/webhook-secret.js';

export const ingestionRoutes = Router();

// Các route "-public" và webhook không dùng token đăng nhập → bắt buộc header x-webhook-secret
// Route dùng token: CHỈ Quản lý/Admin (Story 8.1) — CTV không được tự tạo căn vào kho hay dùng hạn mức Gemini
const managerOnly = [authMiddleware, requireRoles('ADMIN', 'MANAGER')];

// 1. Phân tích văn bản AI (không lưu DB)
ingestionRoutes.post('/parse', ...managerOnly, IngestionController.parseRawPost);
ingestionRoutes.post('/parse-public', requireWebhookSecret, IngestionController.parseRawPost);

// 2. Pipeline toàn diện (AI Parse -> Khử trùng 2 tầng -> Lưu Master/Sub)
ingestionRoutes.post('/process-listing', ...managerOnly, IngestionController.processListing);
ingestionRoutes.post('/process-listing-public', requireWebhookSecret, IngestionController.processListing);

// 3. AC2: Cổng tiếp nhận Webhook WhatsApp
ingestionRoutes.post('/webhook', requireWebhookSecret, IngestionController.webhook);

// 4. AC3: Cổng nhận dữ liệu 1-Click từ Chrome Extension
ingestionRoutes.post('/extension-import', ...managerOnly, IngestionController.extensionImport);
ingestionRoutes.post('/extension-import-public', requireWebhookSecret, IngestionController.extensionImport);

// 5. AC4: Hộp thoại Nhập Nhanh trên Portal Web
ingestionRoutes.post('/quick-paste', ...managerOnly, IngestionController.quickPaste);
// Story 20.2: tách nguồn gộp nhầm / giữ căn riêng / gộp căn "có thể trùng"
ingestionRoutes.post('/split', ...managerOnly, IngestionController.split);
ingestionRoutes.post('/keep-separate', ...managerOnly, IngestionController.keepSeparate);
ingestionRoutes.post('/merge-into', ...managerOnly, IngestionController.mergeInto);

// 6. Story CE-01: Cổng Userbot Telegram Scraper tự phục vụ & Lắng nghe thời gian thực
ingestionRoutes.use('/telegram-userbot', telegramUserbotRoutes);

