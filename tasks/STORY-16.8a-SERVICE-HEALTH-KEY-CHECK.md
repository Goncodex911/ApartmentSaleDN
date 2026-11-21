# STORY 16.8a: Sức Khỏe Dịch Vụ, Kiểm Tra Key & Cảnh Báo Sự Cố (Service Health & Key Check)

**Bối cảnh:** Epic 16. Story 16.8 gốc được chia làm hai:
* **16.8a** (Story này): kiểm tra kết nối, phát hiện key hỏng, banner cảnh báo.
* **16.8b:** đồng hồ hạn mức.

Hiện khi Gemini / Cloudinary / Telegram lỗi key, server chỉ ghi `console.error`; Admin không biết cho tới khi Quản lý / CTV báo.

**Điều chỉnh so với Epic gốc:**
* `VITE_MAP_TILE_URL` (CARTO) là biến **frontend**; server không thấy key và không đếm được tile, vì trình duyệt tải thẳng từ CARTO. Nút kiểm tra CARTO vì vậy **chạy trên trình duyệt của Admin**.
* Không dùng emoji làm icon, không dùng hiệu ứng nhấp nháy. Dùng icon lucide + nhãn chữ.

---

## 1. Mô tả Story (User Story)
* **Là một:** Admin.
* **Tôi muốn:** Một trang cho biết từng dịch vụ bên ngoài đang hoạt động hay lỗi, kiểm tra lại bằng 1 chạm, và được cảnh báo ngay khi key hỏng.
* **Để:** Thay key kịp thời trước khi Quản lý / CTV gặp lỗi.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story 16.1: khung Quản trị.
* `EXTERNAL_CONFIG.md` có hướng dẫn lấy key từng dịch vụ.
* `NotificationService.notify`, realtime 11.4.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Ma trận dịch vụ `/admin/health`
| Dịch vụ | Biến môi trường | Cách kiểm tra (siêu nhẹ) | Chạy ở |
| :--- | :--- | :--- | :---: |
| MongoDB Atlas | `MONGODB_URI` | lệnh `ping` | Server |
| Google Gemini | `GEMINI_API_KEY`, `GEMINI_MODEL` | `models.get` theo tên model (không sinh nội dung, không tốn lượt) | Server |
| Cloudinary | `CLOUDINARY_*` | Admin API `ping` | Server |
| Telegram Bot | `TELEGRAM_BOT_TOKEN` | `getMe` + trạng thái bot đang chạy | Server |
| OSM Nominatim | `NOMINATIM_USER_AGENT` | **Không gọi thử** (tránh tốn lượt 1 request/giây). Hiện kết quả lần gọi thật gần nhất từ bộ đếm lỗi | Server |
| Bản đồ CARTO | `VITE_MAP_TILE_URL` (Netlify) | Tải 1 tile Đà Nẵng bằng `fetch` | **Trình duyệt** |

* Mỗi dịch vụ hiện 1 trong 4 trạng thái, **kèm nhãn chữ và icon lucide**:
  * **Bình thường** (`CheckCircle2`, xanh lá);
  * **Chập chờn** (`AlertTriangle`, vàng): có lỗi tạm thời / 429 trong 24 giờ qua nhưng lần gần nhất thành công;
  * **Lỗi** (`XCircle`, đỏ): không kết nối được / 5xx / quá tải;
  * **Cần thay key** (`KeyRound`, đỏ): lỗi xác thực 401 / 403, key sai hoặc hết hạn.
* Chưa cấu hình biến thì hiện **"Chưa cấu hình"** (xám), không tính là lỗi.
* Mỗi dịch vụ hiện thêm: lần kiểm tra gần nhất, độ trễ (ms), thông điệp lỗi đã làm sạch (**không bao giờ hiện key / token**).

### AC2 — Kiểm tra 1 chạm
* Mỗi dịch vụ có nút `[Kiểm tra lại]`; trên đầu trang có `[Kiểm tra tất cả]`.
* Các kiểm tra chạy song song, mỗi cái có timeout 5 giây.
* Giới hạn **6 lần kiểm tra / phút / Admin** để không bị lạm dụng thành công cụ dò.

### AC3 — Ghi nhận lỗi thật khi đang chạy
* Các nơi gọi Gemini, Cloudinary, Telegram, Nominatim báo kết quả về `serviceHealth.record(service, outcome)`. `outcome` là `ok`, `rate_limited`, `auth_error` hoặc `error`.
* Ghi trong bộ nhớ: đếm 24 giờ + lần lỗi gần nhất.
* Có lưu nhẹ vào `service_health_logs` (TTL 7 ngày), tối đa 1 bản ghi / dịch vụ / trạng thái / 10 phút, để không mất dữ liệu khi Render khởi động lại.

### AC4 — Hướng dẫn thay key
* Dịch vụ ở trạng thái **Cần thay key** hiện "API key của [dịch vụ] không hợp lệ hoặc đã hết hạn", kèm `[Xem cách lấy key mới]`.
* Nút này mở `BottomSheet` hướng dẫn ngắn gồm:
  * nơi lấy key;
  * **tên biến cần sửa**;
  * **nơi sửa**: Render cho biến backend, Netlify cho `VITE_*`, kèm nhắc "deploy lại".
* Nội dung lấy từ `EXTERNAL_CONFIG.md`, viết sẵn trong 1 file dữ liệu frontend, **không đọc file `.md` lúc chạy**.

### AC5 — Cảnh báo chủ động
* Dịch vụ chuyển sang **Lỗi** / **Cần thay key** từ lỗi thật (AC3) thì:
  * mọi Admin nhận thông báo trong app (tối đa 1 lần / dịch vụ / 6 giờ);
  * mọi trang khu Quản trị hiện **dải cảnh báo đỏ cố định**: "[Dịch vụ] đang gặp sự cố ([lý do]). Kiểm tra và thay key để tránh gián đoạn", kèm link tới `/admin/health`.
* Dải tự ẩn khi lần kiểm tra kế tiếp thành công.
* Trang cũng hiện **tác vụ hằng ngày**: lần chạy gần nhất của nhắc tái ký và dọn ảnh tin CTV (đọc từ `job_runs`).

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend
* **`backend/src/modules/health/service-health.ts` (mới):** bộ ghi nhận trong bộ nhớ, `record()`, `snapshot()`, chống thông báo trùng 6 giờ.
* **`backend/src/modules/health/service-health-log.model.ts` (mới):** TTL 7 ngày.
* **`backend/src/modules/health/health-probes.ts` (mới):** hàm kiểm tra từng dịch vụ.
  * Dùng `fetch` + `AbortSignal.timeout(5000)`, **không thêm thư viện**.
  * Cloudinary dùng SDK sẵn có; Mongo dùng `mongoose.connection.db.admin().ping()`.
* **`backend/src/modules/health/health.controller.ts`, routes trong `admin.routes.ts`:**
  * `GET /admin/health/status`;
  * `POST /admin/health/ping` (body `{ services?: string[] }`), dùng `rateLimit` 6 / phút / user.
* **Gắn `record()` vào:**
  * `ingestion/gemini.service.ts`, `gemini-vision.service.ts`;
  * nơi upload / ký Cloudinary;
  * bot Telegram (lỗi 401 / 409);
  * `search/street-geocoder.ts` (Nominatim 429 / 403).
* **Làm sạch thông điệp lỗi:** cắt 200 ký tự, xoá mọi chuỗi giống key (`key=…`, `AIza…`, token bot dạng `\d+:[\w-]{30,}`).
* **`notification.model.ts`:** loại `SERVICE_INCIDENT`.

### Frontend
* **`frontend/src/pages/AdminHealthPage.tsx`, `components/admin/ServiceCard.tsx` (mới).**
* **`frontend/src/components/admin/serviceGuides.ts` (mới):** hướng dẫn thay key từng dịch vụ (trích từ `EXTERNAL_CONFIG.md`).
* **`frontend/src/components/admin/IncidentBanner.tsx` (mới):** gắn trong `AdminLayout`. Đọc `GET /admin/health/status` khi vào khu Quản trị và khi có thông báo `SERVICE_INCIDENT`.
* **Kiểm tra CARTO:** `fetch(TILE_URL thay {z}/{x}/{y}/{r} bằng tile Đà Nẵng)`, kiểm tra `res.ok` và `content-type` là ảnh.
* **`adminNav.ts`:** mục "Sức khỏe hệ thống".

---

## 5. Kiểm thử & Định nghĩa hoàn thành (DoD)
* [ ] Với key thật trên máy dev, mọi dịch vụ đã cấu hình ở trạng thái Bình thường và có độ trễ.
* [ ] Đặt `GEMINI_API_KEY` sai trên server thử thì trạng thái thành **Cần thay key**, sau đó hiện dải cảnh báo và có 1 thông báo (không lặp trong 6 giờ).
* [ ] Thiếu biến thì hiện "Chưa cấu hình", không đỏ.
* [ ] Phản hồi API và giao diện **không chứa** bất kỳ key / token nào (kiểm tra bằng grep phản hồi).
* [ ] Bấm kiểm tra quá 6 lần / phút thì nhận 429 kèm thông báo thân thiện.
* [ ] Không có emoji làm icon, không có hiệu ứng nhấp nháy. Đạt checklist ở 390px / 1280px.
* [ ] `tsc --noEmit` hai phía sạch, build frontend thành công.
