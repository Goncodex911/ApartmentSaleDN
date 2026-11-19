# STORY 14.5: Gia Cố Đăng Nhập, Phiên & Upload (Login, Session & Upload Hardening)

**Bối cảnh:** Epic 14, phát hiện #8, #9, #10 trong đợt rà soát 20/11/2026.
* **Đăng nhập / đăng ký:** không giới hạn số lần thử, trong khi mật khẩu tối thiểu chỉ 6 ký tự. Tài khoản Quản lý xem được SĐT chủ nhà nên là mục tiêu dò mật khẩu.
* **Đăng xuất:** chỉ xóa cookie (`auth.controller.ts:74`). Refresh token cũ, nếu bị lộ, vẫn dùng được thêm 7 ngày.
* **Upload:** giới hạn 6 lượt/giờ của CTV đếm theo **lần xin chữ ký Cloudinary**, nhưng một chữ ký hiện dùng được không giới hạn số file trong khoảng 1 giờ. CTV có thể đốt hết hạn mức Cloudinary miễn phí.

---

## 1. Mô tả Story (User Story)
* **Là một:** Chủ hệ thống.
* **Tôi muốn:** Tài khoản không bị dò mật khẩu, đăng xuất là hết phiên thật trên thiết bị đó, và CTV không vượt được giới hạn tải ảnh.
* **Để:** Giảm rủi ro chiếm tài khoản Quản lý và bảo vệ hạn mức Cloudinary.

---

## 2. Tiền điều kiện (Pre-conditions)
* Đã có `middlewares/rate-limit.ts` (bộ đếm trong bộ nhớ, có `key`), `normalizeVnPhone`, `randomCode`, `tokenVersion` (Story 13.2).
* Không cần cấu hình mới, không thêm thư viện.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Giới hạn đăng nhập & đăng ký
* **Theo SĐT:** tối đa 10 lần đăng nhập sai / 15 phút → lần thứ 11 trả 429 "Bạn thử quá nhiều lần, vui lòng chờ X phút" kèm header `Retry-After`. Đăng nhập **đúng** thì xóa bộ đếm của SĐT đó.
* **Theo IP:** tối đa 30 lần gọi `/auth/login` / 15 phút.
* **Đăng ký:** tối đa 5 lần / giờ / IP.
* SĐT đếm theo dạng đã chuẩn hóa: `+84 905…` và `0905…` là cùng một bộ đếm.
* Màn hình đăng nhập hiện đúng câu báo lỗi 429 từ server.

### AC2 — Đăng xuất thu hồi phiên của thiết bị đó
* **Given** cùng tài khoản đăng nhập trên máy A và máy B
* **When** đăng xuất trên máy A
* **Then** dùng lại refresh token cũ của A → 401; máy B vẫn dùng bình thường.
* Mỗi lần refresh cấp refresh token mới và vô hiệu token cũ (xoay vòng).
* Token cũ vẫn được chấp nhận trong **60 giây** sau khi xoay, để 2 tab hoặc PWA refresh cùng lúc không bị đăng xuất oan.
* Đổi mật khẩu, Admin reset mật khẩu hoặc khóa tài khoản → mọi phiên bị thu hồi (giữ cơ chế `tokenVersion`). Đổi mật khẩu vẫn giữ phiên của thiết bị đang dùng (Story 13.9).
* Mỗi tài khoản giữ tối đa 10 phiên; quá thì bỏ phiên cũ nhất.
* **Tương thích ngược:** refresh token cấp trước khi triển khai (chưa có `jti`) được chấp nhận **1 lần** và đổi sang token mới, nên người đang dùng không bị đăng xuất hàng loạt.

### AC3 — Một chữ ký = một file
* Mỗi file tải lên Cloudinary dùng một chữ ký riêng, ký kèm `public_id` ngẫu nhiên và `overwrite: false`. Dùng lại chữ ký đó lần 2 không tạo thêm file mới.
* Mỗi lần xin chữ ký nhận tối đa 10 chữ ký (đúng số file định tải). CTV vẫn giới hạn 6 lần / giờ, tức tối đa 60 file / giờ. Quản lý / ADMIN không giới hạn.
* Chọn hơn 10 file một lần → app tự chia thành nhiều lượt xin chữ ký. Tải lỗi một file không làm hỏng các file khác (giữ hành vi Story 10.2).

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/middlewares/rate-limit.ts`:**
  - Tách bộ đếm thành `createCounter({ windowMs, max })` gồm `hit(key)` (trả số giây phải chờ, hoặc 0 nếu còn lượt) và `reset(key)`.
  - `rateLimit(...)` dùng lại bộ đếm này và thêm tùy chọn `resetOnSuccess` (khi `res.statusCode < 400` lúc `finish` thì gọi `reset(key)`).
  - Story 14.7 dùng lại `createCounter`.
* **`backend/src/modules/auth/auth.routes.ts`:**
  - `/login`: limiter theo IP (30/15 phút) + limiter theo SĐT (10/15 phút, `resetOnSuccess`).
  - `/register`: 5/giờ/IP.
* **`backend/src/modules/auth/user.model.ts`:**
  - Thêm `refreshSessions: [{ jti, prevJti?, rotatedAt?, expiresAt }]` (`_id: false`).
  - `toJSON` xóa trường này, không trả ra client.
* **`backend/src/modules/auth/auth.service.ts`:**
  - `generateTokens(user, jti)`: refresh token mang `jti`.
  - Thêm `openSession(user)`: tạo `jti` bằng `randomCode`. Ghi **nguyên tử** bằng `$push` + `$each` + `$slice: -10`, và `$pull` phiên hết hạn ở lệnh riêng (không dùng `user.save()` để tránh ghi đè khi đăng nhập song song). Dùng ở `register`, `login`, `changePassword`.
  - `refresh`:
    - Token có `jti` khớp phiên → xoay (`prevJti = jti`, `jti` mới, `rotatedAt = now`).
    - Khớp `prevJti` trong vòng 60 giây → trả token mang `jti` hiện tại, không xoay thêm.
    - Không khớp → 401.
    - Token chưa có `jti` (cấp trước khi triển khai) → mở phiên mới (AC2 tương thích ngược).
  - Thêm `logout(refreshToken?)`: giải mã (lỗi thì bỏ qua) rồi `$pull` phiên theo `jti`.
* **`backend/src/modules/auth/auth.controller.ts`:** `logout` gọi `AuthService.logout(req.cookies?.refreshToken)` trước khi xóa cookie; lỗi thì vẫn xóa cookie và trả 200.
* **`backend/src/modules/users/user.service.ts`:** `updateStatus(BLOCKED)` và `resetPassword` thêm `$set: { refreshSessions: [] }`. `auth.service.changePassword` làm tương tự trước khi mở phiên mới.
* **`backend/src/config/cloudinary.ts`:** `signDirectUpload(folder, count)` trả về mảng `count` chữ ký. Mỗi chữ ký ký `{ allowed_formats, folder, overwrite: false, public_id, timestamp }` với `public_id` từ `randomCode(16)`.
* **`backend/src/modules/apartments/apartment.controller.ts`:** `uploadSignature` đọc `count` từ body (zod: số nguyên 1–10, mặc định 1).

### Frontend:
* **`frontend/src/api/mediaUpload.ts`:**
  - `getUploadSignatures(count)` trả về mảng.
  - `uploadToCloudinary` gửi thêm `public_id` và `overwrite=false` của chữ ký đi kèm file.
* **`frontend/src/components/apartment/PhotoUploader.tsx`:** chia file thành nhóm 10, mỗi nhóm xin chữ ký một lần, mỗi file dùng đúng một chữ ký.
* **`frontend/src/pages/LoginPage.tsx`:** chỉ kiểm tra lại rằng 429 hiện `err.response.data.message`; sửa nếu đang hiện câu chung.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Đăng nhập:
  - Sai 10 lần → lần 11 trả 429 có `Retry-After`.
  - Thử với `+84…` cùng số → vẫn 429.
  - Chờ hết hạn hoặc đúng mật khẩu → bộ đếm về 0.
  - Đăng ký lần 6 trong giờ → 429.
* [ ] Phiên:
  - Đăng nhập 2 "máy" (2 cookie jar `curl`), đăng xuất A → refresh A trả 401, refresh B trả 200.
  - Refresh 2 lần song song cùng cookie → cả hai 200.
  - Refresh token cũ quá 60 giây sau khi xoay → 401.
  - Token tạo thủ công không có `jti` → 200 lần đầu.
  - Khóa tài khoản → refresh trả 401.
* [ ] Upload:
  - Xin 3 chữ ký → nhận 3.
  - Tải 2 file bằng cùng một chữ ký → file thứ 2 không tạo resource mới.
  - CTV xin lần thứ 7 trong giờ → 429.
  - Puppeteer chọn 12 ảnh → đủ 12 ảnh lên form.
* [ ] `tsc` 2 phía + build production không lỗi.
* [ ] Báo cáo và đề xuất commit, chờ duyệt.

---

## 6. Rủi ro & lựa chọn
* **Bộ đếm nằm trong bộ nhớ:** Render khởi động lại thì bộ đếm về 0. Mức này đủ cho 1 instance. Chạy nhiều instance thì cần Redis (ghi chú sẵn trong `rate-limit.ts`).
* **Kẻ xấu cố tình khóa đăng nhập của người khác** (gõ sai 10 lần bằng SĐT của họ) chỉ khóa 15 phút, và người đó vẫn đăng nhập được từ thiết bị đang mở sẵn. Chấp nhận được.
* **Lưu phiên trên User:** mỗi lần refresh (khoảng mỗi giờ khi đang dùng app) ghi DB thêm 1 lần, không đáng kể với gói Atlas free.
* **Hành vi `overwrite: false` của Cloudinary:** cần xác nhận khi làm. Nếu tải lần 2 cùng `public_id` trả về file cũ thay vì báo lỗi thì vẫn đạt AC3, vì không phát sinh dung lượng mới.
