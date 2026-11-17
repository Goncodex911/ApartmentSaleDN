# STORY 8.3: Địa chỉ 2 lớp — Link bản đồ (nội bộ) & Tên đường (gửi khách) (Epic 8)

**Bối cảnh:** Feedback khách mục A.4–A.5 (`docs/stories/EPIC_08_LISTING_UPLOAD_FEEDBACK.md`). Hiện căn chỉ có 1 ô chữ "Địa chỉ cụ thể";
tọa độ chỉ ước lượng theo điểm mốc / tâm quận (sai số vài km) nên tìm theo bán kính kém chính xác. Bài gửi khách & trang khách chỉ ghi
phường + quận, khách không biết căn nằm đường nào.

## User Story
Là **Quản lý / CTV**, tôi muốn lưu link Google Maps của căn và một tên đường riêng để gửi khách,
để bấm 1 lần là mở đường đi dẫn khách xem phòng, còn khách chỉ biết tên đường, không biết số nhà.

## Tiền điều kiện
- Story 8.1, 8.2 đã xong (form mới, không còn cọc / hoa hồng).
- `location.address` đang được dùng cho khử trùng lặp (`DedupService.checkDeterministicMatch`), ước lượng tọa độ và tìm theo chữ → **giữ nguyên ý nghĩa** "địa chỉ đầy đủ nội bộ".

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Form 3 ô**
- Given Quản lý mở form Thêm / Sửa căn
- Then nhóm "Vị trí" có: **Tên đường \*** (bắt buộc), **Số nhà / kiệt** (nội bộ, không bắt buộc), **Link Google Maps** (không bắt buộc)
- And bỏ trống Tên đường → báo lỗi, không lưu.

**AC2 — Link map → tọa độ chính xác**
- Given Quản lý dán link dài có tọa độ (`.../@16.0544,108.2442,17z`, `...!3d16.0544!4d108.2442`, `?q=16.0544,108.2442`)
- When lưu căn
- Then `location.coordinates` = đúng tọa độ trong link (ưu tiên `!3d!4d` là vị trí ghim, sau đó `@`, sau đó `q=` / `ll=`).
- Given dán link rút gọn `https://maps.app.goo.gl/xxxx`
- When lưu căn
- Then backend tự mở link (chỉ theo chuyển hướng tới tên miền Google Maps, tối đa 3 lần, quá 5 giây thì bỏ) rồi lấy tọa độ.
- Given link không thuộc Google Maps (VD `http://localhost`, `http://169.254.169.254`, `https://evil.com/maps`)
- Then API trả 400 "Link Google Maps không hợp lệ", **không** gửi request tới địa chỉ đó (chống SSRF).
- Given link Google Maps hợp lệ nhưng không lấy được tọa độ (link tên địa điểm, mạng lỗi)
- Then vẫn lưu căn, tọa độ giữ cách ước lượng cũ.

**AC3 — Nút "Mở bản đồ" chỉ trong nội bộ**
- Given căn có `mapUrl`
- When Quản lý hoặc CTV mở chi tiết căn
- Then có nút **"Mở bản đồ"** (mở tab mới / app Google Maps).
- Given khách mở trang chia sẻ hoặc CTV copy bài gửi khách (VI & EN)
- Then **không bao giờ** có link map, số nhà, tọa độ gốc (giữ tọa độ làm tròn ~500m như hiện tại).

**AC4 — Khách thấy "Tên đường, Khu vực"**
- Given căn có tên đường "Bà Huyện Thanh Quan", phường Mỹ An, quận Ngũ Hành Sơn
- Then bài gửi khách và trang khách ghi `Bà Huyện Thanh Quan, Mỹ An, Ngũ Hành Sơn` (EN: `Ba Huyen Thanh Quan, My An, Ngu Hanh Son`).
  (Sau Story 8.4 sẽ đổi thành `Tên đường, Khu vực`.)

**AC5 — AI tự tách tên đường**
- Given tin có "K12/3 Bà Huyện Thanh Quan, Mỹ An"
- When AI bóc tin
- Then `street = "Bà Huyện Thanh Quan"`, `houseNumber = "K12/3"`, `address = "K12/3 Bà Huyện Thanh Quan"`.

**AC6 — Căn cũ không cần chạy script**
- Given căn cũ chỉ có `address = "Kiệt 25 Hồ Nghinh"`, chưa có `street`
- When xem chi tiết, copy bài gửi khách, mở trang khách, mở form Sửa
- Then tên đường hiển thị "Hồ Nghinh", ô Số nhà / kiệt hiện "Kiệt 25" (tách lúc trả dữ liệu, không ghi vào DB).

## Phạm vi kỹ thuật

### Model (chỉ thêm trường, không bắt buộc ở DB)
```ts
location: {
  address: string;        // giữ nguyên: "Số nhà/kiệt + Tên đường" (nội bộ) — service tự ghép khi lưu
  street?: string;        // MỚI: tên đường gửi khách
  houseNumber?: string;   // MỚI: số nhà / kiệt (nội bộ)
  mapUrl?: string;        // MỚI: link Google Maps (nội bộ)
  ward, district, city, coordinates  // giữ nguyên
}
```

### Backend
| File | Thay đổi |
|---|---|
| `utils/street.ts` (mới) | `splitAddress(address) → { houseNumber, street }`: bỏ tiền tố số nhà / "K", "Kiệt", "Hẻm", "Ngõ", "Số", "Lô"..., cắt phần sau dấu phẩy (phường/quận) |
| `utils/google-maps.ts` (mới) | `isGoogleMapsUrl(url)` (danh sách trắng: `maps.app.goo.gl`, `goo.gl/maps`, `google.com/maps`, `www.google.com/maps`, `maps.google.com`; chỉ `https`); `parseCoordinates(url)`; `resolveMapCoordinates(url)`: `fetch(..., { redirect: 'manual' })`, kiểm tra từng `Location` với danh sách trắng, tối đa 3 lần, timeout 5s, không đọc body |
| `apartments/apartment.model.ts` | Thêm `street`, `houseNumber`, `mapUrl` vào `location` |
| `apartments/apartment.validation.ts` | `street` bắt buộc (≥ 2 ký tự); `houseNumber` tùy chọn; `mapUrl` tùy chọn, `refine(isGoogleMapsUrl)`; `address` không còn nhận từ form (service ghép) — vẫn nhận tạm để tương thích extension / script cũ |
| `apartments/apartment.service.ts` | `create`/`update`: ghép `address = houseNumber + street`; `mapUrl` mới / đổi → `resolveMapCoordinates` ghi đè `coordinates`; `maskApartment`: căn cũ thiếu `street` → điền `splitAddress(address)` vào kết quả |
| `ingestion/gemini.prompt.ts`, `gemini.service.ts` | AI trả thêm `street`; nếu AI để trống → `splitAddress(address)` |
| `dedup/dedup.service.ts` | Tạo căn từ tin AI có `street`, `houseNumber` |
| `share/public-listing.util.ts` | Trả `location.street` (có tách cho căn cũ); **không** trả `address`, `houseNumber`, `mapUrl` |

### Frontend
| File | Thay đổi |
|---|---|
| `components/apartment/LocationSection.tsx` (mới) | Tách nhóm "Vị trí" khỏi `ApartmentModal` (giữ file < 250 dòng): Tên đường *, Số nhà / kiệt, Link Google Maps, Phường, Khu vực |
| `components/apartment/ApartmentModal.tsx` | Dùng `LocationSection`; payload gửi `street`, `houseNumber`, `mapUrl` |
| `components/apartment/ApartmentDetailModal.tsx` | Nút "Mở bản đồ" (`target="_blank" rel="noopener noreferrer"`), cao 44px |
| `utils/shareText.ts`, `utils/shareTextEn.ts`, `utils/listingEn.ts` (`placeEn`), `pages/PublicListingPage.tsx` | Dòng vị trí = `Tên đường, Phường, Quận` |
| `api/apartmentApi.ts`, `api/shareApi.ts` | Thêm kiểu `street`, `houseNumber`, `mapUrl` |

Không có API endpoint mới, không thêm biến môi trường.

## Rủi ro
- Google có thể đổi dạng link rút gọn hoặc chặn request từ server Render → AC2 đã có đường lùi (vẫn lưu, dùng tọa độ ước lượng). Nếu bị chặn thường xuyên, phương án thay: người dùng mở link trên điện thoại rồi copy link dài.

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] Thử `parseCoordinates` với 5 dạng link (`@`, `!3d!4d`, `q=`, `ll=`, link tên địa điểm không có tọa độ).
- [ ] Thử `isGoogleMapsUrl` từ chối: `http://` (không https), `localhost`, IP nội bộ, `google.com.evil.com`, `evil.com/?google.com/maps`.
- [ ] Thử `splitAddress`: "K12/3 Bà Huyện Thanh Quan", "Kiệt 25 Hồ Nghinh", "Số 8 Lô 3 Võ Nguyên Giáp", "Bà Huyện Thanh Quan, Mỹ An", "123A Trần Phú".
- [ ] Bản local: tạo căn bằng link `maps.app.goo.gl` thật → tọa độ đúng; tìm theo bán kính 1km quanh tọa độ đó ra căn.
- [ ] Trang khách & bài gửi khách VI / EN có tên đường, không có số nhà / link map (kiểm tra cả JSON `/share/public/:code`).
- [ ] Căn cũ: chi tiết, bài gửi khách, form Sửa hiện tên đường tách đúng; DB không đổi khi chỉ xem.
- [ ] Chụp 390px form & chi tiết căn; `npm run build` backend & frontend.
- [ ] Báo cáo, đề xuất commit `feat(listing): Google Maps link and street name for apartments (Story 8.3)` chờ duyệt.
