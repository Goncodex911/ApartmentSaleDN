# STORY-3.3: Thu thập Đa kênh (Telegram Bot Listener, WhatsApp & Chrome Extension Gateway)

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý hệ thống kho phòng và Cộng tác viên môi giới.
* **Tôi muốn:** Tự động hóa việc thu thập bài đăng từ các nhóm **Telegram**, các nhóm **WhatsApp**, và bài đăng trên **Zalo Web / Facebook Groups** thông qua Bot tự động và Cổng Ingestion Gateway.
* **Để:** Loại bỏ hoàn toàn 2 - 4 tiếng mỗi ngày phải ngồi đọc và copy-paste thủ công từng tin nhắn giữa các ứng dụng, giúp nguồn hàng mới nhất lập tức xuất hiện trên Bảng hàng cho CTV chào khách.

---

## 2. Tiền điều kiện (Pre-conditions)
1. `TELEGRAM_BOT_TOKEN=9127120598:AAEteU5959uQ_ilS-MvERsKFiDAkcnJRUtY` đã cấu hình và kiểm tra kết nối `getMe` thành công.
2. Cloudinary đã sẵn sàng để lưu trữ hình ảnh tải về từ Telegram/WhatsApp.
3. **Story 3.1** (Gemini AI Parser & Noise Filter) và **Story 3.2** (Khử trùng lặp đa tầng & pHash) đã hoàn thành và sẵn sàng xử lý dữ liệu.

---

## 3. Tiêu chí Chấp nhận (Acceptance Criteria - Gherkin)

### AC1: Tiến trình Telegram Bot Listener (`@AptSaleHunter_bot`)
* **Given:** Backend khởi động và phát hiện có cấu hình `TELEGRAM_BOT_TOKEN`.
* **When:** Bot kết nối thành công với máy chủ Telegram qua chế độ **Long Polling** (không cần mở cổng mạng công khai hay cấu hình domain phức tạp).
* **Then:**
  * Lắng nghe mọi tin nhắn mới hoặc tin nhắn được **Forward (Chuyển tiếp)** từ các nhóm/kênh khác vào nhóm bot tham gia.
  * Nếu tin nhắn có chứa ảnh:
    * Tự động lấy file ảnh có độ phân giải cao nhất (`file_id` lớn nhất).
    * Tải file từ API Telegram và đẩy trực tiếp lên Cloudinary bằng stream để lấy link ảnh vĩnh viễn.
  * Gom đầy đủ nội dung bài viết và danh sách link ảnh đẩy vào hàm `DedupService.processListing({ sourceType: 'TELEGRAM', ... })`.
  * Nếu tin cho thuê hợp lệ và được lưu thành công $\rightarrow$ Bot tự động phản hồi lại vào nhóm tin nhắn với icon hoặc thông báo:
    `"✅ [ĐÃ LƯU KHO] Căn hộ: ... - Giá: ... đ (Đã phân tích xong)"`.

### AC2: Cổng Tiếp Nhận Webhook WhatsApp (`POST /api/v1/ingestion/webhook`)
* **Given:** Một tin nhắn mới đến từ nhóm WhatsApp của đối tác hoặc từ dịch vụ WhatsApp Webhook.
* **When:** Hệ thống nhận request `POST /api/v1/ingestion/webhook` kèm secret token bảo mật trong header `x-webhook-secret` (hoặc cấu hình mở cho bot nội bộ).
* **Then:**
  * Chuẩn hóa payload đầu vào: trích xuất người gửi, nội dung tin nhắn và mảng URL hình ảnh.
  * Đẩy dữ liệu vào pipeline xử lý với nguồn `sourceType: 'WHATSAPP'`.
  * Trả về kết quả JSON báo trạng thái xử lý thành công.

### AC3: Cổng Nhận Dữ Liệu Chrome Extension (`POST /api/v1/ingestion/extension-import`)
* **Given:** CTV hoặc Quản lý đang lướt Zalo Web, WhatsApp Web hoặc Facebook Groups trên trình duyệt máy tính.
* **When:** Người dùng chọn bài viết và bấm nút Extension hoặc gọi API `POST /api/v1/ingestion/extension-import` (kèm Bearer Token).
* **Then:**
  * Endpoint tiếp nhận payload: `{ rawText, mediaUrls, sourceName, sourceUrl, sourceType: 'ZALO' | 'WHATSAPP' | 'FACEBOOK' }`.
  * Chạy qua bộ lọc rác $\rightarrow$ Phân tích AI $\rightarrow$ Khử trùng lặp $\rightarrow$ Lưu vào Bảng hàng.
  * Trả về thông báo chi tiết: Căn mới được tạo hay đã gộp vào căn Master có sẵn.

### AC4: Hộp thoại Nhập Nhanh trên Portal Web (`POST /api/v1/ingestion/quick-paste`)
* **Given:** Quản lý đang mở Web App Bảng hàng và vừa copy được một đoạn tin nhắn thô từ hội nhóm.
* **When:** Quản lý mở modal "Nhập nhanh từ tin nhắn", dán đoạn văn bản thô vào và bấm "Phân tích & Lưu vào kho".
* **Then:**
  * Giao diện gọi API `POST /api/v1/ingestion/quick-paste`.
  * Hệ thống tự động phân tích và trả về căn hộ vừa xử lý, bảng hàng tự động cập nhật ngay lập tức mà không cần F5 trang.

---

## 4. Phạm vi Kỹ thuật (Technical Implementation Scope)

### A. Cấu trúc Module Triển khai:
```plaintext
backend/src/modules/ingestion/
├── telegram.service.ts       # Service quản lý vòng đời Telegram Bot (Long polling, download media, upload Cloudinary)
├── ingestion.controller.ts    # Bổ sung các handler: webhook, extensionImport, quickPaste
├── ingestion.routes.ts        # Đăng ký các route mới
└── ingestion.validation.ts    # Thêm schema validate cho webhook và extension import
```

### B. Khởi động Bot trong Server:
* Cập nhật [backend/src/server.ts](file:///d:/CODE/AppartmentSaleProject/backend/src/server.ts):
  * Khởi tạo `TelegramService.startBot()` khi server chạy thành công.
  * Đảm bảo bot tắt êm ái (graceful shutdown) khi server nhận tín hiệu `SIGINT` / `SIGTERM`.

---

## 5. Danh sách Kiểm thử & Định nghĩa Hoàn thành (Definition of Done)
- [ ] Khởi chạy Telegram Bot chế độ Long Polling thành công với token thật.
- [ ] Gửi thử tin nhắn và ảnh mẫu qua Telegram API $\rightarrow$ Tự động tải ảnh lên Cloudinary và đưa vào database.
- [ ] Gọi thử nghiệm API `POST /api/v1/ingestion/extension-import` với nguồn Zalo/WhatsApp $\rightarrow$ Kết quả bóc tách và gộp tin chuẩn xác.
- [ ] Gọi thử nghiệm API `POST /api/v1/ingestion/quick-paste` $\rightarrow$ Căn hộ xuất hiện ngay trong hệ thống.
- [ ] Tuân thủ Ponytail: Sử dụng các HTTP endpoint native của Telegram Bot API hoặc thư viện tối giản không gây nghẽn event loop, file < 250 dòng.
- [ ] Tuân thủ [WORKING_RULES.md](file:///d:/CODE/AppartmentSaleProject/WORKING_RULES.md): Không tự ý commit git khi chưa được phép.

