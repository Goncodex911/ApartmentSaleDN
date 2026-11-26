import { ISearchOptions } from './search.service.js';
import { IResolvedLocation } from './geocoding.service.js';
import { buildDiacriticRegex, NEAR_BEACH_CONDITION, POOL_CONDITION, AMENITY_CONDITIONS, NEW_AMENITY_KEYS } from './slang.dictionary.js';
import { removeVietnameseTones } from '../../utils/vietnamese.js';
import { buildStatusFilter, isPrivilegedRole } from '../apartments/apartment.model.js';

// Khoảng giá 1-chạm theo mặt bằng Đà Nẵng: [tối thiểu, tối đa] VNĐ/tháng ("above_12m" giữ cho link cũ)
const PRICE_RANGES: Record<string, [number, number?]> = {
  under_5m: [0, 5_000_000],
  '5m_8m': [5_000_000, 8_000_000],
  '8m_12m': [8_000_000, 12_000_000],
  '12m_20m': [12_000_000, 20_000_000],
  above_20m: [20_000_000],
  above_12m: [12_000_000],
};

export class FilterBuilder {
  /**
   * Xây dựng MongoDB filter từ các tiêu chí tìm kiếm mờ & bộ lọc 1-chạm (Faceted Filter)
   */
  public static build(
    options: ISearchOptions,
    recognizedDistrict?: string,
    expandedConditions: any[] = [],
    resolvedLandmark: IResolvedLocation | null = null
  ): any {
    const filter: any = {};

    // 1. Phân quyền: CTV & khách vãng lai không bao giờ thấy căn đã cho thuê (kể cả khi tự truyền status=RENTED)
    const statusFilter = buildStatusFilter(options.status, options.userRole);
    if (statusFilter) filter.status = statusFilter;

    // 2. Lọc theo Quận/Huyện (chỉ áp dụng nếu không tìm theo điểm mốc)
    const targetDistrict = options.district || recognizedDistrict || resolvedLandmark?.district;
    if (targetDistrict && !resolvedLandmark) {
      // Không phân biệt dấu ("Hai Chau" ≈ "Hải Châu"); buildDiacriticRegex tự escape ký tự đặc biệt
      // → chống regex injection & ReDoS (district có thể đến từ người dùng/AI chat công khai)
      filter['location.district'] = new RegExp(buildDiacriticRegex(removeVietnameseTones(targetDistrict)), 'i');
    }

    // 3. Lọc theo Khoảng giá (Story 4.3 1-Tap Faceted Price Range)
    const range = options.priceRange && Object.hasOwn(PRICE_RANGES, options.priceRange) ? PRICE_RANGES[options.priceRange] : undefined;
    if (range) {
      filter.price = { $gte: range[0] };
      if (range[1] !== undefined) filter.price.$lt = range[1]; // Story 14.8: [min, max) — căn đúng 8tr chỉ thuộc "8–12tr", khớp Dashboard
    } else if (options.minPrice !== undefined || options.maxPrice !== undefined) {
      filter.price = {};
      if (options.minPrice !== undefined) filter.price.$gte = Number(options.minPrice);
      if (options.maxPrice !== undefined) filter.price.$lte = Number(options.maxPrice);
    }

    // 4. Lọc theo Loại phòng (Room Type Facet)
    if (options.roomType) {
      if (options.roomType === 'studio') {
        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [
            { 'attributes.propertyType': 'STUDIO' },
            { 'attributes.bedrooms': 0 },
            { title: /studio/i },
            { description: /studio/i },
          ],
        });
      } else if (options.roomType === '1pn') {
        filter['attributes.bedrooms'] = 1;
      } else if (options.roomType === '2pn') {
        filter['attributes.bedrooms'] = 2;
      } else if (options.roomType === 'duplex') {
        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [
            { 'attributes.propertyType': 'DUPLEX' },
            { title: /duplex|gác xép|gác lửng/i },
            { description: /duplex|gác xép|gác lửng/i },
          ],
        });
      }
    } else if (options.bedrooms !== undefined && options.bedrooms !== null && String(options.bedrooms) !== '' && Number.isFinite(Number(options.bedrooms))) {
      // Story 19.6: 0 (Studio) là giá trị lọc hợp lệ
      filter['attributes.bedrooms'] = Number(options.bedrooms);
    }

    if (options.furnishing) filter['attributes.furnishing'] = options.furnishing;
    // Story 15.7: [Quản lý] căn chưa có vị trí chính xác (theo tên đường / khu vực; căn cũ không có link Maps) để bổ sung dần
    if (options.needsLocation && isPrivilegedRole(options.userRole)) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { 'location.geoPrecision': { $in: ['STREET', 'AREA'] } },
          { 'location.geoPrecision': { $exists: false }, 'location.mapUrl': { $in: [null, ''] } },
        ],
      });
    }
    // Story 8.4: chip Khu vực & Loại căn (chọn nhiều) — giá trị đã lọc theo danh mục ở controller
    if (options.zones?.length) filter['location.zone'] = { $in: options.zones };
    if (options.propertyTypes?.length) filter['attributes.propertyType'] = { $in: options.propertyTypes };

    // 5. Lọc theo Tiện ích Hot (Hot Amenities Facets)
    if (options.elevator !== undefined) filter['attributes.elevator'] = Boolean(options.elevator);
    if (options.allowPets !== undefined) filter['attributes.allowPets'] = Boolean(options.allowPets);
    if (options.carParking !== undefined) filter['attributes.carParking'] = Boolean(options.carParking);
    if (options.balcony !== undefined) filter['attributes.balcony'] = Boolean(options.balcony);
    if (options.pcccStandard !== undefined) filter['attributes.pcccStandard'] = Boolean(options.pcccStandard);

    // Tiện ích Đà Nẵng (Story 7.2): tính cả căn cũ chỉ ghi bằng chữ trong mô tả
    const marketConditions = [
      options.nearBeach && NEAR_BEACH_CONDITION,
      options.pool && POOL_CONDITION,
      ...NEW_AMENITY_KEYS.map((key) => options[key] && AMENITY_CONDITIONS[key]), // Story 8.5
    ].filter(Boolean);
    if (marketConditions.length > 0) {
      filter.$and = filter.$and || [];
      filter.$and.push(...marketConditions);
    }

    // 6. Gộp các điều kiện mở rộng từ tiếng lóng BĐS
    if (expandedConditions.length > 0) {
      filter.$and = filter.$and || [];
      filter.$and.push(...expandedConditions);
    }

    return filter;
  }
}

