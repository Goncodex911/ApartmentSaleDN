import { Response, NextFunction } from 'express';
import { SearchService } from './search.service.js';
import { GeocodingService } from './geocoding.service.js';
import { AuthRequest } from '../../middlewares/auth.js';

export class SearchController {
  /**
   * GET /api/v1/apartments/search
   * Tìm kiếm mờ thông minh, hiểu tiếng lóng, bán kính GPS & Bộ lọc 1-chạm
   */
  public static async search(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const {
        q,
        district,
        minPrice,
        maxPrice,
        status,
        bedrooms,
        furnishing,
        page,
        limit,
        lat,
        lng,
        radiusKm,
        landmark,
        priceRange,
        roomType,
        elevator,
        allowPets,
        carParking,
        balcony,
        pcccStandard,
        natural,
      } = req.query;

      // Nếu có cờ ?natural=true, chuyển hướng sang xử lý câu tự nhiên
      if (natural === 'true' && q) {
        return SearchController.searchNatural(req, res, next);
      }

      const parseBool = (val: any) => (val === 'true' ? true : val === 'false' ? false : undefined);

      const result = await SearchService.search({
        q: q ? String(q) : undefined,
        district: district ? String(district) : undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        status: status ? String(status) : undefined,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        furnishing: furnishing ? String(furnishing) : undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 12,
        userRole: req.user?.role,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        radiusKm: radiusKm ? Number(radiusKm) : undefined,
        landmark: landmark ? String(landmark) : undefined,
        priceRange: priceRange ? String(priceRange) : undefined,
        roomType: roomType ? String(roomType) : undefined,
        elevator: parseBool(elevator),
        allowPets: parseBool(allowPets),
        carParking: parseBool(carParking),
        balcony: parseBool(balcony),
        pcccStandard: parseBool(pcccStandard),
      });

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST & GET /api/v1/apartments/search/natural
   * Tìm kiếm bằng câu tự nhiên AI (Story 4.4)
   */
  public static async searchNatural(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const queryText = (req.body?.query || req.query?.q || '').toString();
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 12;

      const result = await SearchService.searchNatural(queryText, {
        page,
        limit,
        userRole: req.user?.role,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
        naturalAnalysis: result.naturalAnalysis,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/apartments/search/landmarks
   * Danh sách các trường đại học, bệnh viện & tòa nhà văn phòng tại Hà Nội
   */
  public static async getLandmarks(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const landmarks = GeocodingService.getLandmarks();
      res.status(200).json({
        success: true,
        data: landmarks,
      });
    } catch (err) {
      next(err);
    }
  }
}
