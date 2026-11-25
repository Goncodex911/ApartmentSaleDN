# STORY 18.1: OTP Đúng Kênh Gửi & Gửi Lại Mã (OTP Delivery Channel & Resend)

**Bối cảnh:** `docs/stories/EPIC_18_RELIABLE_TELEGRAM_ACCOUNT_LINKING.md` (Story 18.1).
Hiện trang luôn ghi "Telegram vừa gửi mã vào **ứng dụng Telegram**" dù Telegram có thể gửi qua email, SMS, cuộc gọi, Fragment, hoặc yêu cầu thiết lập email trước. Nguyên nhân: `client.sendCode()` của gramjs chỉ trả `isCodeViaApp`. Telegram trả đủ thông tin trong `auth.SentCode { type, nextType, timeout }` (gramjs 2.26.22 hỗ trợ: `SentCodeTypeApp`, `Sms`, `Call`, `FlashCall`, `MissedCall`, `EmailCode{emailPattern,length}`, `SetUpEmailRequired`, `FragmentSms{url}`, `FirebaseSms`, `SmsWord`, `SmsPhrase`).

---

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý / Admin kết nối Telegram cá nhân.
* **Tôi muốn:** Biết mã đăng nhập được gửi ở đâu, và gửi lại qua kênh khác khi chưa nhận được.
* **Để:** Không phải đoán, không chờ vô ích, không bấm gửi mã liên tục đến mức bị Telegram tạm khóa.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story 18.0 đã ghi nhận được loại kênh gửi mã thực tế (để ưu tiên kiểm thử đúng kênh).
* Story 18.2 làm song song (phiên chờ lưu DB) — `phoneCodeHash` và loại kênh lưu cùng bản ghi chờ.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Gửi vào ứng dụng Telegram
* **Given** Telegram trả `SentCodeTypeApp`
* **Then** trang hiện: *"Mã đã gửi vào **ứng dụng Telegram** (chat **Telegram** có dấu tích xanh) trên thiết bị bạn đang đăng nhập."*

### AC2 — Gửi qua email
* **Given** Telegram trả `SentCodeTypeEmailCode` kèm `emailPattern` (VD `ng*******b@gmail.com`)
* **Then** trang hiện: *"Mã đã gửi tới email **ng\*\*\*b@gmail.com**. Xem cả thư mục Spam / Quảng cáo."*
* **And** ô nhập mã chấp nhận đúng độ dài `length` Telegram trả về.

### AC3 — SMS / cuộc gọi / Fragment / Firebase
* **Given** `SentCodeTypeSms` / `Call` / `FlashCall` / `MissedCall` / `FragmentSms` / `FirebaseSms` / `SmsWord` / `SmsPhrase`
* **Then** trang ghi đúng kênh bằng tiếng Việt; `FragmentSms` kèm nút mở `url`; `MissedCall` ghi "Nhập các số cuối của cuộc gọi nhỡ (bắt đầu bằng `prefix`)".
* **And** `FirebaseSms` (ứng dụng bên thứ ba không xác minh được) → tự gọi `auth.ResendCode` sang `nextType` nếu có; nếu không có → báo *"Telegram không gửi được mã cho ứng dụng này, hãy dùng cách quét QR trên máy tính hoặc chuyển tiếp bài cho Bot"*.

### AC4 — Bắt buộc thiết lập email
* **Given** `SentCodeTypeSetUpEmailRequired`
* **Then** trang hướng dẫn: *"Mở ứng dụng Telegram → Cài đặt → Quyền riêng tư & Bảo mật → **Email đăng nhập**, thiết lập email rồi bấm Gửi lại."* và nút "Gửi lại".

### AC5 — Gửi lại qua kênh khác
* **Given** có `nextType` và `timeout`
* **When** đếm ngược `timeout` giây kết thúc
* **Then** hiện nút **"Gửi lại qua SMS"** / **"Gọi điện đọc mã"** (theo `nextType`), gọi `auth.ResendCode`, cập nhật kênh mới lên trang.
* **And** trong lúc đếm ngược nút bị khóa, hiện "Gửi lại sau 0:45".

### AC6 — Đổi số / hủy mã
* **Given** người dùng bấm "Đổi số điện thoại"
* **Then** máy chủ gọi `auth.CancelCode` cho mã đang chờ và xóa phiên chờ (Story 18.2).

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/modules/ingestion/telegram-login-code.util.ts` (mới, ~80 dòng):**
  - `describeSentCode(sent: Api.auth.SentCode)` → `{ channel: 'APP' | 'SMS' | 'EMAIL' | 'CALL' | 'MISSED_CALL' | 'FRAGMENT' | 'SETUP_EMAIL' | 'FIREBASE', length?, emailPattern?, fragmentUrl?, missedCallPrefix?, nextChannel?, timeoutSec? }`.
* **`backend/src/modules/ingestion/telegram-userbot.service.ts`:**
  - `sendAuthCode`: `client.invoke(new Api.auth.SendCode(...))`, xử lý `SentCodeSuccess` (đã đăng nhập ngay), trả `delivery`.
  - `resendAuthCode(userId)`: `auth.ResendCode({ phoneNumber, phoneCodeHash })`, cập nhật `phoneCodeHash` mới.
  - `cancelAuthCode(userId)`: `auth.CancelCode`, xóa phiên chờ.
* **`telegram-userbot.controller.ts` + `telegram-userbot.routes.ts`:**
  - `POST /auth/resend-code`, `POST /auth/cancel-code` (cùng quyền ADMIN, MANAGER).
  - Response `send-code` thêm `delivery` (không trả `phoneCodeHash` thừa nếu đã lưu phía máy chủ — giữ tương thích nếu Story 18.2 chưa xong).

### Frontend:
* **`frontend/src/api/telegramUserbotApi.ts`:** kiểu `CodeDelivery`, hàm `resendCode`, `cancelCode`.
* **`frontend/src/components/admin/telegram/TelegramConnectCard.tsx`:**
  - Thông điệp theo `delivery.channel` (bảng chữ tiếng Việt tách ra `telegramDeliveryText.ts` nếu file vượt 250 dòng).
  - Đếm ngược + nút gửi lại; nút "Đổi số" gọi hủy mã.
  - `maxLength` ô mã theo `delivery.length`.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Tài khoản có Login Email: trang ghi đúng "đã gửi tới email ng\*\*\*b@…", nhập mã từ email kết nối được.
* [ ] Tài khoản thường: trang ghi "ứng dụng Telegram", nhập mã kết nối được.
* [ ] Nút gửi lại mở đúng sau `timeout`, chuyển kênh SMS/cuộc gọi hoạt động.
* [ ] "Đổi số điện thoại" hủy mã cũ (mã cũ nhập vào báo hết hạn).
* [ ] Không log mã / hash / email đầy đủ.
* [ ] Backend `tsc --noEmit`, frontend `tsc` + `npm run build` không lỗi; file ≤ 300 dòng.
