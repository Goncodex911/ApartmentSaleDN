# STORY 16.6: Admin Tạo & Sửa Tài Khoản Trực Tiếp (Admin User Provisioning)

**Bối cảnh:** Epic 16. Hiện người mới phải tự đăng ký; Quản lý tự đăng ký thì ở trạng thái `PENDING` chờ Admin duyệt (13.2). Admin không sửa được tên, SĐT, email của thành viên, và không có chỗ ghi chú nội bộ.

---

## 1. Mô tả Story (User Story)
* **Là một:** Admin.
* **Tôi muốn:** Tự tạo tài khoản cho CTV / Quản lý mới và sửa thông tin cơ bản của thành viên.
* **Để:** Đưa người mới vào làm ngay, sửa sai SĐT / tên mà không cần họ tự đăng ký lại.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story 13.2: `UserService.resetPassword` (mật khẩu tạm, tăng `tokenVersion`), `generateUniqueCtvCode`.
* Story 13.9: `mustChangePassword` buộc đổi mật khẩu ở lần đăng nhập đầu.
* Story 16.2: ghi nhật ký. Story 16.3: trang Hồ sơ 360°.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Thêm thành viên
* **Given** Admin bấm `[Thêm thành viên]` ở `/admin/users`
* **When** nhập tên, SĐT (định dạng VN), vai trò (CTV / Quản lý), email (không bắt buộc), rồi bấm Tạo
* **Then**
  * Tài khoản được tạo ở trạng thái `ACTIVE`, có mã CTV tự sinh và `mustChangePassword = true`.
  * Màn hình hiện **mật khẩu tạm đúng 1 lần**, có nút `[Sao chép]` và lời nhắc "Gửi mật khẩu này cho thành viên qua Zalo / gặp trực tiếp — sẽ không xem lại được", giống luồng reset 13.2.
* **And** SĐT đã tồn tại thì báo lỗi ngay dưới ô nhập ("SĐT đã thuộc tài khoản [tên]"), không tạo trùng.
* **And** form không có lựa chọn vai trò ADMIN; API cũng từ chối `role = ADMIN` (403).

### AC2 — Sửa thông tin
* Trên Hồ sơ 360° có `[Sửa thông tin]`, sửa được tên, SĐT, email.
* SĐT mới trùng người khác thì báo lỗi.
* **Đổi SĐT** thì tăng `tokenVersion` và xoá `refreshSessions` (đăng xuất mọi thiết bị, vì SĐT là tên đăng nhập). Màn hình xác nhận ghi rõ hệ quả này.
* **Không** sửa được tài khoản ADMIN khác qua giao diện / API (403). Admin sửa hồ sơ của chính mình qua trang Hồ sơ cá nhân như cũ.

### AC3 — Ghi chú nội bộ
* Hồ sơ 360° có mục "Ghi chú nội bộ" (chỉ ADMIN thấy): danh sách ghi chú gồm nội dung (≤ 500 ký tự), người viết, thời gian, mới nhất trước.
* Admin thêm được ghi chú; chỉ người viết mới xoá được ghi chú của mình.
* Ghi chú **không bao giờ** xuất hiện trong API mà thành viên tự gọi (`/users/profile`, `/auth/me`…).

### AC4 — Giữ luồng cũ
* Tự đăng ký + Admin duyệt Quản lý (13.2) vẫn hoạt động như cũ.

### AC5 — Nhật ký
* Ghi `CREATE_USER` (vai trò, SĐT che), `UPDATE_USER` (tên các trường đã đổi, trước → sau; SĐT che), `ADD_USER_NOTE`, `DELETE_USER_NOTE`. Nhóm ACCOUNT, mức Bảo mật (riêng ghi chú: Thông thường).
* **Không** ghi mật khẩu tạm.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend
* **`backend/src/modules/auth/user.model.ts`:** `adminNotes: [{ _id, text, authorId, authorName, createdAt }]`, ẩn trong `toJSON` mặc định (giống `refreshSessions`) và chỉ trả qua API admin.
* **`backend/src/modules/users/user.validation.ts`:**
  * `createUserSchema` (name, phone `vnPhone`, role ∈ {MANAGER, COLLABORATOR}, email?);
  * `adminUpdateUserSchema`;
  * `userNoteSchema`.
* **`backend/src/modules/users/user.service.ts`** (nếu vượt 250 dòng thì tách `user-admin.service.ts`):
  * `createByAdmin`: dùng `generateUniqueCtvCode` và phần sinh mật khẩu tạm của `resetPassword`. Tách hàm `generateTempPassword()` dùng chung, không chép lại.
  * `updateByAdmin`.
  * `addNote`, `deleteNote`.
* **`user.routes.ts` / `user.controller.ts`** (ADMIN):
  * `POST /users`;
  * `PATCH /users/:id`;
  * `POST /users/:id/notes`;
  * `DELETE /users/:id/notes/:noteId`.
* **`user-overview.service.ts` (16.3):** trả thêm `adminNotes`.
* **Bộ nhớ phiên:** đổi SĐT thì xoá cache phiên của user (như 16.4).

### Frontend
* **`frontend/src/components/admin/CreateUserSheet.tsx`, `EditUserSheet.tsx` (mới):** ô nhập ≥ 16px, `inputMode="tel"` cho SĐT, lỗi hiện dưới từng ô, nút ≥ 44px.
* **`frontend/src/components/admin/TempPasswordReveal.tsx`:** nếu 13.2 đã có phần hiện mật khẩu tạm thì tách ra dùng chung.
* **`frontend/src/components/admin/AdminNotes.tsx` (mới).**
* **`AdminUsersPage.tsx`:** nút `[Thêm thành viên]`. **`AdminUserDetailPage.tsx`:** nút Sửa + mục Ghi chú.

---

## 5. Kiểm thử & Định nghĩa hoàn thành (DoD)
* [ ] Tạo CTV thì đăng nhập được bằng mật khẩu tạm, bị buộc đổi mật khẩu, sau đó dùng app bình thường.
* [ ] Tạo với SĐT trùng hoặc `role: ADMIN`, sửa tài khoản ADMIN khác: đều bị từ chối đúng mã lỗi.
* [ ] Đổi SĐT thì mọi phiên cũ bị 401, đăng nhập bằng SĐT mới được.
* [ ] `adminNotes` không lộ trong `/users/profile` và `/auth/me`.
* [ ] Nhật ký có đủ mục; không có mật khẩu tạm trong bất kỳ mục nhật ký hay log server nào.
* [ ] `tsc --noEmit` hai phía sạch, build frontend thành công. Giao diện đạt checklist ở 390px / 1280px.
