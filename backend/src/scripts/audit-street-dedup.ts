import '../config/env.js';
import { writeFileSync } from 'node:fs';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Apartment } from '../modules/apartments/apartment.model.js';
import { suspectNumberedStreets } from '../modules/dedup/street-key.js';

/**
 * CE-03.4: rà các căn có nguồn phụ có thể bị GỘP NHẦM đường số (căn "Mỹ An" gộp tin "Mỹ An 22") do luật so tên
 * đường "chứa nhau" trước CE-03.1. Script KHÔNG tự tách nguồn — chỉ liệt kê để Quản lý xử lý.
 * Mặc định CHẠY THỬ (chỉ đọc, xuất CSV):   npm run audit-street-dedup
 * Gắn cờ "Cần kiểm tra" cho căn nghi ngờ:  npm run audit-street-dedup -- --apply
 */
const apply = process.argv.includes('--apply');
const REVIEW_REASON = 'Có thể gộp nhầm nguồn khác đường số (VD Mỹ An ↔ Mỹ An 22) — kiểm tra & tách nguồn';
await connectDB();

const apartments = await Apartment.find(
  { 'subListings.1': { $exists: true } }, // Chỉ căn có ít nhất 1 nguồn phụ đã gộp (nguồn 0 là tin tạo căn)
  { title: 1, 'location.street': 1, 'location.address': 1, needsReview: 1, 'subListings.sourceName': 1, 'subListings.rawContent': 1, 'subListings.postedAt': 1 }
).lean();

const rows: { id: string; title: string; street: string; suspects: string; source: string; postedAt: string; flagged: boolean }[] = [];
for (const apartment of apartments) {
  const street = apartment.location?.street || apartment.location?.address || '';
  for (const sub of apartment.subListings.slice(1)) {
    const suspects = suspectNumberedStreets(street, sub.rawContent);
    if (!suspects.length) continue;
    rows.push({
      id: String(apartment._id),
      title: apartment.title,
      street,
      suspects: suspects.join(' / '),
      source: sub.sourceName || '',
      postedAt: sub.postedAt ? new Date(sub.postedAt).toISOString().slice(0, 10) : '',
      flagged: Boolean(apartment.needsReview),
    });
  }
}

// CSV chỉ có tên căn / đường / tên nguồn — không có SĐT, không có nội dung tin gốc
const cell = (value: string | boolean) => `"${String(value).replace(/"/g, '""')}"`;
const file = `audit-street-dedup-${new Date().toISOString().slice(0, 10)}.csv`;
writeFileSync(
  file,
  '﻿' + [['_id', 'Tiêu đề', 'Đường căn chính', 'Đường trong nguồn phụ', 'Nguồn', 'Ngày gộp', 'Đã có cờ'], ...rows.map(Object.values)]
    .map((row) => row.map(cell).join(','))
    .join('\n')
);

const ids = [...new Set(rows.filter((row) => !row.flagged).map((row) => row.id))];
console.log(`${apply ? 'GHI DB' : 'CHẠY THỬ'}: quét ${apartments.length} căn có nguồn phụ — ${rows.length} nguồn nghi gộp nhầm ở ${new Set(rows.map((r) => r.id)).size} căn. Chi tiết: ${file}`);
for (const row of rows.slice(0, 20)) console.log(`- ${row.title.slice(0, 50)} | ${row.street} ← ${row.suspects}`);

if (apply && ids.length) {
  // timestamps: false → không đẩy căn lên đầu "mới cập nhật"; căn đã có cờ khác thì giữ nguyên lý do cũ
  const result = await Apartment.updateMany(
    { _id: { $in: ids }, needsReview: { $ne: true } },
    { $set: { needsReview: true, reviewReason: REVIEW_REASON } },
    { timestamps: false }
  );
  console.log(`✅ Đã gắn cờ "Cần kiểm tra" cho ${result.modifiedCount} căn`);
} else if (!apply) {
  console.log('Chưa ghi gì. Mở file CSV kiểm tra rồi chạy lại với --apply nếu muốn gắn cờ cho Quản lý.');
}
await mongoose.disconnect();
