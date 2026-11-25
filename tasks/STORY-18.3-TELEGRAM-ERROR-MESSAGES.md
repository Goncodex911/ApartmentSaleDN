# STORY 18.3: Thông Báo Lỗi Telegram Rõ Ràng Bằng Tiếng Việt (Telegram Error Messages)

**Bối cảnh:** `docs/stories/EPIC_18_RELIABLE_TELEGRAM_ACCOUNT_LINKING.md` (Story 18.3).
Lỗi Telegram hiện ra nguyên văn tiếng Anh (`401: SESSION_REVOKED (caused by messages.GetDialogs)`) hoặc chung chung ("Có lỗi xảy ra", "Mã xác thực Telegram không đúng hoặc đã hết hạn" cho mọi trường hợp). Người dùng không biết nên chờ, gửi lại mã, đổi cách đăng nhập hay báo Admin.

---

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý / Admin kết nối và dùng Telegram trong hệ thống.
* **Tôi muốn:** Mỗi lỗi Telegram hiện bằng tiếng Việt kèm việc cần làm.
* **Để:** Tự xử lý được mà không cần hỏi kỹ thuật, và không làm sai khiến tài khoản bị khóa lâu hơn.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story 18.1 / 18.2 dùng chung hàm ánh xạ lỗi của story này.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Bảng ánh xạ lỗi
* **Given** Telegram trả lỗi RPC trong luồng đăng nhập / cào tin
* **Then** API trả `{ success: false, message: <tiếng Việt>, code: <mã nội bộ>, retryAfterSec? }` theo bảng:

| Lỗi Telegram | Thông điệp | `code` |
|---|---|---|
| `PHONE_NUMBER_INVALID` | Số điện thoại không đúng định dạng Telegram (VD 0905 123 456) | `TELEGRAM_PHONE_INVALID` |
| `PHONE_CODE_INVALID` | Mã không đúng, vui lòng kiểm tra lại | `TELEGRAM_CODE_INVALID` |
| `PHONE_CODE_EXPIRED` / `PHONE_CODE_EMPTY` | Mã đã hết hạn, vui lòng gửi mã mới | `TELEGRAM_CODE_EXPIRED` |
| `FLOOD_WAIT_X` / `FLOOD_PREMIUM_WAIT_X` | Thử quá nhiều lần, Telegram tạm khóa. Vui lòng chờ **X phút** | `TELEGRAM_FLOOD_WAIT` (+ `retryAfterSec`) |
| `PHONE_NUMBER_BANNED` / `USER_DEACTIVATED` / `USER_DEACTIVATED_BAN` | Tài khoản Telegram đang bị hạn chế. Hãy dùng cách chuyển tiếp bài cho Bot | `TELEGRAM_ACCOUNT_RESTRICTED` |
| `PHONE_NUMBER_UNOCCUPIED` | Số này chưa đăng ký Telegram | `TELEGRAM_PHONE_UNREGISTERED` |
| `PASSWORD_HASH_INVALID` | Mật khẩu xác thực 2 lớp (2FA) không đúng | `TELEGRAM_2FA_INVALID` |
| `SESSION_PASSWORD_NEEDED` | Tài khoản bật xác thực 2 lớp, nhập thêm mật khẩu 2FA | `TELEGRAM_2FA_REQUIRED` |
| `API_ID_INVALID` / `API_ID_PUBLISHED_FLOOD` | Cấu hình ứng dụng Telegram trên máy chủ không hợp lệ — báo Admin | `TELEGRAM_APP_CONFIG` |
| `SESSION_REVOKED` / `AUTH_KEY_UNREGISTERED` / `AUTH_KEY_DUPLICATED` | (đã có) Telegram đã thu hồi phiên, vui lòng kết nối lại | `TELEGRAM_SESSION_DEAD` |
| `AUTH_RESTART` | Tự thử lại 1 lần; vẫn lỗi → "Telegram yêu cầu bắt đầu lại, gửi mã mới" | `TELEGRAM_AUTH_RESTART` |
| Khác | Telegram đang gặp sự cố, thử lại sau ít phút (kèm mã lỗi gốc để báo Admin) | `TELEGRAM_UNKNOWN` |

### AC2 — Khóa nút khi bị FLOOD_WAIT
* **Given** nhận `TELEGRAM_FLOOD_WAIT` với `retryAfterSec`
* **Then** nút "Gửi mã" / "Xác nhận" bị khóa, hiện đếm ngược "Thử lại sau 12:30"; tải lại trang vẫn giữ đếm ngược (lưu thời điểm mở khóa ở `localStorage`, bọc try/catch).

### AC3 — Ghi Sức khỏe hệ thống
* **Given** lỗi thuộc nhóm hệ thống (`TELEGRAM_APP_CONFIG`, `TELEGRAM_UNKNOWN`)
* **Then** gọi `record('telegram', 'error', ...)` để Admin thấy trong Sức khỏe hệ thống; lỗi do người dùng (mã sai, 2FA sai) **không** ghi.

### AC4 — Không lộ dữ liệu
* **Then** thông điệp không chứa số điện thoại đầy đủ, mã, token, stack trace.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/modules/ingestion/telegram-errors.ts` (mới, ~80 dòng):** `toTelegramError(err): TelegramUserError` (class có `code`, `retryAfterSec`), đọc `err.errorMessage` / `err.seconds` của gramjs `RPCError` / `FloodWaitError`.
* **`telegram-userbot.service.ts`:** bọc `sendAuthCode`, `verifyAuthCode`, `checkQrAuth`, `resolveAndJoinChat` bằng `toTelegramError`.
* **`telegram-userbot.controller.ts`:** hàm `handle` trả thêm `retryAfterSec` khi có.

### Frontend:
* **`TelegramConnectCard.tsx`:** đếm ngược + khóa nút theo `retryAfterSec`.
* **`frontend/src/hooks/useCountdown.ts` (mới, nếu chưa có):** đếm ngược dùng chung cho 18.1 (gửi lại) và 18.3 (FLOOD_WAIT).

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Unit test nhỏ cho `toTelegramError` với các mã lỗi trong bảng (chạy bằng `tsx`).
* [ ] Nhập sai mã → "Mã không đúng"; mã cũ → "Mã đã hết hạn".
* [ ] Giả lập `FLOOD_WAIT_600` → nút khóa, đếm ngược 10:00.
* [ ] Không còn chuỗi lỗi tiếng Anh thô hiện cho người dùng trong luồng kết nối.
* [ ] Backend `tsc --noEmit`, frontend build không lỗi.
