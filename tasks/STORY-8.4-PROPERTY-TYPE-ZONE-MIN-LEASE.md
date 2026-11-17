# STORY 8.4: Loại căn hộ, Khu vực & Thuê tối thiểu (Epic 8)

**Bối cảnh:** Feedback khách mục A.6–A.8. Hệ thống chưa có loại căn (chỉ số phòng ngủ + nội thất); vị trí lưu theo quận cũ
(8 khu) trong khi khách dùng danh sách trộn **phường** (Mỹ An, Khuê Mỹ, An Hải, Hòa Xuân) và **quận** (Sơn Trà, Hải Châu, Ngũ Hành Sơn);
"Thuê tối thiểu" đang là ô số tự do.

## User Story
Là **Quản lý / CTV**, tôi muốn chọn loại căn, khu vực theo danh sách khách dùng và thời gian thuê tối thiểu,
để lọc và gửi khách theo đúng ngôn ngữ thị trường.

## Tiền điều kiện
- Story 8.3 đã xong (`LocationSection.tsx`, tên đường).
- `attributes.area` **đã dùng cho diện tích (m²)** → trường khu vực mới đặt tên `location.zone` để không nhầm.
- `location.district` vẫn là nền của tìm kiếm, ghép khách, chat AI, khử trùng lặp → giữ nguyên, chỉ đổi cách điền.

## Danh mục
| Loại căn (`attributes.propertyType`) | Nhãn VI | Nhãn EN |
|---|---|---|
| `APARTMENT` | Căn hộ | Apartment |
| `STUDIO` | Studio | Studio |
| `DUPLEX` | Duplex | Duplex |
| `PENTHOUSE` | Penthouse | Penthouse |
| `HOUSE` | Nhà nguyên căn | Whole house |
| `VILLA` | Villa | Villa |

| Khu vực (`location.zone`) | Quận (`location.district`) tự suy ra |
|---|---|
| Mỹ An, Khuê Mỹ, Ngũ Hành Sơn (phần còn lại của quận) | Ngũ Hành Sơn |
| An Hải, Sơn Trà (phần còn lại của quận) | Sơn Trà |
| Hải Châu | Hải Châu |
| Hòa Xuân | Cẩm Lệ |
| Khác | Người dùng chọn: Thanh Khê, Liên Chiểu, Cẩm Lệ, Hòa Vang, Hội An |

Thuê tối thiểu (`minLeaseMonths`): 1 / 3 / 6 / 12.

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Loại căn**
- Given form Thêm / Sửa căn
- Then có ô **Loại căn \*** (chọn 1 trong 6, không chọn sẵn); bỏ trống → báo lỗi, không lưu.

**AC2 — Khu vực**
- Given form Thêm / Sửa căn
- Then có **Khu vực \*** dạng chip chọn 1: Mỹ An, Sơn Trà, Hải Châu, An Hải, Khuê Mỹ, Ngũ Hành Sơn, Hòa Xuân, Khác (có dấu)
- When chọn "Khuê Mỹ" và lưu
- Then DB có `zone = "Khuê Mỹ"`, `district = "Ngũ Hành Sơn"` (backend tự suy ra, không tin giá trị client gửi).
- When chọn "Khác"
- Then hiện thêm ô chọn quận (bắt buộc); lưu `zone = "Khác"`, `district` = quận đã chọn.

**AC3 — Tìm & lọc theo khu vực**
- Given bộ lọc
- Then có nhóm chip **Khu vực** (8 mục, chọn nhiều) → lọc theo `location.zone`.
- Given gõ tìm "mỹ an" / "my an"
- Then ra các căn khu vực Mỹ An.
- Given gõ tìm "ngũ hành sơn" / "nhs"
- Then ra cả căn Mỹ An, Khuê Mỹ, Ngũ Hành Sơn (tìm theo quận như hiện tại).

**AC4 — Thuê tối thiểu**
- Given form → ô **Thuê tối thiểu** dạng chip 1 / 3 / 6 / 12 tháng (không bắt buộc, bấm lại để bỏ chọn)
- Given API nhận `minLeaseMonths = 2` → 400.
- Given AI bóc "thuê tối thiểu 2 tháng" / "9 tháng" / "2 năm"
- Then lưu 3 / 12 / 12 (làm tròn lên mốc gần nhất, trên 12 → 12).
- Given căn cũ có `minLeaseMonths = 2`
- Then vẫn hiển thị "2 tháng"; mở form Sửa → chip chọn sẵn 3 (mốc gần nhất), chỉ đổi khi người dùng lưu.

**AC5 — AI bóc tin**
- Given tin "Cho thuê studio full đồ K12 Bà Huyện Thanh Quan, Mỹ An"
- Then `propertyType = STUDIO`, `zone = "Mỹ An"`, `district = "Ngũ Hành Sơn"`. Không đoán được loại → `APARTMENT` + `needsReview`.

**AC6 — Căn cũ (script, chạy thử trước)**
- Given chạy `npm run backfill-zone-type` (mặc định **chạy thử**: chỉ in số căn sẽ đổi + 20 dòng mẫu, không ghi DB)
- When chạy lại với `-- --apply`
- Then chỉ `$set` `location.zone`, `attributes.propertyType` cho căn **chưa có** 2 trường này; không sửa / xóa trường nào khác.
  - Khu vực suy từ phường / địa chỉ (`findWard`: An Hải Bắc/Đông/Tây → An Hải), không ra thì từ quận (Hải Châu / Sơn Trà / Ngũ Hành Sơn), còn lại → Khác.
  - Loại căn suy từ tiêu đề + mô tả (villa, penthouse, duplex / gác xép, studio, nhà nguyên căn), còn lại → Căn hộ.

**AC7 — Hiển thị**
- Thẻ danh sách, chi tiết, trang khách, bài gửi khách VI / EN hiển thị loại căn + khu vực + thuê tối thiểu.
  VD bài gửi khách: `🏠 Studio · Bà Huyện Thanh Quan, Mỹ An` … `📅 Thuê tối thiểu 6 tháng`; EN: `Studio · Ba Huyen Thanh Quan, My An` … `Min. stay 6 months`.

## Phạm vi kỹ thuật

### Backend
| File | Thay đổi |
|---|---|
| `search/zones.data.ts` (mới) | `PROPERTY_TYPES`, `ZONES`, `ZONE_TO_DISTRICT`, `LEASE_STEPS = [1,3,6,12]`, `roundLeaseMonths(n)`, `deriveZone({ ward, address, district })` (dùng chung cho AI, script, tìm kiếm) |
| `apartments/apartment.model.ts` | Thêm `attributes.propertyType` (enum, không required ở DB), `location.zone` (enum, index) |
| `apartments/apartment.validation.ts` | `propertyType`, `zone` bắt buộc khi tạo; `district` chỉ bắt buộc khi `zone = "Khác"`; `minLeaseMonths` ∈ {1,3,6,12}; query lọc thêm `zones` (danh sách), `propertyType` |
| `apartments/apartment.service.ts` | `create`/`update`: `district = ZONE_TO_DISTRICT[zone]` (trừ "Khác") |
| `search/filter.builder.ts`, `search/search.controller.ts` | Lọc `location.zone: { $in: zones }`, `attributes.propertyType`; `roomType` studio / duplex chuyển sang lọc theo `propertyType` |
| `search/slang.dictionary.ts`, `search/query-analyzer.ts` | Nhận tên khu vực ("mỹ an", "khuê mỹ", "an hải", "hòa xuân") → lọc `zone`; tên quận giữ cách lọc cũ |
| `search/natural-search.service.ts` | Câu tự nhiên có "villa", "penthouse", "nhà nguyên căn" → `propertyType` |
| `ingestion/gemini.prompt.ts`, `gemini.service.ts` | AI trả `propertyType`; `zone` tính bằng `deriveZone` (không để AI đoán); `minLeaseMonths` qua `roundLeaseMonths` |
| `dedup/dedup.service.ts` | Tạo căn có `zone`, `propertyType` |
| `share/public-listing.util.ts` | Trả `zone`, `propertyType` |
| `scripts/backfill-zone-type.ts` (mới) + `package.json` | Script chạy thử / `--apply` như AC6 |

### Frontend
| File | Thay đổi |
|---|---|
| `utils/danang.ts` | `ZONES`, `OTHER_DISTRICTS`, `PROPERTY_TYPE_LABEL` (VI / EN), `LEASE_STEPS` |
| `components/apartment/LocationSection.tsx` | Chip Khu vực + ô quận khi "Khác" |
| `components/apartment/ApartmentModal.tsx` | Ô Loại căn (nhóm Căn hộ) |
| `components/apartment/MarketFieldsSection.tsx` | Thuê tối thiểu → chip 1 / 3 / 6 / 12 |
| `components/apartment/FilterSheet.tsx`, `hooks/useApartmentSearch.ts` | Nhóm chip Khu vực; chip Studio / Duplex chuyển thành nhóm Loại căn |
| `ApartmentCard.tsx`, `ApartmentDetailModal.tsx`, `PublicListingPage.tsx`, `utils/shareText.ts`, `utils/shareTextEn.ts`, `utils/listingEn.ts`, `utils/apartmentLabels.ts` | Hiển thị loại căn, khu vực, thuê tối thiểu |
| `api/apartmentApi.ts`, `api/shareApi.ts` | Kiểu `propertyType`, `zone` |

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] Thử `deriveZone` với: "Mỹ An", "An Hải Bắc", "K25 Hồ Nghinh" + quận Sơn Trà, "Hòa Xuân", quận Thanh Khê → Khác.
- [ ] Thử `roundLeaseMonths`: 1→1, 2→3, 4→6, 7→12, 9→12, 24→12, 0 / âm / null → bỏ.
- [ ] API: tạo căn `zone = "Khuê Mỹ"` kèm `district = "Hải Châu"` → DB lưu Ngũ Hành Sơn; `minLeaseMonths = 2` → 400; `zone = "Khác"` thiếu quận → 400.
- [ ] Tìm "mỹ an" chỉ ra Mỹ An; "ngũ hành sơn" ra cả Mỹ An + Khuê Mỹ + Ngũ Hành Sơn; chip Khu vực lọc đúng.
- [ ] Script trên **bản sao DB local**: chạy thử không ghi gì; `--apply` chỉ thêm 2 trường (so sánh số trường trước / sau); chạy lại lần 2 → 0 căn đổi.
- [ ] Chụp 390px form, bộ lọc, thẻ, chi tiết, trang khách VI / EN; `npm run build` backend & frontend.
- [ ] Báo cáo, đề xuất commit `feat(listing): property type, customer zones and fixed minimum lease (Story 8.4)` chờ duyệt.
- [ ] Script trên DB thật (Render / Atlas) **chỉ chạy khi bạn đồng ý**, chạy thử trước và gửi bạn kết quả.
