# STORY 18.2: Phiên Chờ Đăng Nhập Bền Qua Khởi Động Lại (Persistent Pending Telegram Login)

**Bối cảnh:** `docs/stories/EPIC_18_RELIABLE_TELEGRAM_ACCOUNT_LINKING.md` (Story 18.2).
`pendingAuths` (OTP) và `pendingQrAuths` (QR) trong `telegram-userbot.service.ts` chỉ nằm trong RAM. Render gói miễn phí ngủ sau ~15 phút không dùng và khởi động lại mỗi lần deploy → client đã gửi mã biến mất, người dùng nhập đúng mã vẫn nhận "Mã OTP đã hết hạn". Mã OTP gắn với **auth key** của client đã gửi mã, nên muốn xác thực sau khởi động lại phải khôi phục đúng client đó (qua `StringSession` của nó).

---

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý / Admin đang kết nối Telegram.
* **Tôi muốn:** Nhập mã vừa nhận vẫn kết nối được dù máy chủ vừa khởi động lại.
* **Để:** Không phải gửi mã lại nhiều lần (dễ bị Telegram khóa gửi mã hàng giờ — FLOOD_WAIT).

---

## 2. Tiền điều kiện (Pre-conditions)
* `JWT_SECRET` đã cấu hình trên Render (khóa mã hóa của `encryptSession` được dẫn xuất từ biến này — không cần biến mới). **Lưu ý:** đổi `JWT_SECRET` sẽ làm mọi phiên Telegram đã lưu không giải mã được → người dùng phải kết nối lại.
* Story 18.1 trả về thông tin kênh gửi (lưu kèm bản ghi chờ để hiển thị lại sau khi tải lại trang).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Khôi phục sau khởi động lại
* **Given** người dùng đã gửi mã OTP
* **When** Render khởi động lại trước khi người dùng nhập mã
* **Then** nhập đúng mã vẫn kết nối thành công (máy chủ khôi phục client từ session tạm trong DB rồi gọi `auth.SignIn`).

### AC2 — Hết hạn rõ ràng
* **Given** bản ghi chờ quá 10 phút
* **Then** trả *"Mã đã hết hạn, vui lòng gửi mã mới"* (mã lỗi `TELEGRAM_CODE_EXPIRED`), không phải lỗi chung.

### AC3 — Dọn dẹp & bảo mật
* **Given** kết nối thành công, bấm "Đổi số", hoặc gửi mã mới
* **Then** bản ghi chờ cũ bị xóa; mỗi người tối đa 1 bản ghi.
* **And** session tạm **luôn mã hóa** (AES-GCM qua `encryptSession`), **không bao giờ** trả về trình duyệt, không log.

### AC4 — Tải lại trang vẫn ở bước nhập mã
* **Given** đã gửi mã rồi tải lại trang
* **Then** `GET /status` trả `pendingLogin: { phoneMasked, delivery, expiresAt }` → trang mở thẳng bước nhập mã.

### AC5 — QR cũng bền
* **Given** đang chờ quét QR
* **When** máy chủ khởi động lại
* **Then** lượt kiểm tra kế tiếp khôi phục client QR từ DB và tiếp tục (hoặc báo "Mã QR đã hết hạn, tạo mã mới" nếu token quá hạn).

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/modules/ingestion/telegram-pending-login.model.ts` (mới):**
  - Schema `{ userId (unique), kind: 'OTP' | 'QR', encryptedSession, iv, tag, phone?, phoneCodeHash?, delivery?, expiresAt }`, TTL index trên `expiresAt`, collection `telegram_pending_logins`.
  - Hàm `savePendingLogin`, `loadPendingLogin`, `deletePendingLogin`.
* **`backend/src/modules/ingestion/telegram-userbot.service.ts`:**
  - Sau `SendCode` / `ExportLoginToken`: lưu session tạm (`client.session.save()` → `encryptSession`).
  - `verifyAuthCode` / `checkQrAuth`: lấy client trong RAM, nếu không có → khôi phục từ DB (`newClient(decryptSession(...))` + `connect()`).
  - Bỏ dần `pendingAuths` / `pendingQrAuths` thành bộ nhớ đệm phụ (RAM trước, DB sau).
  - `getStatus`: thêm `pendingLogin` (số điện thoại che 3 số giữa).
* **Không thêm biến môi trường.**

### Frontend:
* **`TelegramConnectCard.tsx`:** nếu `session.pendingLogin` có → vào thẳng bước nhập mã, hiện kênh gửi + thời gian còn lại.
* **`telegramUserbotApi.ts`:** kiểu `pendingLogin` trong `TelegramSessionStatus`.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Local: gửi mã → tắt/bật lại backend → nhập mã → kết nối thành công.
* [ ] Quá 10 phút → thông báo hết hạn đúng; bản ghi tự xóa (TTL).
* [ ] Kiểm tra DB: trường session tạm là chuỗi mã hóa, không đọc được.
* [ ] Tải lại trang giữa chừng → vẫn ở bước nhập mã.
* [ ] Backend `tsc --noEmit`, frontend build không lỗi.
