# STORY 16.4: Quản Lý Phiên Đăng Nhập & Thiết Bị (Session & Device Management)

**Bối cảnh:** Epic 16.
* Story 14.5 đã lưu phiên theo thiết bị trong `User.refreshSessions: { jti, prevJti?, rotatedAt?, expiresAt }`. Refresh token mang `jti`, đăng xuất thì gỡ phiên của máy đó.
* **Access token chưa mang `jti`**, nên thu hồi 1 thiết bị chỉ có hiệu lực khi máy đó làm mới token.
* Admin hiện chỉ có cách "khóa tài khoản" (tăng `tokenVersion`) để đá người dùng ra.

---

## 1. Mô tả Story (User Story)
* **Là một:** Admin (và mỗi thành viên với thiết bị của chính mình).
* **Tôi muốn:** Xem tài khoản đang đăng nhập trên những thiết bị nào, rồi đăng xuất từng thiết bị hoặc tất cả.
* **Để:** Xử lý nhanh khi mất điện thoại hoặc nghi lộ tài khoản mà không phải khóa người dùng.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story 14.5: `refreshSessions`, xoay `jti`.
* Story 13.2: `tokenVersion`, bộ nhớ phiên 30 giây trong `resolveSession`.
* Story 16.2: `utils/user-agent.ts`, ghi nhật ký.
* Story 16.3: trang Hồ sơ 360°.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Danh sách thiết bị
* **Given** Admin mở Hồ sơ 360° của 1 thành viên
* **Then** thấy mục "Thiết bị đang đăng nhập". Mỗi phiên còn hạn gồm:
  * thiết bị ("iPhone · Safari", "Windows · Chrome");
  * IP gần nhất;
  * thời điểm đăng nhập;
  * lần dùng cuối (tương đối).
* **And** phiên đăng nhập trước khi có Story này (thiếu thông tin) hiện "Thiết bị không xác định", vẫn thu hồi được.

### AC2 — Đăng xuất 1 thiết bị
* **Given** Admin bấm `[Đăng xuất thiết bị này]` và xác nhận
* **Then** phiên bị gỡ khỏi `refreshSessions`, và thiết bị đó **mất quyền ngay ở request API kế tiếp**, chậm nhất ≈ 30 giây do bộ nhớ phiên.
* **And** các thiết bị khác của người đó không bị ảnh hưởng.

### AC3 — Đăng xuất tất cả
* `[Đăng xuất tất cả thiết bị]` tăng `tokenVersion` và xoá `refreshSessions`. **Không khóa tài khoản**: người dùng đăng nhập lại được ngay.

### AC4 — Thành viên tự quản lý
* Trong Hồ sơ cá nhân (menu Tài khoản), mỗi người thấy danh sách thiết bị của mình. Thiết bị đang dùng có nhãn "Thiết bị này" và không có nút đăng xuất (đã có nút Đăng xuất chung).
* Mỗi người tự đăng xuất được thiết bị khác của mình.

### AC5 — Ghi nhận & thông báo
* Mỗi lần đăng xuất từ xa ghi nhật ký `REVOKE_SESSION` / `REVOKE_ALL_SESSIONS` (nhóm ACCOUNT, mức Bảo mật), kèm thiết bị bị đăng xuất.
* Khi Admin đăng xuất thiết bị của người khác, chủ tài khoản nhận thông báo trong app: "Quản trị viên đã đăng xuất tài khoản của bạn trên [thiết bị]".

### AC6 — Không ghi DB thừa
* `lastUsedAt` và `ip` chỉ cập nhật khi **xoay refresh token** (khoảng mỗi giờ / mỗi lần mở app), không cập nhật ở mỗi request.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend
* **`backend/src/modules/auth/user.model.ts`:** phần tử `refreshSessions` thêm `userAgent?`, `ip?`, `createdAt?`, `lastUsedAt?`.
* **`backend/src/modules/auth/auth.service.ts`:**
  * Khi tạo phiên (`login`): lưu `userAgent` (cắt 200 ký tự), `ip`, `createdAt`, `lastUsedAt`.
  * Khi xoay phiên (`refresh`): cập nhật `lastUsedAt`, `ip`.
  * `generateTokens`: access token thêm `sid` = `jti` hiện tại của phiên.
  * Lưu ý khi xoay: access token cũ mang `sid` = jti cũ, nên khi kiểm tra phải chấp nhận cả `jti` và `prevJti` còn trong thời gian ân hạn.
* **`backend/src/middlewares/auth.ts`:**
  * `SessionState` thêm `sids: Set<string>` (jti + prevJti của các phiên còn hạn), lấy cùng câu truy vấn hiện có (`select('role status tokenVersion refreshSessions.jti refreshSessions.prevJti')`).
  * Token có `sid` mà không thuộc `sids` thì trả lỗi phiên hết hạn.
  * Token cũ không có `sid` vẫn được chấp nhận (tương thích ngược, hết hạn sau ≤ 1 giờ).
  * Khi thu hồi phiên phải **xoá bộ nhớ phiên của user đó** (đã có hàm xoá dùng cho 13.2; nếu chưa có thì thêm `invalidateSession(userId)`).
* **`backend/src/modules/users/session.service.ts` (mới):** `listSessions(userId, currentSid?)`, `revokeSession(userId, jti, actor)`, `revokeAll(userId, actor)`.
* **Routes:**
  * Admin: `GET /users/:id/sessions`, `DELETE /users/:id/sessions/:jti`, `DELETE /users/:id/sessions`.
  * Bản thân: `GET /users/me/sessions`, `DELETE /users/me/sessions/:jti`.
  * **Không trả `jti` thật cho client.** Trả mã băm ngắn (`sha256(jti).slice(0, 12)`) làm id; server so khớp bằng băm.
* **`notification.model.ts`:** thêm loại `SESSION_REVOKED`.

### Frontend
* **`frontend/src/components/admin/SessionList.tsx` (mới):** dùng chung cho Hồ sơ 360° và Hồ sơ cá nhân. Nút xác nhận dùng `BottomSheet` / dialog sẵn có. Icon thiết bị lấy từ lucide (`Smartphone`, `Monitor`, `Tablet`).
* **`AdminUserDetailPage.tsx`, trang / sheet Hồ sơ cá nhân:** gắn `SessionList`.
* **`frontend/src/api/*`:** gọi API mới.

---

## 5. Kiểm thử & Định nghĩa hoàn thành (DoD)
* [ ] Đăng nhập cùng tài khoản trên 2 "thiết bị" (2 userAgent). Thu hồi thiết bị A thì request kế tiếp của A bị 401 (≤ 30 giây), B vẫn hoạt động.
* [ ] Thu hồi tất cả thì cả 2 máy bị 401, đăng nhập lại được, tài khoản vẫn ACTIVE.
* [ ] Đang xoay token đồng thời (grace window 14.5) vẫn không bị đá oan.
* [ ] Token cũ không có `sid` vẫn dùng được tới khi hết hạn.
* [ ] API không bao giờ trả `jti` / `prevJti` thật.
* [ ] Nhật ký và thông báo được tạo đúng.
* [ ] `tsc --noEmit` hai phía sạch, build frontend thành công. Giao diện đạt checklist ở 390px / 1280px.
