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
  minArea?: number; // Story 20.7: diện tích m², nửa mở [min, max)
  maxArea?: number;
  status?: string;
  bedrooms?: number;
  furnishing?: string;
  zones?: string[]; // Story 8.4
  propertyTypes?: string[];
  page?: number;
  limit?: number;
  userRole?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  landmark?: string;
  needsLocation?: boolean; // Story 15.7: [Quản lý] chỉ căn chưa có vị trí chính xác
  bbox?: [number, number, number, number]; // Story 15.3: [minLng, minLat, maxLng, maxLat] — chỉ dùng cho ghim bản đồ
  // Faceted Filter Options (Story 4.3)
  priceRange?: string;
  roomType?: string;
  elevator?: boolean;
  allowPets?: boolean;
  carParking?: boolean;
  balcony?: boolean;
  pcccStandard?: boolean;
  nearBeach?: boolean; // Story 7.2: cách biển ≤ 1km
  pool?: boolean;
  gym?: boolean; // Story 8.5
  bathtub?: boolean;
  riverView?: boolean;
  seaView?: boolean;
  sauna?: boolean;
}

const KM_IN_QUERY = /(\d+(?:[.,]\d+)?)\s*km\b/i;
const MIN_RADIUS_KM = 0.5;
const MAX_RADIUS_KM = 20;
const EARTH_RADIUS_KM = 6378.1; // $centerSphere tính bán kính theo radian

export class SearchService {
  /**
   * Tìm kiếm thông minh: Tìm kiếm mờ, tiếng lóng BĐS, bán kính GPS & Bộ lọc 1-chạm
   */
  /**
   * Bước 1–3 dùng chung cho danh sách và bản đồ (Story 11.2): bóc tiếng lóng, nhận diện điểm mốc / toạ độ,
   * dựng điều kiện lọc MongoDB.
   */
  public static buildContext(options: ISearchOptions) {
    // Story 15.4: "gần Cầu Rồng 2km" → bán kính 2km; bỏ cụm km khỏi từ khóa (trước đây "2km" thành từ bắt buộc → 0 kết quả)
    const kmMatch = (options.q || '').match(KM_IN_QUERY);
    const queryRaw = (options.q || '').replace(KM_IN_QUERY, ' ').replace(/\s+/g, ' ').trim();
    const radiusFromText = kmMatch ? Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, parseFloat(kmMatch[1].replace(',', '.')))) : undefined;
    // 1. Bóc tách tiếng lóng, từ đồng nghĩa & lỗi chính tả
    const { expandedConditions, recognizedDistrict } = QueryAnalyzer.analyze(queryRaw);

    // 2. Nhận diện điểm mốc hoặc tọa độ tìm kiếm
    let resolvedLandmark: IResolvedLocation | null = null;
    if (options.landmark) {
      resolvedLandmark = GeocodingService.resolveCoordinates(options.landmark, { landmarksOnly: true });
    } else if (options.lng !== undefined && options.lat !== undefined) {
      resolvedLandmark = { name: 'Vị trí đã chọn', coordinates: [Number(options.lng), Number(options.lat)] };
    } else if (queryRaw) {
      resolvedLandmark = GeocodingService.resolveCoordinates(queryRaw, { landmarksOnly: true });
    }
    const radiusKm = options.radiusKm ? Number(options.radiusKm) : resolvedLandmark ? (radiusFromText ?? 2) : undefined;

    // 3. Xây dựng điều kiện lọc bằng FilterBuilder
    const filter = FilterBuilder.build(options, recognizedDistrict, expandedConditions, resolvedLandmark);
    return { queryRaw, recognizedDistrict, resolvedLandmark, radiusKm, filter };
  }

  public static async search(options: ISearchOptions) {
    const startTime = Date.now();
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(options.limit) || 12));
    const skip = (page - 1) * limit;
    const { queryRaw, recognizedDistrict, resolvedLandmark, radiusKm, filter } = this.buildContext(options);

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
  /** Câu tự nhiên → tiêu chí tìm kiếm (dùng chung cho danh sách và ghim bản đồ — Story 19.7) */
  public static async naturalOptions(rawQuery: string, options: ISearchOptions) {
    const analysis = await NaturalSearchService.analyze(rawQuery);
    const searchOptions: ISearchOptions = {
      ...options,
      ...analysis.extracted,
      userRole: options.userRole, // Đặt sau cùng: kết quả AI không bao giờ được ghi đè quyền người dùng
      // Giữ các từ khóa có nghĩa chưa được bóc thành tiêu chí (VD tên phường "Mỹ An", tên đường) → vẫn lọc theo chữ
      q: QueryAnalyzer.analyze(rawQuery).cleanedQuery || undefined,
    };
    return { analysis, searchOptions };
  }

  public static async searchNatural(rawQuery: string, options: ISearchOptions) {
    const { analysis, searchOptions } = await this.naturalOptions(rawQuery, options);
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

    // Story 19.11: lấy đúng các căn trong bán kính bằng truy vấn địa lý (index 2dsphere) — trước đây lấy 100 căn bất kỳ
    // rồi mới tính khoảng cách nên bỏ sót căn gần nằm ngoài 100 dòng đầu
    const candidates = await Apartment.find({
      ...filter,
      'location.coordinates': { $geoWithin: { $centerSphere: [coordinates, radiusKm / EARTH_RADIUS_KM] } },
    }).limit(1000);
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
            path: ['title', 'description', 'location.address', 'location.district', 'location.buildingName'],
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
