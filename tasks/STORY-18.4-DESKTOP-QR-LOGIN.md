# STORY 18.4: QR Đăng Nhập Chuẩn Cho Máy Tính (Desktop QR Login)

**Bối cảnh:** `docs/stories/EPIC_18_RELIABLE_TELEGRAM_ACCOUNT_LINKING.md` (Story 18.4).
Cách "Xác nhận 1-chạm" hiện tại chỉ có nút mở `tg://login?token=…` (QR đã gỡ vì trước đây tạo qua `api.qrserver.com` → lộ token đăng nhập). Telegram nhiều khả năng **chỉ chấp nhận token đăng nhập khi quét QR bằng camera trong Telegram** (Cài đặt → Thiết bị → Liên kết thiết bị máy tính). Token hết hạn sau ~30 giây (`expires`), nhưng giao diện giữ link cũ. Kết quả Story 18.0 quyết định có giữ nút mở link trên điện thoại hay không.

---

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý / Admin dùng máy tính.
* **Tôi muốn:** Quét mã QR trên màn hình bằng Telegram trên điện thoại.
* **Để:** Kết nối Telegram không cần chờ mã OTP.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story 18.0 đã có kết quả thử link 1-chạm và quét QR.
* Story 18.2: phiên chờ QR lưu DB.
* Đã được duyệt cài gói **`qrcode`** (frontend, ~30KB, mã nguồn mở, MIT) + `@types/qrcode` (dev).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — QR vẽ tại trình duyệt
* **Given** người dùng chọn tab "Quét QR" trên máy tính
* **Then** QR chứa `tg://login?token=…` được vẽ **ngay trên trình duyệt** bằng thư viện `qrcode` (canvas / SVG), **không gửi token tới bất kỳ dịch vụ ngoài nào**.
* **And** QR có viền trắng đủ rộng, kích thước ≥ 200px, hiện được ở chế độ tối.

### AC2 — Token luôn còn hạn
* **Given** token sắp hết hạn (còn ≤ 5 giây theo `expires`)
* **Then** máy chủ tự gọi lại `ExportLoginToken`, lượt hỏi trạng thái kế tiếp trả token mới, QR vẽ lại (không nháy trắng — đổi nội dung tại chỗ).
* **And** máy chủ nghe `UpdateLoginToken` để phản hồi ngay khi điện thoại quét (không đợi lượt hỏi 2,5 giây).

### AC3 — Hướng dẫn theo thiết bị
* **Given** mở trang trên máy tính (`pointer: fine`)
* **Then** mặc định tab **Quét QR**, hướng dẫn 3 bước: *Mở Telegram trên điện thoại → Cài đặt → Thiết bị → **Liên kết thiết bị máy tính** → quét mã này*.
* **Given** mở trên điện thoại (`pointer: coarse`)
* **Then** mặc định tab **Mã OTP**; nút "Mở Telegram để xác nhận" **chỉ hiển thị nếu Story 18.0 chứng minh hoạt động**, nếu không thì bỏ hẳn.

### AC4 — 2FA
* **Given** tài khoản bật xác thực 2 lớp
* **When** quét QR thành công
* **Then** hiện ô mật khẩu 2FA (đã có), nhập đúng → kết nối; sai → "Mật khẩu 2FA không đúng" (Story 18.3).

### AC5 — Dừng khi bỏ dở
* **Given** QR hiển thị quá 2 phút không ai quét, hoặc người dùng rời trang
* **Then** ngừng làm mới token, đóng kết nối Telegram tạm trên máy chủ, hiện nút "Tạo mã mới".

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`telegram-userbot.service.ts`:**
  - `startQrAuth`: trả `{ tgUrl, expiresAt }`; đăng ký handler `UpdateLoginToken` trên client chờ.
  - `checkQrAuth`: nếu token còn ≤ 5 giây → `ExportLoginToken` mới, trả `{ status: 'WAITING', tgUrl, expiresAt }`; ghi nhớ thời điểm bắt đầu, quá 2 phút → đóng client, trả `EXPIRED`.
* **`telegram-userbot.controller.ts`:** response `check` thêm `tgUrl`, `expiresAt` khi token đổi.

### Frontend:
* **Cài gói:** `npm install qrcode` + `npm install -D @types/qrcode` trong `frontend/`.
* **`frontend/src/components/admin/telegram/TelegramQrLogin.tsx` (mới):** vẽ QR (`QRCode.toCanvas` / `toString({ type: 'svg' })`), hướng dẫn 3 bước, đồng hồ còn lại, nút "Tạo mã mới".
* **`TelegramConnectCard.tsx`:** tab "Quét QR" (máy tính) dùng component mới; tab mặc định theo thiết bị; tách bớt để file ≤ 250 dòng.
* **`telegramUserbotApi.ts`:** kiểu kết quả `checkQrAuth` có `tgUrl`, `expiresAt`.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Máy tính Chrome: quét QR bằng iPhone và Android → kết nối thành công.
* [ ] Để QR 1 phút → QR tự đổi, quét mã mới vẫn thành công.
* [ ] Tài khoản 2FA: nhập mật khẩu sau khi quét → kết nối.
* [ ] DevTools Network: **không có** request nào gửi token ra ngoài `onrender.com`.
* [ ] Điện thoại: mặc định tab OTP.
* [ ] Frontend `tsc` + `npm run build` không lỗi; bundle tăng ≤ 40KB.
