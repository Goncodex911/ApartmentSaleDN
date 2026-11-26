import '../config/env.js';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Apartment, locationPrecision } from '../modules/apartments/apartment.model.js';
import { geocodeStreet } from '../modules/search/street-geocoder.js';
import { ADDRESS_PLACEHOLDER } from '../utils/street.js';

/**
 * Story 15.6: định vị lại theo TÊN ĐƯỜNG các căn đang ở vị trí ước lượng (AREA: điểm mốc / tâm quận).
 * Không đụng căn có link Google Maps / ghim tay (EXACT). Gọi Nominatim qua hàng đợi 1 request/giây + cache (cùng tên đường chỉ gọi 1 lần).
 * Mặc định CHẠY THỬ (chỉ đếm, KHÔNG gọi Nominatim):  npm run geocode-streets
 * Ghi vào DB:                                          npm run geocode-streets -- --apply
 */
const apply = process.argv.includes('--apply');
await connectDB();

const candidates = (
  // Story 19.4: bỏ căn đã xóa và chuỗi giữ chỗ "Đang cập nhật địa chỉ" (không gửi lên Nominatim)
  await Apartment.find(
    { deletedAt: null, 'location.street': { $exists: true, $nin: ['', ADDRESS_PLACEHOLDER] } },
    { title: 1, 'location.street': 1, 'location.district': 1, 'location.mapUrl': 1, 'location.geoPrecision': 1 }
  ).lean()
).filter((apartment) => locationPrecision(apartment.location) === 'AREA');
const streets = new Set(candidates.map((a) => `${a.location.street}|${a.location.district}`));
console.log(`${apply ? 'GHI DB' : 'CHẠY THỬ'}: ${candidates.length} căn đang ở vị trí ước lượng có tên đường — ${streets.size} tên đường khác nhau (~${streets.size} giây gọi Nominatim)`);

if (apply) {
  let updated = 0;
  for (const apartment of candidates) {
    const coordinates = await geocodeStreet(apartment.location.street, apartment.location.district);
    if (!coordinates) continue;
    // timestamps: false → không đổi updatedAt (căn không bị coi là vừa cập nhật)
    await Apartment.updateOne({ _id: apartment._id }, { $set: { 'location.coordinates': coordinates, 'location.geoPrecision': 'STREET' } }, { timestamps: false });
    updated++;
  }
  console.log(`✅ Đã định vị theo tên đường ${updated}/${candidates.length} căn (còn lại giữ vị trí ước lượng)`);
} else {
  console.log('Chưa gọi Nominatim, chưa ghi gì. Kiểm tra rồi chạy lại với --apply');
}
await mongoose.disconnect();
