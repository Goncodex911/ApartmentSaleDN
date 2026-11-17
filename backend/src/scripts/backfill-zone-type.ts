import '../config/env.js';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Apartment } from '../modules/apartments/apartment.model.js';
import { deriveZone } from '../modules/search/district.js';
import { inferPropertyType } from '../modules/apartments/listing-taxonomy.js';

/**
 * Story 8.4: gán khu vực (location.zone) và loại căn (attributes.propertyType) cho căn CHƯA có 2 trường này.
 * Chỉ THÊM trường — không sửa / xóa trường nào khác, chạy lại nhiều lần vẫn an toàn.
 * Mặc định CHẠY THỬ (chỉ in kết quả):  npm run backfill-zone-type
 * Ghi vào DB:                          npm run backfill-zone-type -- --apply
 */
const apply = process.argv.includes('--apply');
await connectDB();

const apartments = await Apartment.find(
  { $or: [{ 'location.zone': { $exists: false } }, { 'attributes.propertyType': { $exists: false } }] },
  { title: 1, description: 1, location: 1, 'attributes.propertyType': 1 }
).lean();

const updates = apartments.map((apartment) => {
  const set: Record<string, string> = {};
  if (!apartment.location?.zone) set['location.zone'] = deriveZone(apartment.location || {});
  if (!apartment.attributes?.propertyType) {
    set['attributes.propertyType'] = inferPropertyType(apartment.title) || inferPropertyType(apartment.description) || 'APARTMENT';
  }
  return { apartment, set };
});

console.log(`${apply ? 'GHI DB' : 'CHẠY THỬ'}: ${updates.length} căn cần gán khu vực / loại căn`);
for (const { apartment, set } of updates.slice(0, 20)) {
  console.log(`- ${apartment.title.slice(0, 50)} | ${apartment.location?.district} → ${JSON.stringify(set)}`);
}

if (apply && updates.length) {
  const result = await Apartment.bulkWrite(
    // timestamps: false → không đổi updatedAt, căn cũ không bị coi là vừa cập nhật
    updates.map(({ apartment, set }) => ({ updateOne: { filter: { _id: apartment._id }, update: { $set: set }, timestamps: false } }))
  );
  console.log(`✅ Đã cập nhật ${result.modifiedCount} căn`);
} else if (!apply) {
  console.log('Chưa ghi gì. Kiểm tra kết quả trên rồi chạy lại với --apply');
}
await mongoose.disconnect();
