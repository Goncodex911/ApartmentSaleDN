# STORY 8.2: Bỏ hẳn tiền cọc & hoa hồng (Epic 8)

**Bối cảnh:** Feedback khách mục A.1–A.3 (`docs/stories/EPIC_08_LISTING_UPLOAD_FEEDBACK.md`). Cọc và hoa hồng được thỏa thuận riêng
từng lần, không gắn theo căn. Hiện hệ thống vẫn bắt nhập 3 ô (Tiền cọc, Loại hoa hồng, Mức hoa hồng), tin AI tự gán "HH 50%"
và bài gửi khách tự ghi "(Cọc 1 tháng)" → thông tin sai, nhập tin chậm.

## User Story
Là **Quản lý**, tôi muốn hệ thống không còn tiền cọc, loại hoa hồng, mức hoa hồng ở bất kỳ đâu,
để nhập tin nhanh hơn và đúng thực tế (cọc & hoa hồng thỏa thuận riêng, không gắn theo căn).

## Tiền điều kiện
- Story 8.1 đã xong (form thêm/sửa căn mới, `formFields.tsx`, xóa trắng ô gửi `null`).
- DB đang có căn cũ mang `deposit` và `commission` (đa số tin AI có `commission: { PERCENT, 50 }`).

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Form không còn 3 ô**
- Given Quản lý mở form Thêm căn hoặc Sửa căn
- When form hiện ra
- Then không còn ô "Tiền cọc", "Loại hoa hồng", "Mức hoa hồng"; Lưu căn vẫn thành công.

**AC2 — Không hiển thị ở bất kỳ màn hình nào**
- Given một căn cũ trong DB vẫn có `deposit = 7.000.000` và `commission = 50%`
- When Quản lý / CTV xem thẻ danh sách, chi tiết căn; khách mở trang chia sẻ (`/p/:code`, cả `?lang=en`);
  CTV bấm Copy bài gửi khách (tiếng Việt & tiếng Anh)
- Then không còn chữ "HH 50%", "Hoa hồng", "Cọc ...", "Đặt cọc", "(Cọc 1 tháng)", "Deposit".

**AC3 — AI và API**
- Given Quản lý dán một tin có "giá 7tr, cọc 1 tháng" vào Nhập nhanh
- When AI bóc tin và tạo căn
- Then kết quả bóc không có trường `deposit`; căn tạo ra không có `commission` (không còn tự gán 50%).
- Given ai đó gọi `POST/PATCH /apartments` có kèm `deposit` hoặc `commission`
- When request được xử lý
- Then 2 trường bị bỏ qua (không lưu); mọi API trả về căn hộ (danh sách, chi tiết, tìm kiếm, trang khách) không chứa 2 trường này,
  kể cả với căn cũ và với vai trò Admin/Quản lý.

**AC4 — Không phá dữ liệu cũ**
- Given DB có căn cũ mang `deposit`, `commission`
- When triển khai bản mới và sửa / lưu lại căn đó
- Then không có lệnh xóa hay migration nào chạy; 2 trường cũ vẫn nằm nguyên trong DB (chỉ code thôi dùng).

## Ngoài phạm vi (giữ nguyên)
- Trạng thái căn **"Đã cọc / Đang giữ cọc"** (`status: DEPOSITED`) và giai đoạn khách **"Đã đặt cọc"** (lead `DEPOSITED`,
  `depositedApartmentId`): đây là trạng thái giao dịch, không phải số tiền cọc → không đụng.
- Ô ví dụ trong Nhập nhanh có chữ "cọc 1": là nội dung bài đăng gốc mẫu, giữ nguyên.

## Phạm vi kỹ thuật

### Backend
| File | Thay đổi |
|---|---|
| `modules/apartments/apartment.model.ts` | Bỏ `deposit`, `commission` khỏi interface `IApartment` và schema. Mongoose `save()` chỉ `$set` trường thay đổi nên dữ liệu cũ không bị xóa |
| `modules/apartments/apartment.validation.ts` | Bỏ `deposit`, `commission` khỏi schema tạo (schema sửa sinh từ đó). zod mặc định loại bỏ trường lạ → gửi lên bị bỏ qua |
| `modules/apartments/apartment.service.ts` `maskApartment` | Xóa `deposit`, `commission` khỏi kết quả **trước** bước trả sớm cho Admin/Quản lý (vì query dùng `.lean()` nên căn cũ vẫn mang 2 trường). Đây là điểm chung của danh sách, chi tiết, tìm kiếm |
| `modules/ingestion/gemini.prompt.ts` | Bỏ quy tắc bóc `deposit` và bỏ `deposit` trong JSON mẫu |
| `modules/ingestion/gemini.service.ts` | Bỏ `deposit` khỏi kiểu kết quả và `extracted` |
| `modules/dedup/dedup.service.ts` | Bỏ `deposit: ext.deposit` và `commission: { PERCENT, 50 }` khi tạo căn từ tin AI |
| `modules/share/public-listing.util.ts` | Bỏ `deposit` khỏi dữ liệu trang khách; sửa comment danh sách trường không trả |

### Frontend
| File | Thay đổi |
|---|---|
| `api/apartmentApi.ts`, `api/shareApi.ts` | Bỏ `deposit`, `commission` khỏi kiểu dữ liệu |
| `components/apartment/ApartmentModal.tsx` | Bỏ 3 state + 3 ô; hàng "Thông tin chính" còn Tiêu đề + Giá thuê |
| `components/apartment/ApartmentCard.tsx` | Bỏ `commissionText` ("HH 50%") |
| `components/apartment/ApartmentDetailModal.tsx` | Bỏ dòng "Hoa hồng ..." và "Cọc ..." |
| `utils/shareText.ts`, `utils/shareTextEn.ts`, `utils/listingEn.ts` | Bỏ `depositText`, `depositEn`, phần "(Cọc ...)" / "Deposit: ..." trong bài gửi khách |
| `pages/PublicListingPage.tsx`, `utils/publicCopy.ts` | Bỏ dòng "Đặt cọc / Deposit" và khóa `deposit` trong bộ chữ |

Không có API endpoint mới, không thêm biến môi trường.

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] `grep -riE "deposit\b|commission"` trong `backend/src`, `frontend/src` chỉ còn các chỗ thuộc "Ngoài phạm vi" (`DEPOSITED`, `depositedApartmentId`).
- [ ] Bản local: tạo sẵn 1 căn cũ có `deposit` + `commission` bằng mongo shell → gọi API danh sách, chi tiết, tìm kiếm (token Admin & CTV)
      và trang khách `/share/public/:code` → không có 2 trường; kiểm tra trong DB 2 trường cũ **vẫn còn**.
- [ ] `PATCH /apartments/:id` gửi `deposit: 5000000` → 200, DB không đổi giá trị cọc.
- [ ] Gọi `/ingestion/parse` với tin có "cọc 1 tháng" (nếu Gemini không quá tải) → kết quả không có `deposit`.
- [ ] Chụp 390px: form thêm căn, thẻ danh sách, chi tiết căn, trang khách VI/EN; copy bài gửi khách VI/EN không còn chữ cọc / hoa hồng.
- [ ] `npm run build` backend & frontend thành công; không còn import/biến thừa.
- [ ] Báo cáo kết quả, đề xuất commit `feat(listing): remove deposit and commission from apartments (Story 8.2)` chờ duyệt.
