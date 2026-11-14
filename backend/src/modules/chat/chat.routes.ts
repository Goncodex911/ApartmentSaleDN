import { Router } from 'express';
import { optionalAuthMiddleware } from '../../middlewares/rbac.js';
import { rateLimit } from '../../middlewares/rate-limit.js';
import { ChatController } from './chat.controller.js';

// Endpoint công khai có gọi Gemini → giới hạn tần suất theo IP để chống spam đốt quota (Story 6.2 - AC6)
const messageLimiter = rateLimit({ windowMs: 60_000, max: 10, message: 'Bạn gửi tin quá nhanh, vui lòng chờ một chút' });
const historyLimiter = rateLimit({ windowMs: 60_000, max: 30, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau' });

const router = Router();

// optionalAuth: nhận diện CTV tự thử chat trên link của mình (không tạo khách)
router.post('/:code/messages', messageLimiter, optionalAuthMiddleware, ChatController.sendMessage);
router.get('/:code/sessions/:sessionId', historyLimiter, ChatController.getSession);

export const chatRoutes = router;
