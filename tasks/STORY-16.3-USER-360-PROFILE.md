# STORY 16.3: Hồ Sơ Thành Viên 360° (User Detail & Activity Timeline)

**Bối cảnh:** Epic 16. Trang `/admin/users` (Story 13.2) hiện chỉ có danh sách và `UserActionSheet` để thao tác. Admin không xem được:
* lần đăng nhập cuối;
* lần hoạt động cuối;
* số liệu cá nhân;
* dòng thời gian hoạt động của từng người.

**Đã chốt (Q2):** Admin chỉ xem **số liệu tổng hợp** khách CRM của CTV, không đọc chi tiết từng khách.

---

## 1. Mô tả Story (User Story)
* **Là một:** Admin.
* **Tôi muốn:** Mở 1 thành viên và thấy toàn bộ thông tin, số liệu và hoạt động gần đây của người đó trên 1 trang.
* **Để:** Đánh giá, hỗ trợ hoặc xử lý vi phạm từng người mà không phải ghép dữ liệu từ nhiều trang.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story 16.1: khung Quản trị.
* Story 16.2: nhật ký có `category`, lọc theo `userId`.
* `resolveSession` trong `middlewares/auth.ts` có bộ nhớ phiên 30 giây (`SESSION_TTL_MS`).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Vào trang hồ sơ
* **Given** Admin ở `/admin/users`
* **When** bấm 1 thành viên
* **Then** mở trang `/admin/users/:id`. Có nút quay lại, và quay lại thì giữ nguyên tab / ô tìm của danh sách.
* **And** mọi thao tác của 13.2 đều có trên trang hồ sơ: duyệt, đổi vai trò, khóa / mở, đặt lại mật khẩu, khóa quyền báo lỗi. Logic `UserActionSheet` được dùng lại, không viết lại.
* **And** id không tồn tại hoặc sai định dạng thì hiện màn hình "Không tìm thấy thành viên" kèm `[Về danh sách]`.

### AC2 — Thông tin
* Tên, SĐT, mã CTV, vai trò, trạng thái, ngày tham gia, điểm tín nhiệm, quyền báo lỗi, đã liên kết Telegram hay chưa.
* **Lần đăng nhập cuối**, **lần hoạt động cuối**: hoạt động trong 5 phút gần nhất thì hiện nhãn "Đang hoạt động"; ngoài ra hiện dạng tương đối ("3 giờ trước").
* **Số thiết bị đang đăng nhập** = số `refreshSessions` còn hạn.

### AC3 — Số liệu cá nhân (chọn 30 ngày / Toàn thời gian)
| Vai trò | Số liệu |
| :--- | :--- |
| Quản lý / Admin | Căn đã tạo, căn đã sửa (theo nhật ký 16.2), tin CTV đã duyệt / từ chối |
| CTV | Tin đăng gửi / được duyệt / bị từ chối, link chia sẻ đã tạo + tổng lượt xem, **số khách theo giai đoạn** (chỉ con số), căn chốt |
| Mọi vai trò | Báo lỗi đúng / sai, số lần xem SĐT chủ |
* Mỗi số liệu là 1 ô (stat tile) có nhãn chữ. Số 0 vẫn hiện, không ẩn ô.
* Không có tên, SĐT hay ghi chú của khách CRM nào trong phản hồi API.

### AC4 — Dòng thời gian hoạt động
* Nhật ký 16.2 của riêng người này: mới nhất trước, nhóm theo ngày ("Hôm nay", "Hôm qua", "20/11/2026"), mỗi lần tải 30 mục kèm `[Tải thêm]`.
* Có chip lọc nhanh theo nhóm: Tất cả · Đăng nhập · Kho căn · Tin đăng · Tài khoản.
* Trống thì hiện "Chưa có hoạt động nào được ghi nhận".

### AC5 — Danh sách thành viên
* Mỗi dòng / thẻ có nhãn **"Hoạt động cuối"**.
* Thêm cách sắp xếp "Hoạt động gần nhất" / "Lâu không hoạt động" để thấy ai đã bỏ app.

### AC6 — Không ghi DB mỗi request
* `lastActiveAt` cập nhật **tối đa 1 lần / 5 phút / người**, chạy nền, lỗi không ảnh hưởng request.
* `lastLoginAt` cập nhật khi đăng nhập bằng mật khẩu thành công.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend
* **`backend/src/modules/auth/user.model.ts`:** thêm `lastLoginAt?: Date`, `lastActiveAt?: Date`.
* **`backend/src/middlewares/auth.ts`:**
  * Trong `resolveSession`, giữ `Map<userId, lastWrite>` trong bộ nhớ.
  * Đã quá 5 phút kể từ lần ghi trước thì `User.updateOne({ _id }, { $set: { lastActiveAt: now } })` chạy nền.
  * Map được dọn định kỳ (dùng `unref()` như `createCounter`).
* **`backend/src/modules/auth/auth.service.ts`:** `login` thành công thì set `lastLoginAt`.
* **`backend/src/modules/users/user-overview.service.ts` (mới):** `getOverview(userId, range)` gom bằng `Promise.all`:
  * thông tin user;
  * số session còn hạn;
  * đếm `Apartment` theo `createdBy`;
  * đếm `ListingSubmission` theo trạng thái;
  * đếm `ShareLink` và tổng lượt xem;
  * `Lead.aggregate` theo giai đoạn (**chỉ trả `{ stage, count }`**);
  * đếm báo lỗi đúng / sai;
  * đếm `AuditLog` theo `UNMASK_OWNER_CONTACT` / `UPDATE_APARTMENT`.
  * Dùng `countDocuments` / `aggregate` có index; nếu thiếu index thì ghi rõ trong báo cáo dev.
* **`backend/src/modules/users/user.controller.ts`, `user.routes.ts`:**
  * `GET /users/:id/overview?range=30d|all` (ADMIN).
  * `GET /users?sort=lastActive` (thêm tham số sắp xếp).
* Dòng thời gian dùng lại `GET /admin/audit-logs?userId=&category=` (16.2).

### Frontend
* **`frontend/src/pages/AdminUserDetailPage.tsx` (mới):** route `/admin/users/:id` trong `AdminLayout`.
* **`frontend/src/components/admin/UserStatTiles.tsx`, `UserTimeline.tsx` (mới).**
* **`frontend/src/components/admin/UserActionSheet.tsx`:** tách phần nút thao tác thành component dùng lại được trên trang hồ sơ.
* **`frontend/src/pages/AdminUsersPage.tsx`:** bấm dòng thì điều hướng sang trang hồ sơ, thêm nhãn "Hoạt động cuối" và lựa chọn sắp xếp.
* **`frontend/src/utils/relativeTime.ts`** (nếu chưa có): "3 giờ trước", dùng `Intl.RelativeTimeFormat`, không thêm thư viện.

---

## 5. Kiểm thử & Định nghĩa hoàn thành (DoD)
* [ ] API overview trả đúng số liệu trên dữ liệu mẫu (tạo căn, tin, link, lead ở DB test). Phản hồi **không chứa** tên / SĐT khách.
* [ ] Gọi 50 request liên tiếp của 1 user thì `lastActiveAt` chỉ được ghi 1 lần.
* [ ] Thao tác 13.2 trên trang hồ sơ hoạt động; chặn Admin tự khóa / đổi vai trò chính mình như hiện tại.
* [ ] id sai thì hiện màn hình "Không tìm thấy", không lỗi trắng trang.
* [ ] Giao diện ở 390px và 1280px đạt checklist ui-ux-pro-max; dòng thời gian có skeleton, lỗi, trống.
* [ ] `tsc --noEmit` hai phía sạch, build frontend thành công.
