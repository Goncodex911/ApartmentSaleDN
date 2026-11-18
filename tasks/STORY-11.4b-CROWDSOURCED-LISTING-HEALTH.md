# STORY 11.4b: CTV báo lỗi tin & tự gắn cờ "Chờ xác minh" (Epic 11)

**Bối cảnh:** `docs/stories/EPIC_11_SMART_BROKER_TOOLS_AND_REALTIME.md` Story 11.4, phần 3 "Báo lỗi cộng đồng".
Story này làm sau Story 11.4 (SSE), vì nhãn cảnh báo được phát tức thì qua luồng sự kiện của 11.4.

Hiện tại:
- Căn "ảo" (chủ đã cho thuê mà không báo) chỉ phát hiện được khi Quản lý gọi điện kiểm tra thủ công.
- Đã có cờ `needsReview`, nhưng đó là cờ cho tin AI bóc chưa chắc chắn (chỉ Quản lý thấy). Story này **không dùng lại** cờ đó, để tránh lẫn nghĩa.

## User Story
Là **CTV**, khi gọi chủ nhà và phát hiện căn đã cho thuê hoặc sai giá, tôi muốn báo lỗi nhanh ngay trên chi tiết căn.
Như vậy các CTV khác được cảnh báo, và Quản lý biết cần kiểm tra lại chủ nhà.

## Tiền điều kiện
- Không cần cấu hình, không thư viện mới.

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Nút Báo lỗi**
- Given CTV / Quản lý mở chi tiết một căn đang `AVAILABLE` / `UPCOMING`
- When bấm **Báo lỗi** (icon `AlertTriangle` của `lucide-react`, không dùng emoji)
- Then hiện bảng chọn 1 lý do (nút cao 48px), kèm ghi chú tùy chọn tối đa 200 ký tự:
  - Đã cho thuê / Hết phòng
  - Chủ tăng giá / Sai giá
  - Không liên lạc được chủ nhà
  - Ảnh không đúng thực tế
- Gửi xong báo "Cảm ơn, Quản lý sẽ kiểm tra". Nút đổi thành "Bạn đã báo lỗi". Mỗi người chỉ có 1 báo lỗi đang mở cho mỗi căn; gửi lại là cập nhật lý do.
- Giới hạn 10 lần báo lỗi / giờ / người. Vượt → 429 "Bạn báo lỗi quá nhiều, thử lại sau".

**AC2 — Tự gắn cờ khi ≥ 2 CTV khác nhau báo**
- Given một căn đã có 1 báo lỗi đang mở
- When một **người khác** báo lỗi căn đó
- Then căn được gắn `verification = { flaggedAt, reasons }`. Thẻ căn và chi tiết căn hiện nhãn vàng **Chờ xác minh** (kèm icon) cho mọi vai trò trong app.
  Trang khách `/p/:slug` **không** hiện nhãn.
- And Quản lý của căn nhận thông báo `LISTING_FLAGGED` (mỗi lần gắn cờ chỉ báo 1 lần), nội dung gồm tên căn và các lý do kèm số lượt.
  Bấm vào thông báo mở chi tiết căn.
- And phát sự kiện realtime `apartment.flagged` (Story 11.4) để thẻ trên máy các CTV khác đổi ngay.
- Báo lỗi của chính Quản lý căn đó không tính vào ngưỡng 2 người.

**AC3 — Quản lý xử lý**
- Chi tiết căn (Quản lý / ADMIN) có mục **Báo lỗi** liệt kê các báo lỗi đang mở: lý do, ghi chú, tên CTV, thời gian. Có 2 hướng xử lý:
  - **Tin vẫn đúng**: xoá cờ, đóng mọi báo lỗi đang mở.
  - **Đổi trạng thái / sửa giá như thường**: khi căn chuyển sang `DEPOSITED` / `RENTED`, hoặc Quản lý lưu form sửa căn, thì tự xoá cờ và đóng báo lỗi.
- Bộ lọc của Quản lý thêm lựa chọn **Chờ xác minh**.

## Phạm vi kỹ thuật
| File | Thay đổi |
|---|---|
| `backend/src/modules/reports/listing-report.model.ts` (mới) | `{ apartmentId, reporterId, reason, note, status: OPEN \| RESOLVED, resolvedBy, resolvedAt }`; index duy nhất `{ apartmentId, reporterId }` khi `status = OPEN` |
| `reports/listing-report.service.ts`, `.controller.ts`, `.routes.ts`, `.validation.ts` (mới) | `POST /apartments/:id/reports`; `GET /apartments/:id/reports` (Quản lý); `POST /apartments/:id/reports/resolve` (Quản lý của căn / ADMIN). Giới hạn lượt bằng `rate-limit.ts` có sẵn |
| `apartments/apartment.model.ts` | `verification?: { flaggedAt, reasons: string[] }` |
| `apartments/apartment.service.ts` | `updateStatus` (DEPOSITED/RENTED) và `update` tự gọi `resolveOpenReports`. `maskApartment` giữ `verification` (mọi vai trò trong app đều thấy) |
| `share/public-listing.util.ts` | Không đưa `verification` ra trang khách |
| `notifications/notification.model.ts` | Thêm loại `LISTING_FLAGGED` |
| `search/filter.builder.ts` | Bộ lọc `needsVerification=true` (chỉ Quản lý) |
| `frontend/src/components/apartment/ReportListingSheet.tsx` (mới) | Bảng chọn lý do |
| `frontend/src/components/apartment/ListingReportsSection.tsx` (mới) | Danh sách báo lỗi + nút **Tin vẫn đúng** |
| `ApartmentDetailModal.tsx`, `ApartmentCard.tsx`, `FilterSheet.tsx`, `NotificationBell.tsx`, `api/apartmentApi.ts` | Nút Báo lỗi; nhãn Chờ xác minh (vàng, tương phản ≥ 4.5:1); bộ lọc; bấm thông báo mở chi tiết căn |

## Rủi ro
- **CTV báo lỗi bừa để "giấu" căn khỏi người khác.** Đã chặn bằng: cần 2 người khác nhau, chỉ gắn nhãn chứ không ẩn căn, Quản lý thấy tên người báo, và giới hạn lượt báo.

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] API:
  - 1 CTV báo 2 lần → vẫn 1 báo lỗi đang mở (lý do được cập nhật).
  - CTV thứ 2 báo → có cờ, Quản lý nhận đúng 1 thông báo. Quản lý căn tự báo → không tính.
  - **Tin vẫn đúng** → xoá cờ; đổi sang RENTED → tự xoá cờ.
  - Báo lỗi lần 11 trong 1 giờ → 429; trang khách không có `verification`.
- [ ] Puppeteer 390px trên bản local (2 CTV + Quản lý): báo lỗi → nhãn hiện trên máy CTV khác qua SSE; Quản lý xử lý → nhãn mất; trang không tràn.
- [ ] Build và lint không lỗi. Báo cáo, đề xuất commit `feat(reports): crowdsourced listing health flags (Story 11.4b)` chờ duyệt.
