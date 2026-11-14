import { Response } from 'express';
import { SearchService } from './search.service.js';
import { GeocodingService } from './geocoding.service.js';
import { AuthRequest } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/async-handler.js';

// Ép kiểu tham số query: qs có thể tạo object/mảng (?x[$ne]=1) → chỉ nhận chuỗi
const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined);
const num = (value: unknown) => (text(value) !== undefined && Number.isFinite(Number(value)) ? Number(value) : undefined);
const bool = (value: unknown) => (value === 'true' ? true : value === 'false' ? false : undefined);

/**
 * Tìm kiếm bằng câu tự nhiên AI (Story 4.4) — POST & GET /api/v1/apartments/search/natural
 */
async function runNaturalSearch(req: AuthRequest, res: Response) {
  const queryText = String(req.body?.query || text(req.query.q) || '').slice(0, 300);
  const result = await SearchService.searchNatural(queryText, {
    page: num(req.query.page) ?? 1,
    limit: num(req.query.limit) ?? 12,
    userRole: req.user?.role,
  });
  res.status(200).json({
    success: true,
    data: result.items,
    pagination: result.pagination,
    naturalAnalysis: result.naturalAnalysis,
    meta: result.meta,
  });
}

export class SearchController {
  /**
   * GET /api/v1/apartments/search — Tìm kiếm mờ thông minh, hiểu tiếng lóng, bán kính GPS & Bộ lọc 1-chạm
   */
  static search = asyncHandler(async (req, res) => {
    const query = req.query;
    // Cờ ?natural=true → chuyển sang xử lý câu tự nhiên (lỗi vẫn đi qua asyncHandler của route này)
    if (query.natural === 'true' && text(query.q)) return runNaturalSearch(req, res);

    const result = await SearchService.search({
      q: text(query.q),
      district: text(query.district),
      minPrice: num(query.minPrice),
      maxPrice: num(query.maxPrice),
      status: text(query.status),
      bedrooms: num(query.bedrooms),
      furnishing: text(query.furnishing),
      page: num(query.page) ?? 1,
      limit: num(query.limit) ?? 12,
      userRole: req.user?.role,
      lat: num(query.lat),
      lng: num(query.lng),
      radiusKm: num(query.radiusKm),
      landmark: text(query.landmark),
      priceRange: text(query.priceRange),
      roomType: text(query.roomType),
      elevator: bool(query.elevator),
      allowPets: bool(query.allowPets),
      carParking: bool(query.carParking),
      balcony: bool(query.balcony),
      pcccStandard: bool(query.pcccStandard),
    });
    res.status(200).json({ success: true, data: result.items, pagination: result.pagination, meta: result.meta });
  });

  static searchNatural = asyncHandler(runNaturalSearch);

  /**
   * GET /api/v1/apartments/search/landmarks — Danh sách trường đại học, bệnh viện & tòa nhà văn phòng tại Hà Nội
   */
  static getLandmarks = asyncHandler(async (_req, res) => {
    res.status(200).json({ success: true, data: GeocodingService.getLandmarks() });
  });
}
