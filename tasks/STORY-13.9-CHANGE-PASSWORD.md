# STORY 13.9: Đổi Mật Khẩu Trong Hồ Sơ Cá Nhân (Self-Service Change Password)

**Bối cảnh:** Bổ sung cho `STORY-13.2-FULL-USER-MANAGEMENT.md`.
Ở Story 13.2, Admin đặt lại được mật khẩu tạm (12 ký tự ngẫu nhiên) cho thành viên quên mật khẩu.
Nhưng app chưa có chức năng tự đổi mật khẩu, nên người nhận phải dùng mãi mật khẩu tạm, và Admin là người cuối cùng đã thấy mật khẩu đó.
Story này cho mọi tài khoản tự đổi mật khẩu trong **Hồ sơ cá nhân**, đồng thời nhắc người vừa nhận mật khẩu tạm phải đổi.

---

## 1. Mô tả Story (User Story)
* **Là một:** CTV, Quản lý hoặc Admin đã đăng nhập.
* **Tôi muốn:** Tự đổi mật khẩu trong mục Hồ sơ cá nhân, bằng cách nhập mật khẩu hiện tại và mật khẩu mới.
* **Để:** Bỏ được mật khẩu tạm Admin cấp, và chủ động đổi mật khẩu khi nghi bị lộ.

---

## 2. Tiền điều kiện (Pre-conditions)
* Đã có `tokenVersion` và bộ nhớ phiên 30 giây (Story 13.2) để đăng xuất các thiết bị khác.
* Đã có `rateLimit` trong `middlewares/rate-limit.ts` và `AuditService` (Story 13.3).
* Không cần cấu hình mới, không thêm thư viện.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Đổi mật khẩu trong Hồ sơ
* **Given** người dùng mở **Hồ sơ cá nhân**
* **When** mở mục **Đổi mật khẩu** và nhập: mật khẩu hiện tại, mật khẩu mới, nhập lại mật khẩu mới
* **Then** bấm `[Đổi mật khẩu]` → thông báo "Đã đổi mật khẩu" và **thiết bị đang dùng vẫn đăng nhập**.
* **And** mọi thiết bị khác đang đăng nhập tài khoản này bị đăng xuất (tăng `tokenVersion`).

### AC2 — Kiểm tra dữ liệu
* Mật khẩu hiện tại sai → báo "Mật khẩu hiện tại không đúng", không đổi gì.
* Mật khẩu mới dưới 6 ký tự (giống quy định đăng ký), trùng mật khẩu hiện tại, hoặc 2 ô mật khẩu mới không khớp → báo lỗi ngay dưới ô tương ứng.
* Sai mật khẩu hiện tại quá 5 lần trong 15 phút → 429 "Bạn thử quá nhiều lần, vui lòng chờ 15 phút" (chống dò mật khẩu khi người khác cầm máy đang đăng nhập).

### AC3 — Bắt buộc đổi sau khi nhận mật khẩu tạm
* **Given** Admin vừa đặt lại mật khẩu tạm cho tài khoản X (Story 13.2)
* **When** X đăng nhập bằng mật khẩu tạm
* **Then** app mở ngay bảng **Đổi mật khẩu** kèm dòng nhắc "Bạn đang dùng mật khẩu tạm do Admin cấp, vui lòng đặt mật khẩu mới".
* **And** X chưa đổi thì bảng này hiện lại ở mỗi lần mở app (được đóng tạm để xem Bảng hàng, không khóa cứng app).
* **And** đổi xong thì cờ nhắc được gỡ.

### AC4 — Ghi vết
* Đổi mật khẩu thành công → ghi nhật ký `CHANGE_PASSWORD` (Story 13.3), **không** lưu mật khẩu nào vào nhật ký.

### AC5 — Giao diện điện thoại
* 3 ô mật khẩu có nút hiện / ẩn (icon `Eye` / `EyeOff` của lucide), chữ ≥ 16px, vùng bấm ≥ 44px.
* Gán `autocomplete="current-password"` / `"new-password"` để iPhone gợi ý và lưu mật khẩu mạnh.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/modules/auth/user.model.ts`:** thêm `mustChangePassword: boolean` (mặc định `false`).
* **`backend/src/modules/auth/auth.validation.ts`:** `changePasswordSchema = { currentPassword, newPassword (min 6) }` + kiểm tra mật khẩu mới khác mật khẩu hiện tại.
* **`backend/src/modules/auth/auth.service.ts`:** `changePassword(userId, input)`:
  - So `comparePassword`; sai → 400.
  - Đổi mật khẩu (pre-save tự băm bcrypt), `tokenVersion + 1`, `mustChangePassword = false`.
  - `forgetSession(userId)`.
  - Trả token mới (`generateTokens`) để thiết bị hiện tại vẫn đăng nhập.
* **`backend/src/modules/auth/auth.controller.ts` + `auth.routes.ts`:** `POST /api/v1/auth/change-password` (`authMiddleware`).
  - Giới hạn 5 lần / 15 phút / tài khoản.
  - Đặt lại cookie refresh token mới và trả `accessToken`.
* **`backend/src/modules/users/user.service.ts`:** `resetPassword` (Story 13.2) gán thêm `mustChangePassword = true`.
* **`backend/src/modules/audit/audit-log.model.ts`:** thêm hành động `CHANGE_PASSWORD`.
* `GET /auth/me` và phản hồi đăng nhập tự có `mustChangePassword` (đã trả cả document user).

### Frontend:
* **`frontend/src/api/authApi.ts`:** `changePassword({ currentPassword, newPassword })` → lưu `accessToken` mới vào `localStorage`. Kiểu `User` thêm `mustChangePassword?: boolean`.
* **`frontend/src/components/profile/ChangePasswordSection.tsx` (mới):** form 3 ô + nút hiện / ẩn + trạng thái loading / lỗi / thành công.
* **`frontend/src/components/profile/ProfileModal.tsx`:** thêm mục Đổi mật khẩu (dưới mục Telegram).
* **`frontend/src/components/layout/AppShell.tsx`:** `user.mustChangePassword` → tự mở Hồ sơ ở mục Đổi mật khẩu, kèm dòng nhắc.
* **`frontend/src/components/admin/UserActionSheet.tsx`:** câu hướng dẫn mật khẩu tạm đổi lại thành "… người nhận sẽ được yêu cầu đổi mật khẩu khi đăng nhập".
* **`frontend/src/components/admin/AuditLogItem.tsx`:** nhãn "Đổi mật khẩu" cho `CHANGE_PASSWORD` (tab "Tài khoản").

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] API:
  - Đổi đúng → thiết bị hiện tại gọi API được bằng token mới; token cũ ở thiết bị khác → 401; refresh token cũ → 401.
  - Mật khẩu cũ không đăng nhập được, mật khẩu mới đăng nhập được.
  - Sai mật khẩu hiện tại → 400; mật khẩu mới < 6 ký tự hoặc trùng mật khẩu cũ → 400; lần thứ 6 trong 15 phút → 429.
  - Admin reset → `mustChangePassword = true`; đổi xong → `false`. Nhật ký có `CHANGE_PASSWORD`, không chứa mật khẩu.
* [ ] Puppeteer 390px (bản local):
  - Admin reset mật khẩu CTV thử → CTV đăng nhập bằng mật khẩu tạm → bảng Đổi mật khẩu tự mở → đổi xong không hiện lại.
  - Ô ≥ 16px, nút ≥ 44px, không tràn ngang.
* [ ] `tsc` 2 phía + build production không lỗi; dọn dữ liệu thử.
* [ ] Báo cáo và đề xuất commit, chờ duyệt.

---

## 6. Rủi ro & lựa chọn
* **Bắt buộc đổi (AC3)** chỉ nhắc mỗi lần mở app, không khóa cứng app. Khóa cứng sẽ chặn cả việc CTV đang dẫn khách xem phòng. Nếu muốn khóa cứng (chưa đổi thì không gọi được API nào) thì cần sửa thêm `authMiddleware`; đề xuất **không** làm.
* Chưa có "Quên mật khẩu" tự phục vụ (qua SMS / Zalo OTP) vì cần nhà cung cấp OTP có phí. Hiện vẫn nhờ Admin đặt lại (Story 13.2).
