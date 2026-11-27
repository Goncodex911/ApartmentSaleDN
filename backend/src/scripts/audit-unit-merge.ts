import '../config/env.js';
import { writeFileSync } from 'node:fs';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Apartment } from '../modules/apartments/apartment.model.js';
import { compareUnit, unitHintsFromText, unitOfApartment } from '../modules/dedup/unit-signature.js';
import { maskPhonesInText } from '../utils/phone-text.js';

/**
 * Story 20.1 AC7: rà các căn có nguồn phụ nghi bị GỘP NHẦM căn khác trong cùng tòa (khác số PN / diện tích)
 * do luật gộp cũ chỉ so SĐT + đường. CHỈ ĐỌC — không ghi DB, không gọi AI; tách nguồn bằng tay (Story 20.2).
 * Chạy: npm run audit-unit-merge
 */
await connectDB();

const apartments = await Apartment.find(
  { 'subListings.1': { $exists: true } }, // Nguồn 0 là tin tạo căn; từ nguồn 1 trở đi là tin đã gộp
  { title: 1, attributes: 1, 'location.buildingName': 1, 'location.unitLabel': 1, 'subListings.sourceName': 1, 'subListings.rawContent': 1, 'subListings.postedAt': 1 }
).lean();

const rows: string[][] = [];
for (const apartment of apartments) {
  const master = unitOfApartment(apartment);
  for (const sub of apartment.subListings.slice(1)) {
    const hint = unitHintsFromText(sub.rawContent);
    if (compareUnit(master, hint) !== 'DIFFERENT') continue;
    rows.push([
      String(apartment._id),
      maskPhonesInText(apartment.title),
      `${master.bedrooms ?? '?'} PN / ${master.area ?? '?'} m²`,
      `${hint.bedrooms ?? '?'} PN / ${hint.area ?? '?'} m²`,
      sub.sourceName || '',
      sub.postedAt ? new Date(sub.postedAt).toISOString().slice(0, 10) : '',
    ]);
  }
}

// CSV không có SĐT, không có nội dung tin gốc
const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
const file = `audit-unit-merge-${new Date().toISOString().slice(0, 10)}.csv`;
writeFileSync(
  file,
  '﻿' + [['_id', 'Tiêu đề', 'Căn chính', 'Nguồn phụ', 'Nguồn', 'Ngày gộp'], ...rows].map((row) => row.map(cell).join(',')).join('\n')
);

console.log(`CHỈ ĐỌC: quét ${apartments.length} căn có nguồn phụ — ${rows.length} nguồn nghi gộp nhầm ở ${new Set(rows.map((r) => r[0])).size} căn. Chi tiết: ${file}`);
for (const row of rows.slice(0, 20)) console.log(`- ${row[1].slice(0, 50)} | ${row[2]} ← ${row[3]}`);
await mongoose.disconnect();
