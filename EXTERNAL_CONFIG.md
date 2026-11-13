# SỔ TAY CẤU HÌNH DỊCH VỤ BÊN NGOÀI (EXTERNAL CONFIGURATION GUIDE)

Tài liệu này tổng hợp toàn bộ các dịch vụ bên ngoài, API Key và thông tin môi trường cần thiết cho từng **Epic** trong dự án.  
**Trước khi bắt đầu bất kỳ Epic nào, tôi sẽ chủ động đối chiếu tài liệu này để nhắc nhở và hướng dẫn bạn cấu hình từng bước trước khi viết code.**

---

## 📊 Bảng tổng hợp Cấu hình theo từng Epic

| Epic | Dịch vụ bên ngoài cần dùng | Biến môi trường tương ứng | Trạng thái |
| :--- | :--- | :--- | :---: |
| **[EPIC-01](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_01_AUTH_AND_PERMISSIONS.md)** | MongoDB Atlas, JWT Secret | `MONGODB_URI`, `JWT_SECRET` | ✅ **Đã hoàn thành** |
| **[EPIC-02](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_02_APARTMENT_INVENTORY.md)** | Lưu trữ Ảnh/Video (Cloudinary) | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | ✅ **Đã hoàn thành cấu hình** |
| **[EPIC-03](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_03_DATA_INGESTION_AND_DEDUP.md)** | Google Gemini AI (Parse tin), Telegram Bot | `GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_SOURCE_CHAT_IDS` | ⏸️ Chưa đến hạn |
| **[EPIC-04](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_04_SMART_SEARCH_AND_FILTER.md)** | MongoDB Atlas Search Index (Lucene) | Cấu hình trực tiếp trên Web Atlas | ⏸️ Chưa đến hạn |
| **[EPIC-05](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_05_ONE_CLICK_SHARE.md)** | Domain Frontend (Link xem phòng công khai) | `CLIENT_URL` | ⏸️ Chưa đến hạn |
| **[EPIC-06](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_06_CUSTOMER_CRM_AND_AUTO_CHAT.md)** | AI Auto-Chat Assistant, Zalo OA / Webhook | `GEMINI_API_KEY`, `ZALO_OA_ACCESS_TOKEN` (Tùy chọn) | ⏸️ Chưa đến hạn |

---

## 🛠️ Hướng dẫn chi tiết từng dịch vụ khi được nhắc

### 1. EPIC-01: Cơ sở dữ liệu & Xác thực (ĐÃ XONG)
* **MongoDB Atlas:** Đã cấu hình và kết nối thành công tới cluster `sale.jtnrk3b.mongodb.net`.
* **JWT Secret:** Đã cấu hình mã bí mật trong file `.env`.

---

### 2. EPIC-02: Lưu trữ Ảnh/Video Căn hộ (ĐANG CẦN CHO EPIC NÀY)
Mỗi căn hộ cần lưu trữ từ 5 - 15 ảnh góc phòng và video ngắn.

* **Lựa chọn A: Dùng Cloudinary (Khuyên dùng cho Web/App thực tế)**
  * **Mục đích:** Tải ảnh lên mây, tự động nén tối ưu dung lượng, có CDN tải cực nhanh trên điện thoại.
  * **Chi phí:** Gói miễn phí vĩnh viễn (25GB dung lượng + 25GB băng thông/tháng).
  * **Cách lấy key:**
    1. Truy cập: [https://cloudinary.com/users/register_free](https://cloudinary.com/users/register_free) tạo tài khoản miễn phí.
    2. Vào mục **Dashboard**, bạn sẽ thấy ngay 3 thông số:
       * `Cloud Name`
       * `API Key`
       * `API Secret`
    3. Điền vào `.env`:
       ```env
       CLOUDINARY_CLOUD_NAME=your_cloud_name
       CLOUDINARY_API_KEY=your_api_key
       CLOUDINARY_API_SECRET=your_api_secret
       ```
* **Lựa chọn B: Lưu trữ cục bộ (Local Storage - Cho môi trường Dev)**
  * **Mục đích:** Lưu trực tiếp file ảnh vào thư mục `backend/uploads/` trên ổ cứng máy tính.
  * **Yêu cầu:** Không cần đăng ký tài khoản hay API Key nào cả.

---

### 3. EPIC-03: Trí tuệ nhân tạo (AI) & Bot Thu thập Tin
* **Google Gemini API Key:**
  * **Mục đích:** Đọc hiểu văn bản tin nhắn tự do từ group Facebook/Zalo/Tele và trích xuất thành JSON (Giá, Quận, Số PN, SĐT chủ).
  * **Chi phí:** Miễn phí (Free Tier với Gemini 1.5 Flash/Gemini 2.0 Flash cực nhanh).
  * **Cách lấy:**
    1. Truy cập [Google AI Studio](https://aistudio.google.com/app/apikey) đăng nhập bằng Gmail.
    2. Bấm nút **"Create API key"** -> Copy chuỗi Key.
    3. Điền vào `.env`: `GEMINI_API_KEY=AIzaSy...`
* **Telegram Bot Token:**
  * **Mục đích:** Cho phép hệ thống tham gia các nhóm Telegram nguồn và tự động nhận tin nhắn bài đăng mới.
  * **Chi phí:** Miễn phí 100%.
  * **Cách lấy:**
    1. Mở app Telegram, tìm tài khoản `@BotFather`.
    2. Gõ lệnh `/newbot`, đặt tên cho bot.
    3. BotFather sẽ gửi lại chuỗi `HTTP API Token`.
    4. Điền vào `.env`: `TELEGRAM_BOT_TOKEN=123456789:ABCdef...`

---

### 4. EPIC-04: Atlas Search & Geocoding
* **Index Atlas Search:** Cấu hình trực tiếp trên Web MongoDB Atlas để kích hoạt tìm kiếm mờ (Fuzzy) và từ đồng nghĩa (`ccmn`, `1n1k`). Tôi sẽ cung cấp file JSON cấu hình và hướng dẫn bạn dán vào web chỉ mất 1 phút.

---

### 5. EPIC-05 & EPIC-06: Chia sẻ 1-Chạm & Chatbot Chăm sóc Khách
* Sử dụng lại `GEMINI_API_KEY` từ Epic 3 để điều khiển Bot tự động gợi ý phòng và giữ chân khách.
* `CLIENT_URL`: Đường dẫn web (mặc định môi trường dev: `http://localhost:5173`).

