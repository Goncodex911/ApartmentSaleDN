import { Router } from 'express';
import { SearchController } from './search.controller.js';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.js';
import { rateLimit } from '../../middlewares/rate-limit.js';

export const searchRoutes = Router();

// GET /api/v1/apartments/search/landmarks - Danh sách điểm mốc gợi ý
searchRoutes.get('/landmarks', SearchController.getLandmarks); // Công khai: chỉ danh sách điểm mốc, không có dữ liệu kho
// GET /api/v1/apartments/search/pois - Tiện ích Đà Nẵng hiển thị trên bản đồ (Story 15.4), công khai: chỉ địa điểm công cộng
searchRoutes.get('/pois', SearchController.getPois);

// POST & GET /api/v1/apartments/search/natural - Tìm kiếm câu tự nhiên AI (Story 4.4)
// Có gọi Gemini → giới hạn tần suất theo TÀI KHOẢN (Story 14.4: CTV dùng chung mạng văn phòng không chặn lẫn nhau)
const naturalLimiter = rateLimit({ windowMs: 60_000, max: 20, message: 'Bạn tìm kiếm quá nhanh, vui lòng chờ một chút', key: (req) => (req as AuthRequest).user!.id });
searchRoutes.post('/natural', authMiddleware, naturalLimiter, SearchController.searchNatural);
searchRoutes.get('/natural', authMiddleware, naturalLimiter, SearchController.searchNatural);

// GET /api/v1/apartments/search/pins - Ghim bản đồ trong app (Story 11.2), chỉ người đã đăng nhập
searchRoutes.get('/pins', authMiddleware, SearchController.pins);
// Ghim bản đồ theo câu tự nhiên (Story 19.7) — có gọi Gemini nên dùng chung giới hạn tần suất với /natural
searchRoutes.get('/pins/natural', authMiddleware, naturalLimiter, SearchController.naturalPins);

// GET /api/v1/apartments/search/geo?q= - Tìm địa chỉ / link Google Maps khi đặt vị trí căn (Story 20.4)
// Gọi Nominatim công cộng (1 req/s cho cả máy chủ) → giới hạn 20 lần / phút / tài khoản
const geoLimiter = rateLimit({ windowMs: 60_000, max: 20, message: 'Bạn tìm địa chỉ quá nhanh, vui lòng chờ một chút', key: (req) => (req as AuthRequest).user!.id });
searchRoutes.get('/geo', authMiddleware, geoLimiter, SearchController.geo);

// GET /api/v1/apartments/search - Tìm kiếm mờ, tiếng lóng, bán kính GPS & Faceted
searchRoutes.get('/', authMiddleware, SearchController.search);
