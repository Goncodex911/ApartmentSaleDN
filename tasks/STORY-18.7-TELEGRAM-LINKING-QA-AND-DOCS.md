# STORY 18.7: Kiểm Thử Thiết Bị Thật & Tài Liệu Liên Kết Telegram (Telegram Linking QA & Docs)

**Bối cảnh:** `docs/stories/EPIC_18_RELIABLE_TELEGRAM_ACCOUNT_LINKING.md` (Story 18.7).
Lỗi liên kết Telegram chỉ lộ ra trên thiết bị và tài khoản thật (Login Email, 2FA, Render khởi động lại, Telegram hạn chế ứng dụng bên thứ ba). Story này chốt Epic bằng kiểm thử thực tế và tài liệu cho Quản lý.

---

## 1. Mô tả Story (User Story)
* **Là một:** Chủ dự án (Project Owner).
* **Tôi muốn:** Có bằng chứng kết nối Telegram chạy trên mọi thiết bị mà Quản lý dùng, và hướng dẫn ngắn gọn để gửi họ.
* **Để:** Triển khai cho Quản lý mà không phải hỗ trợ từng người.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story 18.1, 18.2, 18.3 đã merge (tối thiểu); 18.4–18.6 nếu đã làm thì kiểm thử luôn.
* Có: iPhone (Safari), Android (Chrome), máy tính (Chrome); 1 tài khoản Telegram thường, 1 tài khoản bật Login Email, 1 tài khoản bật 2FA (có thể trùng).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Ma trận kiểm thử
* **Then** mọi dòng dưới đây có kết quả Đạt / Không đạt + ảnh chụp, ghi vào mục "Kết quả" cuối file:

| # | Kịch bản | Thiết bị | Mong đợi |
|---|---|---|---|
| 1 | OTP, mã vào app Telegram | iPhone | Trang ghi đúng kênh, kết nối được |
| 2 | OTP, tài khoản Login Email | Android | Trang ghi "đã gửi tới email ng\*\*\*…", kết nối được |
| 3 | OTP + 2FA | Máy tính | Hỏi mật khẩu 2FA, kết nối được |
| 4 | Gửi mã → deploy / khởi động lại Render → nhập mã | Bất kỳ | Vẫn kết nối được (Story 18.2) |
| 5 | Nhập sai mã 3 lần | Bất kỳ | Thông báo tiếng Việt đúng, không bị khóa vô lý |
| 6 | Gửi mã nhiều lần đến FLOOD_WAIT | Bất kỳ | Đếm ngược, nút bị khóa (Story 18.3) |
| 7 | Quét QR | Máy tính + điện thoại | Kết nối được, QR tự làm mới (Story 18.4) |
| 8 | Đăng xuất thiết bị "ApartmentDN Web" trong Telegram | Bất kỳ | Trang tự về màn hình kết nối + chuông báo (Story 18.5) |
| 9 | Chuyển tiếp album cho Bot | Điện thoại | Căn được nạp, Bot trả lời (Story 18.6) |
| 10 | Sau khi kết nối: quét 10 bài theo SĐT | Bất kỳ | Căn vào Bảng hàng, Nhật ký ghi nhận |

### AC2 — Tài liệu kỹ thuật
* **Then** `EXTERNAL_CONFIG.md` mục 11 cập nhật: các kênh gửi mã, xử lý khi không nhận được mã, FLOOD_WAIT, đối chiếu `TELEGRAM_API_ID` giữa Render và local, đường dự phòng chuyển tiếp cho Bot.

### AC3 — Hướng dẫn cho Quản lý
* **Then** có đoạn hướng dẫn ≤ 15 dòng, tiếng Việt đơn giản, dán được vào nhóm Zalo: cách kết nối trên điện thoại (OTP) và máy tính (QR), làm gì khi không nhận được mã, cách chuyển tiếp bài cho Bot.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)
* **`EXTERNAL_CONFIG.md`:** mục 11.5 (đã thêm khung ở bước tạo Epic) — bổ sung kết quả thực tế.
* **`tasks/STORY-18.7-TELEGRAM-LINKING-QA-AND-DOCS.md`:** điền bảng kết quả.
* Không sửa code (lỗi phát hiện được → mở story sửa riêng).

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] 10 kịch bản có kết quả + ảnh chụp.
* [ ] Kịch bản 1, 2, 4, 10 **bắt buộc Đạt** trước khi gửi hướng dẫn cho Quản lý.
* [ ] `EXTERNAL_CONFIG.md` mục 11.5 hoàn chỉnh.
* [ ] Hướng dẫn cho Quản lý đã được Chủ dự án duyệt.

## Kết quả
*(Điền sau khi kiểm thử)*
