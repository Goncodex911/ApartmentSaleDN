import '../config/env.js';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Apartment } from '../modules/apartments/apartment.model.js';
import { toVnPhone } from '../utils/validators.js';
import { maskPhone } from '../utils/phone-text.js';

/**
 * Story 14.1: chuẩn hóa SĐT chủ nhà đã lưu (căn + nguồn phụ) về dạng "0xxxxxxxxx".
 * SĐT không nhận ra là SĐT VN được GIỮ NGUYÊN, chỉ báo cáo. Chạy lại nhiều lần vẫn an toàn.
 * Mặc định CHẠY THỬ (chỉ in kết quả):  npm run normalize-owner-phones
 * Ghi vào DB:                          npm run normalize-owner-phones -- --apply
 */
const apply = process.argv.includes('--apply');
await connectDB();

const apartments = await Apartment.find({}, { title: 1, 'ownerContact.phone': 1, 'subListings.ownerContact.phone': 1 }).lean();

let invalid = 0;
const updates: { id: unknown; title: string; set: Record<string, string> }[] = [];
for (const apartment of apartments) {
  const set: Record<string, string> = {};
  const check = (path: string, raw?: string) => {
    if (!raw) return;
    const phone = toVnPhone(raw);
    if (!phone) invalid++;
    else if (phone !== raw) set[path] = phone;
  };
  check('ownerContact.phone', apartment.ownerContact?.phone);
  apartment.subListings?.forEach((sub, index) => check(`subListings.${index}.ownerContact.phone`, sub.ownerContact?.phone));
  if (Object.keys(set).length) updates.push({ id: apartment._id, title: apartment.title, set });
}

console.log(`${apply ? 'GHI DB' : 'CHẠY THỬ'}: đã quét ${apartments.length} căn — ${updates.length} căn cần chuẩn hóa SĐT, ${invalid} SĐT không hợp lệ (giữ nguyên)`);
for (const { title, set } of updates.slice(0, 20)) {
  console.log(`- ${title.slice(0, 50)} → ${Object.values(set).map(maskPhone).join(', ')}`);
}

if (apply && updates.length) {
  // timestamps: false → không đổi updatedAt, căn cũ không bị coi là vừa cập nhật
  const result = await Apartment.bulkWrite(updates.map(({ id, set }) => ({ updateOne: { filter: { _id: id }, update: { $set: set }, timestamps: false } })));
  console.log(`✅ Đã cập nhật ${result.modifiedCount} căn`);
} else if (!apply) {
  console.log('Chưa ghi gì. Kiểm tra kết quả trên rồi chạy lại với --apply');
}
await mongoose.disconnect();
