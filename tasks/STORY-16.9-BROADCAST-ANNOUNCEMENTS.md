# STORY 16.9: Thông Báo Từ Admin Tới Thành Viên (Broadcast Announcements)

**Bối cảnh:** Epic 16. Hiện Admin không có kênh trong app để phổ biến chính sách, lịch họp hay căn hot; mọi việc phải nhắn qua Zalo bên ngoài.

**Đã chốt (Q5):** thông báo minh bạch về việc ghi nhật ký cũng có thể gửi qua kênh này khi bật Epic 16. Ngoài ra Story này thêm 1 dòng cố định ở màn hình đăng nhập (AC6).

---

## 1. Mô tả Story (User Story)
* **Là một:** Admin.
* **Tôi muốn:** Gửi thông báo chung tới tất cả hoặc từng nhóm vai trò.
* **Để:** Phổ biến chính sách, lịch họp, căn hot mà không cần nhắn ngoài app.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story 6.3: chuông thông báo. Story 6.2: gửi Telegram cho người đã liên kết.
* Story 11.4: realtime (SSE).
* Story 16.1: khung Quản trị. Story 16.2: nhật ký.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Soạn & gửi
* **Given** Admin ở `/admin/announcements` bấm `[Soạn thông báo]`
* **When** nhập:
  * tiêu đề (≤ 80 ký tự);
  * nội dung (≤ 500 ký tự, chữ thường, **không HTML**; link được tự nhận dạng và hiện dạng thẻ `<a>` an toàn);
  * người nhận (Tất cả · CTV · Quản lý);
  * thời gian ghim (1 / 3 / 7 ngày);
  * tuỳ chọn "Gửi thêm qua Telegram".
* **Then** mọi thành viên `ACTIVE` thuộc nhóm nhận đều có thông báo trong chuông.
* **And** người đã liên kết Telegram nhận tin Telegram nếu đã chọn tuỳ chọn đó.
* **And** trước khi gửi có bước xem trước, ghi rõ "Gửi tới N người".

### AC2 — Dải ghim
* Thông báo còn hạn hiện **dải ghim trên đầu Bảng hàng** (`/apartments`), tối đa 1 dải (thông báo mới nhất).
* Người dùng bấm `[Đóng]` (≥ 44px, `aria-label`) thì dải ẩn với riêng người đó, kể cả trên thiết bị khác (lưu ở server).
* Hết hạn hoặc bị thu hồi thì dải biến mất. Thành viên đang mở app thấy dải mới ngay qua realtime.
* Dải dùng màu thông tin của Design System, không dùng emoji làm icon (icon lucide `Megaphone`).

### AC3 — Quản lý thông báo đã gửi
* Danh sách: tiêu đề, nhóm nhận, người gửi, thời gian, hạn ghim, **số người nhận / số người đã xem** (đã mở chuông hoặc đã đóng dải).
* `[Thu hồi]` ẩn dải ghim ngay. Thông báo trong chuông vẫn còn để giữ lịch sử.

### AC4 — Giới hạn & nhật ký
* Tối đa **10 thông báo / ngày** (tính trên toàn hệ thống). Vượt giới hạn thì báo lỗi rõ ràng.
* Ghi `SEND_ANNOUNCEMENT`, `REVOKE_ANNOUNCEMENT` (nhóm ADMIN, mức Quan trọng).

### AC5 — Hiệu năng
* Gửi theo lô bằng `insertMany` (mỗi lô 500), không tạo từng bản ghi một.
* Telegram gửi tuần tự có giãn cách (≤ 25 tin / giây) và chạy nền: API trả về ngay, lỗi Telegram không làm hỏng việc gửi trong app.

### AC6 — Minh bạch về nhật ký (Q5)
* Màn hình đăng nhập và Hồ sơ cá nhân có 1 dòng chữ nhỏ: "Thao tác trong hệ thống được ghi nhật ký để bảo vệ dữ liệu và tài khoản của bạn."
* Dòng chữ đạt tương phản ≥ 4.5:1.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend
* **`backend/src/modules/announcements/announcement.model.ts` (mới):** `title`, `body`, `audience` (ALL / COLLABORATOR / MANAGER), `pinnedUntil`, `sentBy`, `recipientCount`, `viaTelegram`, `revokedAt?`, `dismissedBy: ObjectId[]`. TTL 90 ngày.
* **`announcement.service.ts`, `.controller.ts`, `.routes.ts` (mới):**
  * Admin: `POST /admin/announcements`, `GET /admin/announcements`, `POST /admin/announcements/:id/revoke`.
  * Thành viên: `GET /announcements/active`, `POST /announcements/:id/dismiss`.
* **`notification.model.ts`:** loại `ANNOUNCEMENT` + trường `announcementId`. `NotificationService` thêm `notifyMany(userIds, payload)` dùng `insertMany`.
* **Realtime (11.4):** phát sự kiện `announcement.new` / `announcement.revoked`.
* **Số người đã xem:** đếm thông báo `ANNOUNCEMENT` có `readAt`, cộng `dismissedBy` (loại trùng).
* **Bảo mật:** lưu nội dung dạng chữ thường. Frontend hiển thị dạng text, chỉ tự tạo link cho URL `https://`, **không dùng `dangerouslySetInnerHTML`**.

### Frontend
* **`frontend/src/pages/AdminAnnouncementsPage.tsx`, `components/admin/ComposeAnnouncementSheet.tsx` (mới).**
* **`frontend/src/components/layout/AnnouncementBanner.tsx` (mới):** gắn ở đầu `ApartmentsPage`.
* **`adminNav.ts`:** mục "Thông báo chung".
* **`LoginPage.tsx`, Hồ sơ cá nhân:** dòng minh bạch (AC6).

---

## 5. Kiểm thử & Định nghĩa hoàn thành (DoD)
* [ ] Gửi "CTV" thì chỉ CTV `ACTIVE` nhận. Quản lý, tài khoản `PENDING` và `BLOCKED` không nhận.
* [ ] Dải ghim hiện, đóng được và đồng bộ qua thiết bị; thu hồi thì biến mất ngay qua realtime.
* [ ] Thông báo thứ 11 trong ngày bị từ chối.
* [ ] Nội dung có `<script>` hiển thị dạng chữ, không chạy.
* [ ] Telegram lỗi không làm hỏng việc gửi trong app.
* [ ] `tsc --noEmit` hai phía sạch, build frontend thành công. Giao diện đạt checklist ở 390px / 1280px.
