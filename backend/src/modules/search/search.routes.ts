import { Router } from 'express';
import { SearchController } from './search.controller.js';
import { optionalAuthMiddleware } from '../../middlewares/rbac.js';

export const searchRoutes = Router();

// GET /api/v1/apartments/search/landmarks - Danh sách điểm mốc gợi ý
searchRoutes.get('/landmarks', optionalAuthMiddleware, SearchController.getLandmarks);

// POST & GET /api/v1/apartments/search/natural - Tìm kiếm câu tự nhiên AI (Story 4.4)
searchRoutes.post('/natural', optionalAuthMiddleware, SearchController.searchNatural);
searchRoutes.get('/natural', optionalAuthMiddleware, SearchController.searchNatural);

// GET /api/v1/apartments/search - Tìm kiếm mờ, tiếng lóng, bán kính GPS & Faceted
searchRoutes.get('/', optionalAuthMiddleware, SearchController.search);
