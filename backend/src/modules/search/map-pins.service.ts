import { Apartment, locationPrecision } from '../apartments/apartment.model.js';
import { withStreet } from '../apartments/apartment-location.js';
import { ISearchOptions, SearchService } from './search.service.js';

const MAX_PINS = 500;
const EARTH_RADIUS_KM = 6378.1;

/**
 * Ghim bản đồ (Story 11.2): cùng bộ lọc với danh sách nhưng chỉ trả dữ liệu nhẹ, tối đa 500 căn, không phân trang.
 * Không trả SĐT / ghi chú chủ nhà; quyền xem căn RENTED theo vai trò giống danh sách (buildStatusFilter trong FilterBuilder).
 */
export async function findMapPins(options: ISearchOptions) {
  const { filter, resolvedLandmark, radiusKm } = SearchService.buildContext(options);
  const { bbox } = options;
  // Story 15.3: tìm theo khung nhìn thay cho bán kính điểm mốc. $box tính phẳng — sai số không đáng kể trong 1 thành phố
  const byLandmark = !bbox && resolvedLandmark && radiusKm ? { center: resolvedLandmark, radiusKm } : null;
  if (bbox) {
    filter['location.coordinates'] = { $geoWithin: { $box: [[bbox[0], bbox[1]], [bbox[2], bbox[3]]] } };
  } else if (byLandmark) {
    // Có điểm mốc → giới hạn trong bán kính (find thường, không cần $geoNear vì bản đồ không sắp theo khoảng cách)
    filter['location.coordinates'] = { $geoWithin: { $centerSphere: [byLandmark.center.coordinates, byLandmark.radiusKm / EARTH_RADIUS_KM] } };
  }
  const hasCoordinates = { 'location.coordinates.1': { $exists: true } };
  const [items, withoutLocation] = await Promise.all([
    Apartment.find({ ...filter, ...hasCoordinates })
      .select('price priceUsd status title images hiddenImages location.coordinates location.street location.address location.zone location.district location.mapUrl location.geoPrecision attributes.propertyType attributes.bedrooms')
      .sort({ updatedAt: -1 })
      .limit(MAX_PINS)
      .lean(),
    bbox || byLandmark ? 0 : Apartment.countDocuments({ ...filter, 'location.coordinates.1': { $exists: false } }),
  ]);

  return {
    pins: items.map(({ _id, price, priceUsd, status, images, hiddenImages, location, attributes }) => ({
      _id,
      price,
      priceUsd,
      status,
      coordinates: location.coordinates,
      street: withStreet(location).street, // Chỉ tên đường, không số nhà (Story 8.3)
      zone: location.zone,
      district: location.district,
      propertyType: attributes.propertyType,
      bedrooms: attributes.bedrooms,
      image: images?.find((url) => !hiddenImages?.includes(url) && !url.includes('/video/upload/')),
      approximate: locationPrecision(location) !== 'EXACT', // Story 15.6: theo tên đường / khu vực → viền nét đứt
    })),
    withoutLocation,
    // Story 15.4: tâm + bán kính điểm mốc đang tìm → bản đồ vẽ vòng tròn
    landmark: byLandmark ? { name: byLandmark.center.name, coordinates: byLandmark.center.coordinates, radiusKm: byLandmark.radiusKm } : null,
    truncated: items.length === MAX_PINS, // Story 15.3: khung nhìn có hơn 500 căn → nhắc phóng to
  };
}
