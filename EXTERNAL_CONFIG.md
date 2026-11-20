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
| **[EPIC-11](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_11_SMART_BROKER_TOOLS_AND_REALTIME.md)** | Bản đồ OSM, SSE Real-time, Google Maps Waypoints, Cron | Không có biến môi trường bắt buộc (0 VND) | ⏸️ **Sẵn sàng (0 VND - xem mục 7)** |
| **[EPIC-12](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_12_UI_UX_DESIGN_SYSTEM_AND_STANDARDIZATION.md)** | Nâng cấp UI/UX, Design System, Gestures | Không có biến môi trường mới (0 VND) | ✅ **Sẵn sàng (Thuần Frontend)** |
| **[EPIC-13](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_13_ADMIN_CONTROL_CENTER_AND_GOVERNANCE.md)** | Trung Tâm Quản Trị Admin, Audit Log, User Management | Tái sử dụng MongoDB & Telegram có sẵn (0 VND) | ✅ **Sẵn sàng (Tận dụng DB)** |
| **[EPIC-14](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_14_SYSTEM_AUDIT_FIXES_AND_HARDENING.md)** | Sửa Lỗi Logic Sau Rà Soát Toàn Hệ Thống & Gia Cố Bảo Mật | Không có biến môi trường mới (0 VND) | ✅ **Sẵn sàng (Nội bộ)** |
| **[EPIC-15](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_15_GEOSPATIAL_MAP_AND_SMART_DISCOVERY.md)** | Bản Đồ Địa Không Gian, GPS Thực Địa & Bán Kính Bảo Mật | `VITE_MAP_TILE_URL` (cần key CARTO miễn phí, ≤ 1 triệu tile/tháng), `NOMINATIM_USER_AGENT` (tùy chọn) | ⚠️ **Cần đăng ký key CARTO (miễn phí) — xem mục 8.1** |
| **[EPIC-16](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_16_ADMIN_CONSOLE_AND_ACTIVITY_MONITORING.md)** | Bảng Điều Khiển Quản Trị Riêng & Giám Sát Hoạt Động | Tái sử dụng MongoDB Atlas & JWT có sẵn (0 VND) | ✅ **Sẵn sàng (Thuần nội bộ)** |
| **[EPIC-17](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_17_MULTI_CHANNEL_AUTO_POSTING_AND_PRECISION_MAPS.md)** | Đăng Tin Đa Kênh (Zalo, WhatsApp) & Chuẩn Hóa Google Maps | Web Share API, WhatsApp Deep-links, HTTP Resolver (0 VND) | ✅ **Sẵn sàng (0 VND)** |

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
  * Logo gốc lưu ở: `frontend/brand/logo-source.png` (ngoài thư mục `public` → không bị deploy). Icon đã xuất sẵn trong `frontend/public/icons/` các cỡ:
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

---

### 7. EPIC-11: Bộ Công cụ Môi giới Nâng cao & Kho phòng Thời gian thực

Epic 11 được thiết kế theo triết lý **Ponytail (Tối giản, 0 đồng, không phát sinh chi phí vận hành hàng tháng)**. Hệ thống tận dụng tối đa hạ tầng sẵn có và các giao thức mở, **KHÔNG BẮT BUỘC** phải mua API Key trả phí:

#### 7.1. Bản đồ Tương tác & Bong bóng giá (Leaflet & OpenStreetMap)
* **Mục đích:** Hiển thị vị trí căn hộ trên bản đồ Đà Nẵng, bong bóng giá (Price Pills) và gom cụm số lượng căn theo khu vực (Marker Clustering).
* **Chi phí:** **0 VND (Miễn phí 100%)**.
* **Giải pháp (✅ đã chốt Cách A — Story 11.2):** Thư viện `leaflet` (đã cài) + tile OpenStreetMap chuẩn `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (kiểu cũ `{s}.tile...` không dùng nữa). Bản đồ chỉ có trong app (đã đăng nhập).
* **Bắt buộc theo [chính sách tile OSM](https://operations.osmfoundation.org/policies/tiles/):** luôn ghi nguồn "© OpenStreetMap" (đã làm), không dùng tải nặng, **không** cho service worker lưu tile để xem offline (đã đảm bảo).
* **Không cần Google Maps JavaScript API:** Tiết kiệm ít nhất $200/tháng chi phí Maps API của Google.
* **Tùy chọn nâng cao (Không bắt buộc):** Khi đông người dùng hoặc muốn giao diện bản đồ khác → MapTiler / Mapbox (gói miễn phí), cần thêm biến `VITE_MAP_TILE_KEY` trên Netlify (key phải giới hạn theo tên miền vì nằm ở frontend). Chỉ đổi 1 dòng URL tile trong `ApartmentMap.tsx`.

#### 7.2. Lập Lộ trình Dẫn khách (Google Maps Deep-link)
* **Mục đích:** Sau khi CTV tick chọn 3-4 căn, hệ thống tự động sắp xếp thứ tự đường đi ngắn nhất theo GPS và mở ứng dụng Google Maps trên điện thoại để dẫn đường xe máy.
* **Chi phí:** **0 VND (Miễn phí 100%)**.
* **Giải pháp:** Sử dụng chuẩn URL Scheme Universal Deep-link của Google Maps:
  `https://www.google.com/maps/dir/?api=1&origin=...&destination=...&waypoints=...`
* **Không tốn phí Google Directions API:** Toàn bộ việc render bản đồ và dẫn đường chuyển sang ứng dụng Google Maps có sẵn trên điện thoại của CTV.
* **Giới hạn (✅ đã chốt Cách A — Story 11.3):** link mở bằng trình duyệt điện thoại chỉ nhận 3 điểm dừng giữa đường (`waypoints`) và URL tối đa 2.048 ký tự → **tối đa 4 căn mỗi lộ trình** (vị trí CTV → 3 căn dừng → 1 căn đích). Đi xe máy: `travelmode=two-wheeler`. Không cần cấu hình.

#### 7.3. Cập nhật Kho phòng Thời gian thực (Server-Sent Events - SSE)
* **Mục đích:** Khi có căn vừa cọc hoặc đổi giá, màn hình điện thoại của CTV tự đổi màu ngay lập tức mà không cần F5.
* **Chi phí:** **0 VND (Miễn phí 100%)**.
* **Giải pháp:** Sử dụng Server-Sent Events (SSE) thuần trên Node.js/Express, không dùng Socket.io hay dịch vụ ngoài đắt đỏ như Pusher ($49+/tháng).
* **Lưu ý triển khai trên Netlify / Render (✅ đã chốt Cách A — Story 11.4):**
  * Proxy `/api/*` của Netlify cắt request sau khoảng 26–30 giây **dù có heartbeat** (không đổi được) → máy chủ **tự đóng luồng sau 25 giây**, app nối lại ngay và gửi `Last-Event-ID` để nhận bù sự kiện bị lỡ. Vẫn gửi `: ping` mỗi 15 giây.
  * App ẩn / mất mạng thì ngắt luồng (tiết kiệm pin, 4G); máy chủ khởi động lại thì app tự tải lại danh sách.
  * Đăng nhập bằng header `Authorization` (dùng `fetch` thay `EventSource`), đi qua proxy như mọi API khác → **không cần cấu hình CORS hay biến mới**.
  * Cần thử trên Netlify thật (Deploy Preview) xem proxy có gom (buffer) luồng không; nếu có → chuyển sang app tự hỏi server mỗi 30 giây.

#### 7.4. Quản lý Vòng đời Hợp đồng & Nhắc Tái ký (Lease Renewal Tracker)
* **Mục đích:** Tự động đếm ngược ngày hết hạn thuê và gửi cảnh báo trước 30 ngày & 15 ngày cho Quản lý và CTV.
* **Chi phí:** **0 VND (Miễn phí 100%)**.
* **Giải pháp (✅ đã chốt Cách A — Story 11.5):** **Không dùng `node-cron`** — Render gói free ngủ sau 15 phút không có truy cập nên lịch 08:00 sẽ không chạy. Thay vào đó máy chủ **quét khi có người mở app lần đầu trong ngày** (giờ Việt Nam, khoá trong collection `job_runs` để chỉ chạy 1 lần), tạo thông báo trong app. Quét theo "còn ≤ 30 / ≤ 15 ngày" nên hôm nào không ai mở app thì hôm sau nhắc bù. Việc dọn ảnh tin CTV (Story 8.6) cũng chạy theo cơ chế này.
* **Telegram:** người đã liên kết Telegram (Epic 6) tự nhận kèm lời nhắc lúc quét — không cần cấu hình thêm.
* **Tùy chọn (Cách B, chưa làm):** muốn nhắc **đúng 08:00** kể cả khi không ai mở app → dùng dịch vụ hẹn giờ ngoài miễn phí (cron-job.org / GitHub Actions) gọi 1 API riêng, cần thêm biến `CRON_SECRET` trên Render.

#### 7.5. Biến môi trường của Epic 11
* **Bắt buộc:** không có.
* **Tùy chọn:** `USD_VND_RATE` trên Render (đã có trong `.env.example`, mặc định 25.000) — tỷ giá cho bảng so sánh căn, ước tính chi phí trên trang khách (Story 11.6) và ghép khách theo ngân sách USD (Story 11.1). `VITE_MAP_TILE_KEY` / `CRON_SECRET` chỉ cần khi chọn các Cách B ở trên.

---

### 8. EPIC-15: Hệ Thống Bản Đồ Địa Không Gian & Khảo Sát Bất Động Sản (Geospatial & Discovery)

Epic 15 tiếp tục trung thành với triết lý **Ponytail (Tối giản, 0 đồng, không mua API Google Maps đắt đỏ)**. Mọi nâng cấp đều sử dụng chuẩn web mở và dịch vụ CDN công cộng miễn phí:

#### 8.1. Bản đồ nền CartoDB Voyager / Positron (Nâng cấp từ OSM)
* **Mục đích:** Thay thế giao diện OpenStreetMap mặc định bằng phong cách bản đồ phẳng (Flat / Minimalist) sang trọng như Airbnb, màu sắc dịu nhẹ giúp các bong bóng giá phòng (`AVAILABLE` xanh, `UPCOMING` cam) nổi bật rõ ràng dưới ánh sáng ngoài trời.
* **⚠️ Cập nhật điều khoản CARTO (kiểm tra 21/11/2026, điều khoản cập nhật 29/09/2026):**
  * **Cần API key** (miễn phí, đăng ký không chờ duyệt). Không có key → tile bị đóng dấu "API key required".
  * App kinh doanh: **miễn phí tối đa 1 triệu lượt tải tile / tháng** (tính chung mọi key của tài khoản). Vượt → gói Basemaps Commercial **$500 / tháng** (10 triệu tile).
  * Key nằm ở frontend → **bắt buộc khóa theo website** trong trang quản lý key để người khác không dùng ké hạn mức.
  * Không được cache tile phía server; không cache trên máy người dùng quá 30 ngày (app không cache tile — Story 11.2).
* **Giải pháp:** CDN tile của CARTO:
  * URL Voyager: `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=<KEY_CỦA_BẠN>`.
  * Ghi nguồn bắt buộc, hiện rõ trên bản đồ: `© OpenStreetMap contributors, © CARTO` (code tự thêm khi URL là CARTO).
* **Cách cấu hình (Story 15.1):**
  1. Vào https://carto.com/basemaps/ → **Get API key**, đăng ký bằng email của bạn.
  2. Khóa key theo website: `https://apartmentsaledn.netlify.app` và `http://localhost:5173`.
  3. **Netlify** → Site settings → Environment variables → `VITE_MAP_TILE_URL` = URL Voyager ở trên (thay `<KEY_CỦA_BẠN>`) → **deploy lại** (biến `VITE_` được gắn vào lúc build).
  4. **Chạy local:** tạo file `frontend/.env.local` chứa cùng dòng `VITE_MAP_TILE_URL=...` (Vite **không** đọc file `.env` ở gốc repo; `frontend/.env.local` đã nằm trong `.gitignore`).
* **Chưa cấu hình:** app tự dùng tile OpenStreetMap chuẩn như hiện tại (không lỗi, chỉ kém đẹp hơn).
* **Theo dõi hạn mức:** ~50–150 tile mỗi lần mở & kéo bản đồ → đội ~20 CTV dùng hằng ngày ≈ 0,3–0,9 triệu tile / tháng. Xem số liệu trong trang CARTO; sắp vượt → xóa biến để về tile OSM.

#### 8.2. Định vị GPS Thực địa cho CTV (HTML5 Geolocation API)
* **Mục đích:** Khi CTV đang đứng ngoài đường khảo sát, bấm 1 nút `[📍]` là bản đồ tự lướt (`flyTo`) về tọa độ thực tế của môi giới và định vị chấm xanh xung nhịp (Pulsing Blue Dot).
* **Chi phí:** **0 VND (Miễn phí 100%)**.
* **Điều kiện bắt buộc:**
  * Trình duyệt yêu cầu kết nối **HTTPS** mới cho phép gọi GPS (`navigator.geolocation`). Netlify đã bật sẵn HTTPS mặc định.
  * Thiết bị di động của CTV (iPhone/Android) phải bật "Dịch vụ định vị" (Location Services) và bấm **Cho phép (Allow)** khi trình duyệt hỏi quyền.
  * Nếu người dùng từ chối cấp quyền, hệ thống hiển thị thông báo Toast hướng dẫn bật định vị mà không làm gián đoạn trải nghiệm.

#### 8.3. Bộ Định vị Tên đường Tự động Khi Nhập Tin (OSM Nominatim / Photon Geocoding)
* **Mục đích:** Khi Quản lý hoặc CTV nhập căn hộ bằng text địa chỉ (ví dụ: `150 Hoàng Kế Viêm, Ngũ Hành Sơn`) mà không dán link Google Maps, backend tự động phân giải tên đường ra tọa độ GPS để không bị dồn về tâm quận.
* **Chi phí:** **0 VND (Miễn phí 100%)**.
* **Giải pháp:**
  * **Đã chốt dùng OSM Nominatim** (`nominatim.openstreetmap.org`) — có chính sách sử dụng rõ ràng. **Không dùng Photon công khai** (`photon.komoot.io`): người duy trì nói bản công khai chỉ để demo / thử nghiệm, không cam kết hoạt động (chỉ dùng nếu sau này tự cài Photon).
  * **Tuân thủ chính sách sử dụng Nominatim** (https://operations.osmfoundation.org/policies/nominatim/):
    1. Giới hạn tần suất: Tối đa 1 request/giây (hàng đợi nội bộ trong máy chủ).
    2. Bắt buộc có định danh User-Agent riêng (ví dụ: `RoomMaster-Danang/1.0`). Nên kèm cách liên hệ (website app); **có ghi email hay không là do bạn quyết** — code không tự gắn email.
    3. **Bộ nhớ đệm (Geocache):** Lưu kết quả tọa độ tên đường vào MongoDB collection `geocaches` để lần sau các căn cùng tên đường lấy ngay trong 1ms mà không gọi lại API bên ngoài.
    4. Không tải hàng loạt: script định vị lại căn cũ (Story 15.6) cũng đi qua hàng đợi 1 request/giây.
  * Chỉ gửi **tên đường + quận + Đà Nẵng** ra ngoài — không gửi số nhà, tên / SĐT chủ.
* **Cấu hình:** không bắt buộc. Muốn đổi định danh → thêm `NOMINATIM_USER_AGENT` trong **Render → Environment** (backend), VD `RoomMaster-Danang/1.0 (+https://apartmentsaledn.netlify.app)`.

#### 8.4. Bản đồ Vị trí Chính xác cho Trang Khách Thuê (`/p/:slug`)
* **✅ Quyết định Project Owner (21/11/2026):** hiển thị **đúng vị trí + địa chỉ đầy đủ**, không làm lệch (Story 15.5). Vị trí chính xác lấy từ link Google Maps hoặc ghim kéo tay trong form (Story 15.7).
* **Chi phí:** **0 VND** — bản đồ dùng tile như mục 8.1; nút `[Chỉ đường]` dùng link chuẩn của Google `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>` (không cần key, không tính phí).
* **Không cần cấu hình.**

#### 8.5. Biến môi trường của Epic 15
* **Bắt buộc:** **Không có** — thiếu biến thì app vẫn chạy (dùng tile OSM, User-Agent mặc định).
* **Khuyên làm để có bản đồ CARTO đẹp (Story 15.1):**
  * `VITE_MAP_TILE_URL` (**frontend** — Netlify + `frontend/.env.local`): URL tile CARTO **kèm `?key=`** (xem mục 8.1). Không khai báo → tile OpenStreetMap chuẩn.
* **Tùy chọn:**
  * `NOMINATIM_USER_AGENT` (**backend** — Render + `.env` gốc): định danh app khi gọi định vị tên đường (mặc định: `RoomMaster-Danang/1.0`).

