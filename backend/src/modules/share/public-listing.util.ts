import { IApartment } from '../apartments/apartment.model.js';
import { IUser } from '../auth/user.model.js';
import { getVisibleImages } from './photo.service.js';
import { stripPhoneNumbers } from '../../utils/phone-text.js';

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

// Làm tròn tọa độ theo lưới ~500m (0.005°) để khách chỉ thấy khu vực chung, không định vị được nhà
const COORDINATE_GRID = 0.005;
const roundToGrid = (value: number) => Number((Math.round(value / COORDINATE_GRID) * COORDINATE_GRID).toFixed(3));

type PublicCtv = Pick<IUser, 'name' | 'phone' | 'zaloPhone' | 'zaloLink' | 'avatarUrl' | 'greetingMessage'>;

/**
 * DTO công khai cho khách (Story 5.3 - AC4): chỉ gồm các trường trong danh sách trắng.
 * KHÔNG trả về ownerContact, subListings, commission, description, address, tọa độ gốc.
 */
export function toPublicListing(apartment: IApartment, ctv: PublicCtv) {
  const coordinates = apartment.location.coordinates;
  const { attributes, fees } = apartment;

  return {
    title: stripPhoneNumbers(apartment.title),
    price: apartment.price,
    deposit: apartment.deposit,
    fees: {
      electricity: fees?.electricity,
      water: fees?.water,
      service: fees?.service,
      parkingMotor: fees?.parkingMotor,
    },
    attributes: {
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
    },
    location: {
      ward: apartment.location.ward,
      district: apartment.location.district,
      city: apartment.location.city,
      approximateCenter: coordinates?.length === 2 ? [roundToGrid(coordinates[0]), roundToGrid(coordinates[1])] : null,
    },
    images: getVisibleImages(apartment),
    status: apartment.status,
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
