import { Router } from 'express';
import { TelegramUserbotController } from './telegram-userbot.controller.js';
import { authMiddleware } from '../../middlewares/auth.js';
import { requireRoles } from '../../middlewares/rbac.js';

export const telegramUserbotRoutes = Router();

// Toàn bộ các API Userbot Scraper yêu cầu quyền Quản lý hoặc Quản trị viên (ADMIN, MANAGER)
const managerOnly = [authMiddleware, requireRoles('ADMIN', 'MANAGER')];

// Xác thực 1-Chạm qua Deep-link / Quét QR
telegramUserbotRoutes.post('/auth/qr/start', ...managerOnly, TelegramUserbotController.startQrAuth);
telegramUserbotRoutes.post('/auth/qr/check', ...managerOnly, TelegramUserbotController.checkQrAuth);

telegramUserbotRoutes.post('/auth/send-code', ...managerOnly, TelegramUserbotController.sendAuthCode);
telegramUserbotRoutes.post('/auth/verify', ...managerOnly, TelegramUserbotController.verifyAuthCode);
telegramUserbotRoutes.post('/auth/disconnect', ...managerOnly, TelegramUserbotController.disconnect);
telegramUserbotRoutes.get('/status', ...managerOnly, TelegramUserbotController.getStatus);
telegramUserbotRoutes.get('/dialogs', ...managerOnly, TelegramUserbotController.getDialogs);
telegramUserbotRoutes.post('/scrape', ...managerOnly, TelegramUserbotController.scrape);
telegramUserbotRoutes.post('/listener/start', ...managerOnly, TelegramUserbotController.startListener);
telegramUserbotRoutes.post('/listener/stop', ...managerOnly, TelegramUserbotController.stopListener);
telegramUserbotRoutes.get('/listener/status', ...managerOnly, TelegramUserbotController.getListenerStatus);
