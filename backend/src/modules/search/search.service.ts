import { Apartment } from '../apartments/apartment.model.js';
import { ApartmentService } from '../apartments/apartment.service.js';
import { QueryAnalyzer } from './query-analyzer.js';
import { GeocodingService, IResolvedLocation } from './geocoding.service.js';
import { FilterBuilder } from './filter.builder.js';
import { NaturalSearchService } from './natural-search.service.js';

export interface ISearchOptions {
  q?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  bedrooms?: number;
  furnishing?: string;
  page?: number;
  limit?: number;
  userRole?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  landmark?: string;
  // Faceted Filter Options (Story 4.3)
  priceRange?: string;
  roomType?: string;
  elevator?: boolean;
  allowPets?: boolean;
  carParking?: boolean;
  balcony?: boolean;
  pcccStandard?: boolean;
}

export class SearchService {
  /**
   * Tìm kiếm thông minh: Tìm kiếm mờ, tiếng lóng BĐS, bán kính GPS & Bộ lọc 1-chạm
   */
  public static async search(options: ISearchOptions) {
    const startTime = Date.now();
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(options.limit) || 12));
    const skip = (page - 1) * limit;
    const queryRaw = (options.q || '').trim();

    // 1. Bóc tách tiếng lóng, từ đồng nghĩa & lỗi chính tả
    const { expandedConditions, recognizedDistrict } = QueryAnalyzer.analyze(queryRaw);

    // 2. Nhận diện điểm mốc hoặc tọa độ tìm kiếm
    let resolvedLandmark: IResolvedLocation | null = null;
    if (options.landmark) {
      resolvedLandmark = GeocodingService.resolveCoordinates(options.landmark);
    } else if (options.lng !== undefined && options.lat !== undefined) {
      resolvedLandmark = { name: 'Vị trí đã chọn', coordinates: [Number(options.lng), Number(options.lat)] };
    } else if (queryRaw) {
      resolvedLandmark = GeocodingService.resolveCoordinates(queryRaw);
    }

    const radiusKm = options.radiusKm ? Number(options.radiusKm) : (resolvedLandmark ? 2 : undefined);

    // 3. Xây dựng điều kiện lọc bằng FilterBuilder
    const filter = FilterBuilder.build(options, recognizedDistrict, expandedConditions, resolvedLandmark);

    let items: any[] = [];
    let total = 0;
    let engineUsed = 'REGEX_FALLBACK';

    // 4. Tìm kiếm theo bán kính không gian ($geoNear 2dsphere) nếu có tọa độ
    if (resolvedLandmark && radiusKm) {
      const geoResult = await this.searchByGeoRadius(resolvedLandmark.coordinates, radiusKm, filter, skip, limit);
      items = geoResult.items;
      total = geoResult.total;
      engineUsed = geoResult.engine;
    } else if (queryRaw) {
      try {
        const atlasResults = await this.tryAtlasSearch(queryRaw, filter, skip, limit);
        if (atlasResults && atlasResults.items.length > 0) {
          items = atlasResults.items;
          total = atlasResults.total;
          engineUsed = 'ATLAS_SEARCH';
        }
      } catch (_e) {}
    }

    // 5. Fallback tìm kiếm tiêu chuẩn
    if (engineUsed === 'REGEX_FALLBACK' && (!resolvedLandmark || items.length === 0)) {
      [items, total] = await Promise.all([
        Apartment.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
        Apartment.countDocuments(filter),
      ]);
    }

    // 6. Gắn thông tin khoảng cách (distanceKm) và Masking dữ liệu CTV
    const targetCoords = resolvedLandmark?.coordinates;
    const maskedItems = items.map((doc: any) => {
      const masked = ApartmentService.maskApartment(doc, options.userRole);
      const coords = doc.location?.coordinates;
      let distKm = doc.distanceKm;

      if (distKm === undefined && targetCoords && coords?.length === 2) {
        distKm = GeocodingService.haversineDistanceKm(targetCoords, [coords[0], coords[1]]);
      }
      if (distKm !== undefined) {
        masked.distanceKm = distKm;
        masked.nearestLandmark = resolvedLandmark?.name;
      }
      return masked;
    });

    return {
      items: maskedItems,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
      meta: {
        query: queryRaw,
        recognizedDistrict,
        landmark: resolvedLandmark ? { name: resolvedLandmark.name, coordinates: resolvedLandmark.coordinates, radiusKm } : null,
        latencyMs: Date.now() - startTime,
        engineUsed,
      },
    };
  }

  /**
   * Tìm kiếm bằng câu tự nhiên AI (Story 4.4): Bóc tách thực thể và tự động áp dụng bộ lọc
   */
  public static async searchNatural(rawQuery: string, options: ISearchOptions) {
    const analysis = await NaturalSearchService.analyze(rawQuery);
    const searchOptions: ISearchOptions = {
      ...options,
      ...analysis.extracted,
      userRole: options.userRole, // Đặt sau cùng: kết quả AI không bao giờ được ghi đè quyền người dùng
      q: undefined, // Không match nguyên câu văn vào title
    };

    const searchResult = await this.search(searchOptions);
    return {
      ...searchResult,
      naturalAnalysis: {
        rawQuery,
        engineUsed: analysis.engineUsed,
        extracted: analysis.extracted,
        badges: analysis.badges,
        summary: analysis.summary,
      },
    };
  }

  /**
   * Truy vấn không gian địa lý bằng MongoDB $geoNear (index 2dsphere) kèm fallback Haversine
   */
  private static async searchByGeoRadius(
    coordinates: [number, number],
    radiusKm: number,
    filter: any,
    skip: number,
    limit: number
  ): Promise<{ items: any[]; total: number; engine: string }> {
    const maxDistanceMeters = radiusKm * 1000;
    try {
      const pipeline: any[] = [
        {
          $geoNear: {
            near: { type: 'Point', coordinates },
            distanceField: 'distanceMeters',
            maxDistance: maxDistanceMeters,
            spherical: true,
            query: filter,
          },
        },
        {
          $facet: {
            results: [{ $skip: skip }, { $limit: limit }],
            totalCount: [{ $count: 'count' }],
          },
        },
      ];

      const [aggResult] = await Apartment.aggregate(pipeline);
      if (aggResult && Array.isArray(aggResult.results)) {
        const items = aggResult.results.map((item: any) => ({
          ...item,
          distanceKm: Number(((item.distanceMeters || 0) / 1000).toFixed(2)),
        }));
        const total = aggResult.totalCount?.[0]?.count || items.length;
        return { items, total, engine: 'GEOSPATIAL_2DSPHERE' };
      }
    } catch (_err) {}

    const candidates = await Apartment.find(filter).limit(100);
    const matched = candidates
      .map((item) => {
        const coords = item.location?.coordinates;
        if (!coords || coords.length !== 2) return null;
        const distKm = GeocodingService.haversineDistanceKm(coordinates, [coords[0], coords[1]]);
        return distKm <= radiusKm ? { ...item.toObject(), distanceKm: distKm } : null;
      })
      .filter((x): x is any => x !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return {
      items: matched.slice(skip, skip + limit),
      total: matched.length,
      engine: 'GEOSPATIAL_HAVERSINE_FALLBACK',
    };
  }

  /**
   * Thử gọi MongoDB Atlas Search ($search) nếu cluster hỗ trợ
   */
  private static async tryAtlasSearch(
    q: string,
    filter: any,
    skip: number,
    limit: number
  ): Promise<{ items: any[]; total: number } | null> {
    const pipeline: any[] = [
      {
        $search: {
          index: 'default',
          text: {
            query: q,
            path: ['title', 'description', 'location.address', 'location.district'],
            fuzzy: { maxEdits: 1, prefixLength: 1 },
          },
        },
      },
    ];
    // Áp dụng TOÀN BỘ điều kiện lọc (quận, giá, tiện ích, phân quyền status) — trước đây chỉ lọc status
    if (Object.keys(filter).length > 0) pipeline.push({ $match: filter });
    pipeline.push({
      $facet: {
        results: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
      },
    });

    const [aggResult] = await Apartment.aggregate(pipeline);
    if (!aggResult || !Array.isArray(aggResult.results)) return null;

    return { items: aggResult.results || [], total: aggResult.totalCount?.[0]?.count || 0 };
  }
}
