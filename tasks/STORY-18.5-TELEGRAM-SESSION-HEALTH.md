# STORY 18.5: Giữ Phiên Telegram Khỏe & Phát Hiện Phiên Chết Sớm (Telegram Session Health)

**Bối cảnh:** `docs/stories/EPIC_18_RELIABLE_TELEGRAM_ACCOUNT_LINKING.md` (Story 18.5).
PR #32 đã: tự nhận `SESSION_REVOKED` khi gọi Telegram (`withSession`) và đóng kết nối khi máy chủ tắt. Còn thiếu: (1) trang vẫn hiện "Đã kết nối" cho tới khi người dùng thao tác và gặp lỗi; (2) người dùng không được báo khi phiên bị thu hồi lúc vắng mặt (VD bộ đón tin dừng âm thầm); (3) mỗi lần tạo client có thể khác thông số thiết bị, Telegram dễ coi là thiết bị lạ.

---

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý / Admin đã kết nối Telegram.
* **Tôi muốn:** Biết ngay khi kết nối Telegram bị ngắt, và kết nối ít bị Telegram thu hồi.
* **Để:** Không tưởng hệ thống vẫn đang đón tin trong khi thực tế đã dừng.

---

## 2. Tiền điều kiện (Pre-conditions)
* PR #32 (`withSession`, `disconnectAll`) đã lên `main`.
* Hệ thống thông báo trong app (chuông) đã có (`NotificationService`).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Kiểm tra phiên khi mở trang
* **Given** người dùng mở trang Cào tin Telegram, DB ghi đã kết nối
* **When** gọi `GET /status`
* **Then** máy chủ kiểm tra nhẹ bằng `getMe` (kết quả cache 5 phút / người); phiên chết → tự xóa (qua `withSession`) và trả `isConnected: false` kèm thông báo "Kết nối Telegram đã bị ngắt, vui lòng kết nối lại".

### AC2 — Báo khi phiên chết lúc vắng mặt
* **Given** phiên bị phát hiện chết (khi quét, khi đón tin, khi kiểm tra)
* **Then** gửi 1 thông báo chuông cho đúng người: *"Kết nối Telegram đã bị ngắt, bộ đón tin mới đã dừng. Vào Cào tin Telegram để kết nối lại."* (tối đa 1 lần / 6 giờ / người).

### AC3 — Thông số thiết bị cố định
* **Then** mọi client của hệ thống dùng chung `deviceModel: 'ApartmentDN Web'`, `systemVersion: 'Web'`, `appVersion` lấy từ `package.json`, `langCode: 'vi'`, `systemLangCode: 'vi'` (cả lúc đăng nhập lẫn lúc khôi phục phiên).

### AC4 — Thông tin & hướng dẫn trên trang
* **Then** thẻ tài khoản hiện "Kết nối lúc … · kiểm tra lần cuối …".
* **And** dòng hướng dẫn: *"Đừng bấm 'Chấm dứt các phiên khác' trong Telegram. Phiên mới đăng nhập có thể bị Telegram giới hạn trong 24 giờ đầu."*

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`telegram-userbot.service.ts`:**
  - `getStatus(userId)`: thêm kiểm tra `getMe` qua `withSession`, cache `Map<userId, checkedAt>` 5 phút; trả `lastCheckedAt`.
  - `newClient()`: bổ sung `langCode`, `systemLangCode`, `appVersion` thống nhất.
  - Trong `withSession` khi phát hiện phiên chết: gọi `NotificationService` (throttle 6 giờ / người).
* **`telegram-harvest.service.ts`:** bộ đón tin bắt lỗi phiên chết trong handler → dừng listener + thông báo.

### Frontend:
* **`TelegramConnectCard.tsx`:** hiện `connectedAt`, `lastCheckedAt`, dòng hướng dẫn AC4.
* **`telegramUserbotApi.ts`:** thêm `lastCheckedAt` vào `TelegramSessionStatus`.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Đăng xuất thiết bị "ApartmentDN Web" trong Telegram → mở trang Cào tin → hiện màn hình kết nối lại + chuông có thông báo.
* [ ] Mở trang liên tục trong 5 phút → chỉ 1 lần gọi `getMe` (xem log).
* [ ] Telegram → Cài đặt → Thiết bị: tên thiết bị hiện "ApartmentDN Web".
* [ ] Backend `tsc --noEmit`, frontend build không lỗi.
