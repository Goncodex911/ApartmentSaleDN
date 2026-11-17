# STORY 8.6: CTV đăng tin — Quản lý duyệt mới lưu vào kho (Epic 8)

**Bối cảnh:** Quyết định của Project Owner: CTV được đăng căn mình tìm được, nhưng **Quản lý phải duyệt** mới vào kho.
Story 8.1 đã khóa mọi API tạo căn cho Quản lý / Admin → CTV cần một luồng riêng, tách hẳn khỏi kho căn hộ.

## User Story
Là **CTV**, tôi muốn đăng căn mình tìm được lên hệ thống,
để Quản lý duyệt rồi đưa vào bảng hàng chung.

## Tiền điều kiện
- Story 8.1–8.5 đã xong (form căn hộ hoàn chỉnh, dùng chung cho CTV).
- Đã có: `NotificationService.notify` (lưu thông báo + gửi Telegram nếu đã liên kết), `DedupService` (SĐT + địa chỉ, pHash ảnh),
  `rateLimit` middleware, upload Cloudinary `/apartments/upload-media` (hiện chỉ Quản lý).

## Tiêu chí chấp nhận (Gherkin)

**AC1 — CTV đăng tin vào hàng chờ riêng**
- Given CTV đăng nhập
- When bấm **"Đăng tin"** → điền form (giống form Thêm căn, kể cả ảnh) → Gửi
- Then tin lưu vào collection `ListingSubmission` trạng thái **Chờ duyệt**; **không** tạo căn trong `Apartment`
- And tin không xuất hiện ở danh sách, tìm kiếm, ghép khách, chia sẻ, chat AI.

**AC2 — Quản lý duyệt / từ chối**
- Given Quản lý có tin chờ duyệt
- Then menu có mục **"Tin chờ duyệt"** kèm số đếm
- When mở một tin → (sửa nếu cần) → **Duyệt**
- Then tạo căn vào kho: `managerId` = Quản lý duyệt, `submittedBy` = CTV đăng; tin chuyển **Đã duyệt** kèm `apartmentId`; chạy ghép khách (Story 6.3) như căn mới.
- When **Từ chối** kèm lý do (bắt buộc, ≥ 5 ký tự)
- Then tin chuyển **Từ chối**, lưu lý do, người duyệt, thời điểm.
- Given 2 Quản lý cùng duyệt 1 tin
- Then chỉ 1 người thành công, người còn lại nhận 409 "Tin đã được xử lý" (cập nhật có điều kiện `status: PENDING`).

**AC3 — CTV theo dõi tin của mình**
- Given CTV mở **"Tin tôi đăng"**
- Then thấy danh sách tin của chính mình + trạng thái (Chờ duyệt / Đã duyệt / Từ chối + lý do / Đã rút)
- And khi còn Chờ duyệt: **Sửa** hoặc **Rút tin** (chuyển "Đã rút", không xóa hẳn); hết Chờ duyệt → không sửa / rút được (409).
- Given CTV khác gọi API sửa / rút tin không phải của mình → 404.

**AC4 — Thông báo (trong app + Telegram)**
- Given CTV gửi tin mới
- Then mọi Quản lý / Admin đang hoạt động nhận "Có tin mới chờ duyệt: <tiêu đề> — CTV <tên>".
- Given tin được duyệt / bị từ chối
- Then CTV đăng nhận "Tin <tiêu đề> đã được duyệt" / "… bị từ chối: <lý do>".
- Telegram gửi lỗi không làm hỏng thao tác duyệt (giữ cách chạy nền hiện có).

**AC5 — Khử trùng lặp khi duyệt**
- Given trong kho đã có căn cùng SĐT chủ + cùng tên đường + cùng quận (hoặc ảnh trùng pHash)
- When Quản lý bấm Duyệt
- Then màn hình báo "Căn này có thể đã có trong kho: <tiêu đề căn>" với 2 lựa chọn: **Gộp làm nguồn phụ** (mặc định) hoặc **Vẫn tạo căn mới**
- And chọn Gộp → thêm `subListing` (`sourceType: MANUAL`, `sourceName: "CTV <tên>"`) vào căn cũ, tin chuyển Đã duyệt với `apartmentId` = căn cũ, `merged = true`.

**AC6 — Chống spam**
- Given CTV đã có 20 tin Chờ duyệt
- When gửi tin thứ 21 → 429 "Bạn đang có 20 tin chờ duyệt, vui lòng đợi Quản lý xử lý".
- Upload ảnh của CTV: tối đa 10 ảnh / lần, 60 ảnh / giờ / người.

## Phạm vi kỹ thuật

### Model — `modules/submissions/submission.model.ts` (mới)
```ts
ListingSubmission {
  ctvId: ObjectId (ref User, index)
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'   // index chung { status, createdAt }
  data: <cùng cấu trúc CreateApartmentInput>                   // kiểm tra bằng đúng zod schema tạo căn
  rejectReason?: string
  reviewedBy?: ObjectId; reviewedAt?: Date
  apartmentId?: ObjectId; merged?: boolean
  timestamps
}
```
Apartment thêm `submittedBy?: ObjectId` (ref User) — chỉ Quản lý thấy (xóa trong `maskApartment` với CTV).

### API — `/api/v1/submissions` (mới)
| Method & path | Quyền | Mô tả |
|---|---|---|
| `POST /` | COLLABORATOR | Gửi tin (giới hạn 20 chờ duyệt) |
| `GET /mine` | COLLABORATOR | Tin của tôi (phân trang) |
| `PATCH /:id` | CTV chủ tin (khi PENDING) | Sửa tin |
| `POST /:id/withdraw` | CTV chủ tin (khi PENDING) | Rút tin |
| `GET /?status=PENDING` | ADMIN, MANAGER | Hàng chờ duyệt (kèm tên, SĐT CTV) |
| `GET /pending-count` | ADMIN, MANAGER | Số đếm cho menu |
| `GET /:id/duplicates` | ADMIN, MANAGER | Căn có thể trùng trong kho (AC5) |
| `POST /:id/approve` | ADMIN, MANAGER | Body: `{ data? (bản Quản lý sửa), mergeInto?: apartmentId }` |
| `POST /:id/reject` | ADMIN, MANAGER | Body: `{ reason }` |

### Backend
| File | Thay đổi |
|---|---|
| `modules/submissions/submission.{model,validation,service,controller,routes}.ts` (mới) | Theo bảng API; logic ở service; mọi chuyển trạng thái dùng `findOneAndUpdate({ _id, status: 'PENDING' })` |
| `app.ts` | Gắn `/api/v1/submissions` |
| `dedup/dedup.service.ts` | Tách `findDuplicate({ phone, address, district, imageHashes })` (Tầng 1 + Tầng 2) và cho `aggregateSubListing` nhận dữ liệu đã có cấu trúc — dùng lại cho duyệt tin, không gọi Gemini |
| `apartments/apartment.service.ts` | `create` nhận thêm `submittedBy`; `maskApartment` xóa `submittedBy` với CTV |
| `apartments/apartment.routes.ts` | `/upload-media` mở cho COLLABORATOR, kèm `rateLimit` riêng cho CTV (AC6) |
| `notifications/notification.model.ts`, `notification.service.ts` | Loại mới `LISTING_SUBMITTED`, `LISTING_APPROVED`, `LISTING_REJECTED`; trường `submissionId`; hàm `notifyManagers()` gửi tất cả MANAGER / ADMIN `ACTIVE` |

### Frontend
| File | Thay đổi |
|---|---|
| `api/submissionApi.ts` (mới) | Gọi 9 API trên |
| `hooks/useSubmissions.ts` (mới) | Tải danh sách, số đếm, thao tác duyệt / từ chối / rút (tách khỏi UI) |
| `pages/SubmissionsPage.tsx` (mới) + route `/submissions` | CTV: "Tin tôi đăng"; Quản lý: "Tin chờ duyệt" (tab Chờ duyệt / Đã xử lý). Có Skeleton, lỗi, trống |
| `components/submissions/SubmissionCard.tsx`, `RejectDialog.tsx`, `DuplicateNotice.tsx` (mới) | Thẻ tin + trạng thái, hộp nhập lý do, cảnh báo trùng |
| `components/apartment/ApartmentModal.tsx` | Nhận prop `onSave(payload)` + `submitLabel` thay vì gọi thẳng `createApartment` / `updateApartment` → dùng chung cho Thêm căn, Đăng tin, Sửa tin, Duyệt |
| `pages/ApartmentsPage.tsx` | CTV thấy nút "Đăng tin" |
| `components/layout/Navbar.tsx` | Mục "Tin chờ duyệt" + số đếm (Quản lý), "Tin tôi đăng" (CTV) |
| `components/layout/NotificationBell.tsx` | Bấm thông báo loại `LISTING_*` → mở `/submissions` |

Không thêm biến môi trường (dùng lại Telegram bot token, Cloudinary hiện có).

## Rủi ro
- **Hạn mức Cloudinary:** mở upload cho CTV làm tăng dung lượng; ảnh của tin bị từ chối vẫn nằm trên Cloudinary. Phương án: (a) giới hạn như AC6 và chấp nhận (đề xuất); (b) thêm bước dọn ảnh tin bị từ chối / rút sau 30 ngày — làm story riêng nếu cần.
- **Story lớn:** đề xuất code và commit thành 2 phần: **8.6a** backend (model, API, dedup, thông báo, có kiểm thử API) → **8.6b** frontend.

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] API bằng token CTV: gửi tin → không có căn mới trong `Apartment`; tìm kiếm / trang khách / chat AI không thấy tin.
- [ ] CTV A sửa / rút tin của CTV B → 404; sửa tin đã duyệt → 409; tin thứ 21 → 429; CTV gọi `/approve` → 403.
- [ ] Duyệt tin → căn mới có `managerId` = người duyệt, `submittedBy` = CTV; token CTV xem căn đó không thấy `submittedBy`.
- [ ] Duyệt tin trùng SĐT + đường với căn có sẵn → báo trùng; chọn Gộp → căn cũ thêm 1 `subListing`, không có căn mới.
- [ ] Gọi `/approve` 2 lần song song → 1 thành công, 1 nhận 409.
- [ ] Thông báo: Quản lý nhận khi có tin mới; CTV nhận khi duyệt / từ chối (kiểm tra trong app; Telegram nếu tài khoản thử đã liên kết).
- [ ] Chụp 390px: nút Đăng tin, Tin tôi đăng, Tin chờ duyệt, hộp từ chối, cảnh báo trùng; `npm run build` backend & frontend.
- [ ] Dọn dữ liệu thử; báo cáo, đề xuất commit `feat(submissions): CTV listing submissions with manager approval (Story 8.6)` chờ duyệt.
