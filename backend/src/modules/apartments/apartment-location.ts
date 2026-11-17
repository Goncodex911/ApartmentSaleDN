import { IApartment } from './apartment.model.js';
import { GeocodingService } from '../search/geocoding.service.js';
import { canonicalDistrict } from '../search/district.js';
import { splitAddress } from '../../utils/street.js';
import { resolveMapCoordinates } from '../../utils/google-maps.js';

// Phần vị trí trong payload tạo/sửa căn (sửa căn: null = xóa trắng ô)
export interface LocationInput {
  address?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  mapUrl?: string | null;
  district?: string | null;
  coordinates?: [number, number] | null;
}

/**
 * Chuẩn hóa vị trí trước khi lưu (dùng cho cả tạo mới và sửa; `current` = vị trí đang lưu khi sửa):
 * 1. Quận → tên chuẩn ("nhs" → "Ngũ Hành Sơn").
 * 2. Story 8.3: address (nội bộ) = số nhà/kiệt + tên đường; client cũ chỉ gửi address → tự tách tên đường.
 * 3. Tọa độ: link Google Maps (chính xác) > ước lượng theo địa chỉ / quận. Chỉ tính lại khi có thay đổi,
 *    và không ghi đè tọa độ đã lấy từ link map bằng tọa độ ước lượng.
 */
export async function prepareLocation(input: LocationInput, current?: IApartment['location']): Promise<void> {
  if (input.district) input.district = canonicalDistrict(input.district) || input.district;

  if (input.street || input.houseNumber !== undefined) {
    const saved = { ...splitAddress(current?.address), ...(current?.street && { street: current.street, houseNumber: current.houseNumber }) };
    const street = input.street || saved.street;
    const houseNumber = input.houseNumber === undefined ? saved.houseNumber : input.houseNumber;
    input.address = [houseNumber, street].filter(Boolean).join(' ');
  } else if (input.address && !current) {
    input.street = splitAddress(input.address).street;
  }
  if (!current && !input.address) throw { status: 400, message: 'Tên đường không được để trống' };

  if (input.coordinates?.length === 2) return;
  if (input.mapUrl && input.mapUrl !== current?.mapUrl) {
    const fromMap = await resolveMapCoordinates(input.mapUrl);
    if (fromMap) {
      input.coordinates = fromMap;
      return;
    }
  }
  const addressChanged =
    !current || (input.address && input.address !== current.address) || (input.district && input.district !== current.district);
  const keepMapCoordinates = Boolean(current?.mapUrl) && input.mapUrl === undefined;
  if (!addressChanged || keepMapCoordinates) return;

  const geo =
    GeocodingService.resolveCoordinates(input.address || current?.address || '') ||
    GeocodingService.resolveCoordinates(input.district || current?.district || '');
  if (geo) input.coordinates = geo.coordinates;
}

/** Căn cũ (trước Story 8.3) chưa có tên đường → tách từ địa chỉ khi trả dữ liệu, không ghi DB. */
export function withStreet<T extends { address?: string; street?: string; houseNumber?: string }>(location: T): T {
  if (!location || location.street) return location;
  return { ...location, ...splitAddress(location.address) };
}
