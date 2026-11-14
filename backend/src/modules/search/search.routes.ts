import { Router } from 'express';
import { SearchController } from './search.controller.js';
import { optionalAuthMiddleware } from '../../middlewares/rbac.js';
import { rateLimit } from '../../middlewares/rate-limit.js';

export const searchRoutes = Router();

// GET /api/v1/apartments/search/landmarks - Danh sách điểm mốc gợi ý
searchRoutes.get('/landmarks', optionalAuthMiddleware, SearchController.getLandmarks);

// POST & GET /api/v1/apartments/search/natural - Tìm kiếm câu tự nhiên AI (Story 4.4)
// Endpoint công khai có gọi Gemini → giới hạn tần suất theo IP chống spam đốt quota
const naturalLimiter = rateLimit({ windowMs: 60_000, max: 20, message: 'Bạn tìm kiếm quá nhanh, vui lòng chờ một chút' });
searchRoutes.post('/natural', naturalLimiter, optionalAuthMiddleware, SearchController.searchNatural);
searchRoutes.get('/natural', naturalLimiter, optionalAuthMiddleware, SearchController.searchNatural);

// GET /api/v1/apartments/search - Tìm kiếm mờ, tiếng lóng, bán kính GPS & Faceted
searchRoutes.get('/', optionalAuthMiddleware, SearchController.search);
