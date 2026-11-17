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
| **[EPIC-09](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_09_PWA_MOBILE_APP.md)** | Logo/icon app, Netlify (header cache), điện thoại thật để thử | Không có biến môi trường mới | ✅ **Đã đủ — chỉ còn thử trên điện thoại thật (mục 6.3)** |

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


---

### 6. EPIC-09: Ứng dụng di động PWA (cài ra màn hình chính)
Epic này **không cần API key hay biến môi trường mới**, không đổi gì trên Render. Cần bạn chuẩn bị 4 việc:

#### 6.1. Logo cho icon app — ✅ ĐÃ NHẬN (logo "DN Căn Hộ", nền navy `#0f2a45`)
* Icon app chỉ dùng **biểu tượng tròn "DN"** (bỏ chữ "CĂN HỘ APARTMENT" — quá nhỏ khi thu về 192px — và dấu ✦ ở góc dưới phải).
* **Dùng để làm gì:** Icon hiện trên màn hình chính điện thoại, màn hình chờ khi mở app, icon tab trình duyệt.
* **Cần gửi:** 1 file logo **vuông**, PNG hoặc SVG, tối thiểu **1024×1024px**, càng đơn giản càng rõ khi thu nhỏ.
  * Nên để hình chính nằm gọn trong **80% giữa** ảnh (Android cắt icon thành hình tròn / bo góc).
  * Chép file vào: `frontend/public/brand/logo-source.png` (hoặc `.svg`). Tôi sẽ tự xuất ra đủ các cỡ:
    `192×192`, `512×512`, `512×512 maskable` (Android), `180×180` (iPhone), favicon.
* **Chưa có logo?** Tôi tạo tạm icon chữ **"R"** trắng trên nền tím `#4f46e5` (màu chủ đạo của app), đổi sau chỉ cần thay file và build lại.

#### 6.2. Netlify (KHÔNG cần vào Dashboard nếu không đổi huy hiệu)
* Code sẽ thêm file `frontend/public/_headers` để `sw.js` và `manifest.webmanifest` **không bị lưu cache lâu** — nếu thiếu, điện thoại có thể kẹt ở bản cũ sau khi deploy. File nằm trong repo, Netlify tự đọc khi deploy.
* HTTPS: Netlify đã có sẵn (PWA bắt buộc HTTPS) — không cần làm gì.
* **Huy hiệu Netlify ở đáy màn hình — ✅ ĐÃ CHỐT: giữ huy hiệu (gói Free), menu đáy đặt phía trên.** Đo trên trang thật: `iframe#nl-badge-frame` 197×64px, góc dưới phải. Thông tin cũ: thanh menu đáy (Story 9.3) sẽ chiếm đúng vùng đáy màn hình. Theo quy tắc dự án, code **không ẩn huy hiệu bằng CSS** → bạn chọn 1 trong 2 (xem mục quyết định trong báo cáo phân tích):
  * (a) Giữ huy hiệu: thanh menu đặt **phía trên** huy hiệu (mất thêm ~56px màn hình).
  * (b) Tắt huy hiệu trong Netlify Dashboard nếu gói của bạn cho phép, rồi báo tôi.

#### 6.3. Điện thoại thật để thử (sau khi deploy)
* **iPhone:** iOS 16.4 trở lên, mở bằng **Safari** (iOS chỉ cài được app từ Safari, Chrome trên iPhone không cài được).
* **Android:** Chrome (hoặc Cốc Cốc / Samsung Internet).
* Cách thử cài đặt: mở `https://apartmentsaledn.netlify.app` → làm theo thanh hướng dẫn cài đặt → mở app từ icon ngoài màn hình chính → bật **Chế độ máy bay** → app vẫn mở và xem được danh sách căn đã xem trước đó.

#### 6.4. Gói thư viện mới — ✅ ĐÃ ĐỒNG Ý (cách A)
* `vite-plugin-pwa` (chỉ dùng khi build — devDependency, miễn phí, mã nguồn mở): tự sinh Service Worker (Workbox), manifest và cơ chế cập nhật bản mới.
* Không cài thư viện nào chạy trong app (kéo để làm mới, chia sẻ, rung đều dùng API có sẵn của trình duyệt).
