import { IApartment, locationPrecision } from '../apartments/apartment.model.js';
import { GeocodingService } from '../search/geocoding.service.js';
import { POIS, PoiGroup } from '../search/landmarks.data.js';
import { IUser } from '../auth/user.model.js';
import { getVisibleImages } from './photo.service.js';
import { stripPhoneNumbers } from '../../utils/phone-text.js';
import { withStreet } from '../apartments/apartment-location.js';
import { usdToVndRate } from '../../config/currency.js';

/** Slug dễ đọc từ tiêu đề: bỏ dấu tiếng Việt, tối đa 6 từ, không chứa SĐT. */
export function slugify(title: string): string {
  const words = stripPhoneNumbers(title)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // bỏ dấu thanh tiếng Việt
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .slice(0, 6);
  return words.join('-') || 'can-ho';
}

// Story 15.5: huy hiệu khoảng cách tới tiện ích gần nhất (mỗi nhóm 1 điểm, trong 2km); đi bộ ~80m / phút
const NEARBY_GROUPS: PoiGroup[] = ['BEACH', 'MARKET', 'NIGHTLIFE'];
const NEARBY_MAX_KM = 2;
const WALK_M_PER_MIN = 80;
const WALK_MAX_M = 1500;

function nearbyHighlights(coordinates: [number, number]) {
  return NEARBY_GROUPS.flatMap((group) => {
    const [nearest] = POIS.filter((poi) => poi.group === group)
      .map((poi) => ({ poi, km: GeocodingService.haversineDistanceKm(coordinates, poi.coordinates) }))
      .sort((a, b) => a.km - b.km);
    if (!nearest || nearest.km > NEARBY_MAX_KM) return [];
    const distanceM = Math.max(50, Math.round((nearest.km * 1000) / 50) * 50);
    return [{ group, name: nearest.poi.name, nameEn: nearest.poi.nameEn, distanceM, walkMinutes: distanceM <= WALK_MAX_M ? Math.ceil(distanceM / WALK_M_PER_MIN) : undefined }];
  });
}

type PublicCtv = Pick<IUser, 'name' | 'phone' | 'zaloPhone' | 'zaloLink' | 'avatarUrl' | 'greetingMessage'>;

/**
 * DTO công khai cho khách (Story 5.3 - AC4): chỉ gồm các trường trong danh sách trắng.
 * Story 15.5 (Project Owner chốt 21/11/2026): hiện ĐÚNG vị trí + địa chỉ đầy đủ (số nhà, tòa nhà).
 * Vẫn KHÔNG trả về ownerContact, subListings, description gốc, mapUrl.
 */
export function toPublicListing(apartment: IApartment, ctv: PublicCtv) {
  const { location } = apartment;
  const coordinates = location.coordinates?.length === 2 ? location.coordinates : null;
  const { street, houseNumber } = withStreet(location);
  const addressLine = [houseNumber, street].filter(Boolean).join(' ');
  const { attributes, fees } = apartment;

  return {
    title: stripPhoneNumbers(apartment.title),
    price: apartment.price,
    priceUsd: apartment.priceUsd,
    minLeaseMonths: apartment.minLeaseMonths,
    includedServices: apartment.includedServices || [],
    fees: {
      electricity: fees?.electricity,
      water: fees?.water,
      service: fees?.service,
      parkingMotor: fees?.parkingMotor,
    },
    attributes: {
      propertyType: attributes.propertyType,
      area: attributes.area,
      bedrooms: attributes.bedrooms,
      bathrooms: attributes.bathrooms,
      balcony: attributes.balcony,
      furnishing: attributes.furnishing,
      elevator: attributes.elevator,
      carParking: attributes.carParking,
      allowPets: attributes.allowPets,
      washingMachine: attributes.washingMachine,
      pcccStandard: attributes.pcccStandard,
      pool: attributes.pool,
      distanceToBeachM: attributes.distanceToBeachM,
      motorbikeParking: attributes.motorbikeParking,
      gym: attributes.gym,
      bathtub: attributes.bathtub,
      riverView: attributes.riverView,
      seaView: attributes.seaView,
      sauna: attributes.sauna,
    },
    location: {
      street,
      fullAddress: stripPhoneNumbers([...new Set([addressLine, location.ward, location.zone, location.city].filter(Boolean))].join(', ')),
      buildingName: location.buildingName,
      zone: location.zone,
      ward: location.ward,
      district: location.district,
      city: location.city,
      coordinates,
      precision: locationPrecision(location), // EXACT → ghim; STREET / AREA → vòng 'vị trí gần đúng'
    },
    nearby: coordinates ? nearbyHighlights(coordinates) : [],
    images: getVisibleImages(apartment),
    status: apartment.status,
    usdRate: usdToVndRate(), // Story 11.6: ước tính chi phí hiện cả USD cho khách nước ngoài
    availableDate: apartment.availableDate,
    ctv: {
      name: ctv.name,
      phone: ctv.zaloPhone || ctv.phone,
      zaloLink: ctv.zaloLink,
      avatarUrl: ctv.avatarUrl,
      greetingMessage: ctv.greetingMessage,
    },
  };
}
