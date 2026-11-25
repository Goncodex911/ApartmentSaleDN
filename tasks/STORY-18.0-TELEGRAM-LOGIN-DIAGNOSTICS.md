# STORY 18.0: Chẩn Đoán & Xác Minh Cơ Chế Đăng Nhập Telegram (Telegram Login Diagnostics)

**Bối cảnh:** `docs/stories/EPIC_18_RELIABLE_TELEGRAM_ACCOUNT_LINKING.md` (Story 18.0).
Ngày 26/11/2026: bấm "Gửi mã OTP" trên `apartmentsaledn.pages.dev` → trang báo đã gửi, nhưng **không có mã ở chat Telegram (service notifications) lẫn email đăng nhập**. Xác nhận 1-chạm (`tg://login`) cũng không liên kết được. Thư viện gramjs `client.sendCode()` chỉ trả `isCodeViaApp`, làm mất thông tin kênh gửi → hiện không biết Telegram đã gửi mã đi đâu (hoặc có gửi không). Story này thu thập bằng chứng trước khi sửa.

**Giả thuyết cần kiểm chứng (xếp theo khả năng):**
1. Mã gửi qua **SMS dạng Firebase / SmsWord / SmsPhrase** (`auth.sentCodeTypeFirebaseSms`…) — ứng dụng bên thứ ba không thể hoàn tất xác minh Firebase → mã không bao giờ tới.
2. Mã gửi qua **Fragment** (`sentCodeTypeFragmentSms`) hoặc **cuộc gọi** — người dùng không để ý.
3. `sentCodeTypeSetUpEmailRequired` — Telegram đòi thiết lập email đăng nhập trước, không gửi mã.
4. `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` trên Render là ứng dụng mới đăng ký / khác với bản local → Telegram hạn chế gửi mã cho ứng dụng này.
5. Bị **FLOOD_WAIT** do gửi mã nhiều lần → Telegram âm thầm không gửi.
6. Link `tg://login` bị Telegram **chặn khi mở trực tiếp** (chỉ chấp nhận quét QR trong Telegram).

---

## 1. Mô tả Story (User Story)
* **Là một:** Người phát triển hệ thống.
* **Tôi muốn:** Biết chính xác Telegram trả về gì ở mỗi bước đăng nhập (kênh gửi mã, lỗi, phản hồi link 1-chạm, kết quả quét QR).
* **Để:** Sửa đúng nguyên nhân ở các Story 18.1–18.4 thay vì đoán.

---

## 2. Tiền điều kiện (Pre-conditions)
* Truy cập được **Render → roommaster-api → Logs**.
* Có ít nhất 1 iPhone và 1 Android cài Telegram, 1 máy tính.
* Không gửi mã quá 3 lần / giờ / số điện thoại trong lúc thử (tránh FLOOD_WAIT).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Ghi nhận kênh gửi mã OTP (an toàn)
* **Given** người dùng bấm "Gửi mã OTP"
* **When** Telegram trả `auth.SentCode`
* **Then** log máy chủ ghi 1 dòng dạng `[Telegram login] sentCode type=SentCodeTypeEmailCode next=CodeTypeSms timeout=60 user=<userId>`
* **And** **không** ghi mã, `phoneCodeHash`, số điện thoại đầy đủ hay `email_pattern`.
* **And** nếu Telegram trả lỗi (`FLOOD_WAIT_X`, `PHONE_NUMBER_BANNED`, `API_ID_INVALID`…) → log ghi `errorMessage` (không kèm dữ liệu nhạy cảm).

### AC2 — Xác minh link 1-chạm `tg://login`
* **Given** trang tạo link `tg://login?token=…`
* **When** bấm "Mở Telegram để xác nhận" trên iPhone (Safari) và Android (Chrome)
* **Then** ghi lại phản hồi thực tế của Telegram (hộp thoại xác nhận / cảnh báo "chỉ dùng bằng quét QR" / không phản ứng) kèm ảnh chụp màn hình
* **And** log máy chủ ghi kết quả mỗi lượt `ExportLoginToken` (`LoginToken` / `LoginTokenSuccess` / `LoginTokenMigrateTo` / lỗi).

### AC3 — Xác minh quét QR từ thiết bị khác
* **Given** máy tính hiện QR chứa `tg://login?token=…` (tạo tạm bằng thư viện vẽ QR tại trình duyệt — xem Story 18.4)
* **When** dùng Telegram trên điện thoại: *Cài đặt → Thiết bị → Liên kết thiết bị máy tính* quét QR trong vòng 30 giây
* **Then** ghi lại máy chủ nhận `LoginTokenSuccess` hay `LoginTokenMigrateTo`, có cần 2FA không.

### AC4 — Đối chiếu cấu hình
* **Given** quyền truy cập Render và `backend/.env`
* **Then** xác nhận `TELEGRAM_API_ID` trên Render **giống** ID đã đăng ký tại my.telegram.org (chỉ so 4 số cuối, không chép hash vào báo cáo).

### Đầu ra
* Bảng kết quả 3 kịch bản (OTP / link 1-chạm / QR) + nguyên nhân gốc được xác nhận, đính kèm cuối file này và chuyển sang Story 18.1, 18.4.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/modules/ingestion/telegram-userbot.service.ts`:**
  - Trong `sendAuthCode`: gọi `client.invoke(new Api.auth.SendCode({ phoneNumber, apiId, apiHash, settings: new Api.CodeSettings({}) }))` thay cho `client.sendCode()` (bước đầu của Story 18.1), log `className` của `type` / `nextType` và `timeout`.
  - Trong `checkQrAuth`: log `className` kết quả `ExportLoginToken` khi khác lượt trước (tránh spam log mỗi 2,5 giây).
  - Không log dữ liệu nhạy cảm (mã, hash, token, số điện thoại đầy đủ).

### Không đổi:
* Giao diện, database, biến môi trường.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Log Render hiển thị đúng loại kênh gửi mã khi bấm "Gửi mã OTP".
* [ ] Đã thử link 1-chạm trên iPhone + Android, có ảnh chụp phản hồi.
* [ ] Đã thử quét QR từ máy tính bằng Telegram trên điện thoại.
* [ ] `TELEGRAM_API_ID` trên Render đã đối chiếu.
* [ ] Bảng kết quả + nguyên nhân gốc được ghi vào mục "Kết quả chẩn đoán" bên dưới.
* [ ] `tsc --noEmit` backend không lỗi.

## Kết quả chẩn đoán
*(Điền sau khi thực hiện)*

| Kịch bản | Thiết bị | Telegram trả về | Kết luận |
|---|---|---|---|
| Gửi mã OTP | — | | |
| Link 1-chạm | iPhone | | |
| Link 1-chạm | Android | | |
| Quét QR | Máy tính + điện thoại | | |
