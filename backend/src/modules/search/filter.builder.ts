import { ISearchOptions } from './search.service.js';
import { IResolvedLocation } from './geocoding.service.js';

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

    // 1. Phân quyền: CTV không thấy phòng đã cho thuê (RENTED)
    if (options.userRole === 'COLLABORATOR') filter.status = { $ne: 'RENTED' };
    if (options.status) filter.status = options.status;

    // 2. Lọc theo Quận/Huyện (chỉ áp dụng nếu không tìm theo điểm mốc)
    const targetDistrict = options.district || recognizedDistrict || resolvedLandmark?.district;
    if (targetDistrict && !resolvedLandmark) {
      filter['location.district'] = new RegExp(targetDistrict, 'i');
    }

    // 3. Lọc theo Khoảng giá (Story 4.3 1-Tap Faceted Price Range)
    if (options.priceRange) {
      filter.price = {};
      if (options.priceRange === 'under_5m') {
        filter.price.$lte = 5000000;
      } else if (options.priceRange === '5m_8m') {
        filter.price.$gte = 5000000;
        filter.price.$lte = 8000000;
      } else if (options.priceRange === '8m_12m') {
        filter.price.$gte = 8000000;
        filter.price.$lte = 12000000;
      } else if (options.priceRange === 'above_12m') {
        filter.price.$gte = 12000000;
      }
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
            { title: /duplex|gác xép|gác lửng/i },
            { description: /duplex|gác xép|gác lửng/i },
          ],
        });
      }
    } else if (options.bedrooms) {
      filter['attributes.bedrooms'] = Number(options.bedrooms);
    }

    if (options.furnishing) filter['attributes.furnishing'] = options.furnishing;

    // 5. Lọc theo Tiện ích Hot (Hot Amenities Facets)
    if (options.elevator !== undefined) filter['attributes.elevator'] = Boolean(options.elevator);
    if (options.allowPets !== undefined) filter['attributes.allowPets'] = Boolean(options.allowPets);
    if (options.carParking !== undefined) filter['attributes.carParking'] = Boolean(options.carParking);
    if (options.balcony !== undefined) filter['attributes.balcony'] = Boolean(options.balcony);
    if (options.pcccStandard !== undefined) filter['attributes.pcccStandard'] = Boolean(options.pcccStandard);

    // 6. Gộp các điều kiện mở rộng từ tiếng lóng BĐS
    if (expandedConditions.length > 0) {
      filter.$and = filter.$and || [];
      filter.$and.push(...expandedConditions);
    }

    return filter;
  }
}

