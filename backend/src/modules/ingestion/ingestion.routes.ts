import { Router } from 'express';
import { IngestionController } from './ingestion.controller.js';
import { authMiddleware } from '../../middlewares/auth.js';
import { requireWebhookSecret } from '../../middlewares/webhook-secret.js';

export const ingestionRoutes = Router();

// Các route "-public" và webhook không dùng token đăng nhập → bắt buộc header x-webhook-secret

// 1. Phân tích văn bản AI (không lưu DB)
ingestionRoutes.post('/parse', authMiddleware, IngestionController.parseRawPost);
ingestionRoutes.post('/parse-public', requireWebhookSecret, IngestionController.parseRawPost);

// 2. Pipeline toàn diện (AI Parse -> Khử trùng 2 tầng -> Lưu Master/Sub)
ingestionRoutes.post('/process-listing', authMiddleware, IngestionController.processListing);
ingestionRoutes.post('/process-listing-public', requireWebhookSecret, IngestionController.processListing);

// 3. AC2: Cổng tiếp nhận Webhook WhatsApp
ingestionRoutes.post('/webhook', requireWebhookSecret, IngestionController.webhook);

// 4. AC3: Cổng nhận dữ liệu 1-Click từ Chrome Extension
ingestionRoutes.post('/extension-import', authMiddleware, IngestionController.extensionImport);
ingestionRoutes.post('/extension-import-public', requireWebhookSecret, IngestionController.extensionImport);

// 5. AC4: Hộp thoại Nhập Nhanh trên Portal Web
ingestionRoutes.post('/quick-paste', authMiddleware, IngestionController.quickPaste);
