import '../config/env.js';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Apartment } from '../modules/apartments/apartment.model.js';
import { maskPhonesInText } from '../utils/phone-text.js';

/**
 * Story 20.5 AC5: liệt kê căn có link Google Maps nhưng toạ độ KHÔNG chính xác (link không đọc được lúc lưu)
 * → Admin ghim lại ở /admin/map-qa. CHỈ ĐỌC, không ghi DB. Chạy: npm run audit-map-links
 */
await connectDB();

const apartments = await Apartment.find(
  { 'location.mapUrl': { $nin: [null, ''] }, 'location.geoPrecision': { $ne: 'EXACT' } },
  { title: 1, 'location.geoPrecision': 1 }
).lean();

console.log(`CHỈ ĐỌC: ${apartments.length} căn có link Google Maps nhưng vị trí chưa chính xác — xử lý tại /admin/map-qa`);
for (const apartment of apartments) {
  console.log(`- ${apartment._id} | ${apartment.location.geoPrecision ?? 'chưa có'} | ${maskPhonesInText(apartment.title).slice(0, 60)}`);
}
await mongoose.disconnect();
