import { IApartment } from './apartment.model.js';
import { GeocodingService } from '../search/geocoding.service.js';
import { canonicalDistrict } from '../search/district.js';
import { splitAddress } from '../../utils/street.js';
import { resolveMapCoordinates } from '../../utils/google-maps.js';
import { OTHER_ZONE, Zone, districtOfZone } from './listing-taxonomy.js';
import { geocodeStreet } from '../search/street-geocoder.js';
import type { GeoPrecision } from './apartment.model.js';

// Phần vị trí trong payload tạo/sửa căn (sửa căn: null = xóa trắng ô)
export interface LocationInput {
  address?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  mapUrl?: string | null;
  district?: string | null;
  zone?: Zone | null;
  coordinates?: [number, number] | null;
  geoPrecision?: GeoPrecision; // Do server tính (không nhận từ client — schema zod không có trường này)
}

/**
 * Chuẩn hóa vị trí trước khi lưu (dùng cho cả tạo mới và sửa; `current` = vị trí đang lưu khi sửa):
 * 1. Story 8.4: khu vực → quận (bỏ qua quận client gửi); khu vực "Khác" bắt buộc chọn quận Đà Nẵng. Quận → tên chuẩn ("nhs" → "Ngũ Hành Sơn").
 * 2. Story 8.3: address (nội bộ) = số nhà/kiệt + tên đường; client cũ chỉ gửi address → tự tách tên đường.
 * 3. Tọa độ: ghim tay / link Google Maps (EXACT) > tên đường (STREET, Story 15.6) > điểm mốc / tâm quận (AREA). Chỉ tính lại khi có thay đổi,
 *    và không ghi đè tọa độ đã lấy từ link map bằng tọa độ ước lượng.
 */
export async function prepareLocation(input: LocationInput, current?: IApartment['location']): Promise<void> {
  if (input.zone && input.zone !== OTHER_ZONE) input.district = districtOfZone(input.zone);
  else if (input.district) input.district = canonicalDistrict(input.district) || input.district;
  if (input.zone === OTHER_ZONE && !canonicalDistrict(input.district || current?.district)) {
    throw { status: 400, message: 'Khu vực "Khác": vui lòng chọn quận' };
  }

  if (input.street || input.houseNumber !== undefined) {
    // Giá trị đang lưu; căn cũ chưa có tên đường → tách từ địa chỉ
    const saved = current?.street ? { street: current.street, houseNumber: current.houseNumber } : splitAddress(current?.address);
    const street = input.street || saved.street;
    const houseNumber = input.houseNumber === undefined ? saved.houseNumber : input.houseNumber;
    input.address = [houseNumber, street].filter(Boolean).join(' ');
  } else if (input.address && !current) {
    input.street = splitAddress(input.address).street;
  }
  if (!current && !input.address) throw { status: 400, message: 'Tên đường không được để trống' };

  // Story 15.7: tọa độ gửi lên (ghim kéo tay / GPS trong form) = vị trí chính xác
  if (input.coordinates?.length === 2) {
    input.geoPrecision = 'EXACT';
    return;
  }
  if (input.mapUrl && input.mapUrl !== current?.mapUrl) {
    const fromMap = await resolveMapCoordinates(input.mapUrl);
    if (fromMap) {
      input.coordinates = fromMap;
      input.geoPrecision = 'EXACT';
      return;
    }
  }
  const addressChanged =
    !current || (input.address && input.address !== current.address) || (input.district && input.district !== current.district);
  // Không ghi đè vị trí chính xác (link map / ghim tay) bằng tọa độ ước lượng khi chỉ sửa địa chỉ
  const keepExact = (current?.geoPrecision === 'EXACT' || Boolean(current?.mapUrl)) && input.mapUrl === undefined;
  if (!addressChanged || keepExact) return;

  const district = input.district || current?.district;
  const fromStreet = await geocodeStreet(input.street || current?.street, district); // Story 15.6: theo tên đường
  if (fromStreet) {
    input.coordinates = fromStreet;
    input.geoPrecision = 'STREET';
    return;
  }
  const geo =
    GeocodingService.resolveCoordinates(input.address || current?.address || '') ||
    GeocodingService.resolveCoordinates(district || '');
  if (geo) {
    input.coordinates = geo.coordinates;
    input.geoPrecision = 'AREA';
  }
}

/** Căn cũ (trước Story 8.3) chưa có tên đường → tách từ địa chỉ khi trả dữ liệu, không ghi DB. */
export function withStreet<T extends { address?: string; street?: string; houseNumber?: string }>(location: T): T {
  if (!location || location.street) return location;
  return { ...location, ...splitAddress(location.address) };
}
