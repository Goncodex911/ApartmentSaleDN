# STORY 8.5: Bổ sung tiện ích — giữ tiện ích cũ, thêm mới, hiển thị tiếng Anh (Epic 8)

**Bối cảnh:** Feedback khách mục A.9. Khách nước ngoài hay hỏi gym, bồn tắm, view sông / biển, xông hơi nhưng hệ thống chưa có.
Tên tiện ích đang viết tay ở **4 nơi** khác nhau (`ApartmentDetailModal`, `PublicListingPage`, `shareText`, `listingEn.amenitiesEn`)
nên dễ lệch nhau → gom về 1 danh mục dùng chung.

## User Story
Là **Quản lý / CTV**, tôi muốn chọn đủ các tiện ích khách nước ngoài hay hỏi, tên hiển thị bằng tiếng Anh,
để nhập bằng vài chạm và lọc đúng thứ khách hỏi.

## Tiền điều kiện
- Story 8.4 đã xong (form, bộ lọc, bài gửi khách đã có cấu trúc mới).
- Đã có: `pool`, `elevator`, `allowPets`, `carParking`, `motorbikeParking`, `balcony`, `pcccStandard`, `washingMachine`,
  `includedServices` (WIFI, CLEANING, ELECTRICITY, WATER, LAUNDRY).

## Danh mục tiện ích (thứ tự hiển thị)
| # | Nhãn (EN) | Dữ liệu | Mới? |
|---|---|---|---|
| 1 | Pool | `attributes.pool` | |
| 2 | Gym | `attributes.gym` | ✔ |
| 3 | Elevator | `attributes.elevator` | |
| 4 | Pet friendly | `attributes.allowPets` | |
| 5 | Car parking | `attributes.carParking` | |
| 6 | Motorbike parking | `attributes.motorbikeParking` | |
| 7 | Bathtub | `attributes.bathtub` | ✔ |
| 8 | River view | `attributes.riverView` | ✔ |
| 9 | Sea view | `attributes.seaView` | ✔ |
| 10 | Sauna | `attributes.sauna` | ✔ |
| 11 | Free wifi | `includedServices: WIFI` | |
| 12 | Cleaning | `includedServices: CLEANING` | |
| — | Balcony, Fire safety, Washing machine, Electricity included, Water included, Laundry | như cũ | |

(Khách ghi "Parking (car / motorbike)" → giữ 2 chip riêng vì dữ liệu đã tách từ Story 7.2.)

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Thêm 5 tiện ích, giữ tiện ích cũ**
- Given form Thêm / Sửa căn
- Then có chip Gym, Bathtub, River view, Sea view, Sauna; mọi tiện ích cũ vẫn chọn được và lưu đúng.

**AC2 — Tên tiếng Anh ở mọi nơi**
- Given căn có Pool, Gym, Sea view, Free wifi
- Then form, bộ lọc, thẻ danh sách, chi tiết, trang khách (VI & EN), bài gửi khách (VI & EN) đều ghi đúng nhãn trong bảng trên
  (nhãn nhóm, tiêu đề mục vẫn tiếng Việt ở giao diện nội bộ).

**AC3 — Form chip**
- Given form
- Then nhóm **Tiện ích** là các chip chọn nhiều (cao 44px), 12 mục đầu bảng hiện trước; các mục còn lại nằm sau dòng "Khác".
  Tiện ích không còn rải ở 2 nhóm khác nhau (gộp chip của `ApartmentModal` và `MarketFieldsSection`).

**AC4 — Bộ lọc**
- Given bộ lọc
- Then có thêm chip Gym, Sea view, River view cạnh Pool và "Gần biển (<1km)"; "Gần biển" (theo khoảng cách) và "Sea view" (nhìn ra biển) là 2 điều kiện riêng.

**AC5 — Tìm câu tự nhiên & AI bóc tin**
- Given gõ tìm "căn có phòng tập", "gym", "bồn tắm", "bathtub", "view sông", "river view", "view biển", "sea view", "xông hơi", "sauna"
- Then lọc đúng tiện ích; căn cũ chưa có cờ nhưng tiêu đề / mô tả có chữ đó vẫn ra (giống cách làm với Pool).
- Given AI bóc tin có "có phòng gym, bồn tắm, view sông Hàn"
- Then `gym = true`, `bathtub = true`, `riverView = true`.

**AC6 — Không chuyển dữ liệu cũ**
- Căn cũ không có 5 trường mới → coi như không có; không chạy script.

## Phạm vi kỹ thuật

### Backend
| File | Thay đổi |
|---|---|
| `apartments/apartment.model.ts` | `attributes.gym`, `bathtub`, `riverView`, `seaView`, `sauna`: `Boolean`, **không** đặt default (căn cũ không bị coi là có giá trị) |
| `apartments/apartment.validation.ts` | 5 boolean tùy chọn; query lọc thêm `gym`, `seaView`, `riverView` |
| `search/slang.dictionary.ts` | 5 mục từ khóa VI / EN; `amenityCondition(field, textRegex)` dùng chung (cờ = true **hoặc** chữ trong tiêu đề / mô tả), thay `POOL_CONDITION` viết tay |
| `search/filter.builder.ts`, `search/search.controller.ts`, `search/natural-search.service.ts` | Nhận `gym`, `seaView`, `riverView` (+ `bathtub`, `sauna` từ câu tự nhiên) |
| `ingestion/gemini.prompt.ts`, `gemini.service.ts`, `dedup/dedup.service.ts` | AI trả 5 boolean mới, lưu khi tạo căn |
| `share/public-listing.util.ts` | Trả 5 trường mới |

### Frontend
| File | Thay đổi |
|---|---|
| `utils/amenities.ts` (mới) | `AMENITIES`: `{ key, label, isOn(apartment), toggle(form) }` theo bảng trên + `amenityLabels(apartment)` — **nguồn duy nhất** của nhãn tiện ích |
| `components/apartment/AmenitiesSection.tsx` (mới) | Nhóm chip tiện ích của form (gộp từ `ApartmentModal` + `MarketFieldsSection`) |
| `ApartmentModal.tsx`, `MarketFieldsSection.tsx` | Bỏ chip tiện ích cũ, dùng `AmenitiesSection` |
| `FilterSheet.tsx`, `hooks/useApartmentSearch.ts` | Chip Gym, Sea view, River view; nhãn lấy từ `AMENITIES` |
| `ApartmentCard.tsx`, `ApartmentDetailModal.tsx`, `PublicListingPage.tsx`, `utils/shareText.ts`, `utils/shareTextEn.ts`, `utils/listingEn.ts`, `utils/apartmentLabels.ts` | Bỏ danh sách tiện ích viết tay, gọi `amenityLabels` |
| `api/apartmentApi.ts`, `api/shareApi.ts` | Kiểu 5 trường mới |

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] `grep` không còn nhãn tiện ích viết tay ngoài `utils/amenities.ts` (VD "Thang máy", "'Elevator'").
- [ ] Tạo căn chọn Gym + Sea view → DB đúng; sửa bỏ Gym → `gym = false`.
- [ ] Lọc chip Gym / Sea view / River view và tìm 10 cụm từ ở AC5 → đúng kết quả; căn cũ có chữ "view biển" trong mô tả vẫn ra với "sea view".
- [ ] "Gần biển (<1km)" không ra căn Sea view ở xa > 1km và ngược lại.
- [ ] Thử AI bóc tin mẫu có gym / bồn tắm / view sông (nếu Gemini không quá tải).
- [ ] Chụp 390px form, bộ lọc, chi tiết, trang khách; copy bài gửi khách VI / EN; `npm run build` backend & frontend.
- [ ] Báo cáo, đề xuất commit `feat(listing): gym, bathtub, river/sea view, sauna amenities with English labels (Story 8.5)` chờ duyệt.
