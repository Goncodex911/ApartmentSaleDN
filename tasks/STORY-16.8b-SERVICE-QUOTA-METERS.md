# STORY 16.8b: Đồng Hồ Hạn Mức Dịch Vụ (Service Quota Meters)

**Bối cảnh:** Epic 16, phần thứ hai của Story 16.8 gốc. Story 16.8a cho biết dịch vụ **sống / chết**; Story này cho biết dịch vụ **sắp chạm trần** gói miễn phí, để Admin kịp dọn dữ liệu hoặc nâng cấp.

**Điều chỉnh so với Epic gốc:**
* **Không ghi cứng hạn mức Gemini** ("15 RPM / 1.500 RPD"): hạn mức đổi theo model (`GEMINI_MODEL`) và theo thời điểm. Chỉ đếm số lần gọi và số lần bị 429.
* **Cloudinary:** dùng Admin API `usage`, vì API này trả **số credits thật** thay vì ước tính.
* **CARTO:** server không đếm được lượt tải bản đồ. Chỉ hiện link tới dashboard CARTO (đã có trong 16.8a).
* **Số kết nối MongoDB:** gói M0 có thể chặn lệnh `serverStatus`. Không lấy được thì ẩn mục này, không báo lỗi.

---

## 1. Mô tả Story (User Story)
* **Là một:** Admin.
* **Tôi muốn:** Thấy mức dùng của từng gói dịch vụ so với hạn mức, và được cảnh báo khi gần chạm trần.
* **Để:** Chủ động dọn dữ liệu hoặc nâng cấp gói trước khi dịch vụ bị ngừng.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story 16.8a: trang `/admin/health`, `service-health.ts` (bộ đếm gọi / 429).
* Story 16.2: cần đo dung lượng nhật ký sau khi bật ghi đầy đủ.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — MongoDB Atlas (M0 512MB)
* Thanh tiến trình hiện **MB đã dùng / 512MB**, lấy từ `dbStats` (`storageSize + indexSize`).
* Ngưỡng màu:
  * **vàng** khi ≥ 70% (≈ 358MB);
  * **đỏ** khi ≥ 90% (≈ 460MB).
* Hiện thêm 5 collection lớn nhất (tên + MB), lấy bằng `$collStats` / `collStats`. Mục này phải có `audit_logs` để theo dõi mục tiêu < 100MB của Story 16.2.
* Kết quả được cache **5 phút** để không tải DB.
* Hạn mức 512MB lấy từ biến `ATLAS_STORAGE_LIMIT_MB` (mặc định 512), vì khi nâng gói thì hạn mức đổi.

### AC2 — Cloudinary (gói Free)
* Gọi Admin API `usage`, hiện:
  * credits đã dùng / hạn mức tháng (`credits.usage` / `credits.limit`);
  * tách nhỏ: lưu trữ, băng thông, biến đổi ảnh.
* Ngưỡng màu: vàng ≥ 70%, đỏ ≥ 90%.
* Cache **1 giờ**, vì API `usage` có giới hạn số lần gọi.

### AC3 — Gemini
* Hiện số lần gọi trong 1 giờ và 24 giờ qua, số lần **429** trong 24 giờ, thời điểm bị 429 gần nhất, và tên model đang dùng.
* Không có thanh %, vì hạn mức không lấy được qua API.
* Kèm câu "Xem hạn mức hiện tại của model trong Google AI Studio" và link.

### AC4 — Telegram & Nominatim
* **Telegram:** trạng thái bot, lần nhận tin cuối, số tin cào trong 24 giờ theo từng nhóm nguồn (đếm từ dữ liệu ingest sẵn có).
* **Nominatim:** số lần gọi thật trong 24 giờ, tỉ lệ trúng cache (từ `geocaches`), số lần 429 / 403.

### AC5 — Cảnh báo chạm trần
* Mongo hoặc Cloudinary vượt ngưỡng **đỏ** thì tạo thông báo cho Admin (tối đa 1 lần / dịch vụ / ngày) và hiện trên dải cảnh báo của 16.8a.
* Việc kiểm tra chạy khi Admin mở khu Quản trị (đọc cache) và trong việc hằng ngày (`daily-jobs.ts`), **không** dùng lịch cron (Render ngủ).

### AC6 — Giao diện
* Mỗi dịch vụ 1 thẻ. Thanh tiến trình có nhãn chữ "358 / 512 MB (70%)", không chỉ dùng màu. Có `role="progressbar"` và `aria-valuenow`.
* Đủ trạng thái: skeleton, lỗi từng thẻ (1 dịch vụ lỗi không làm hỏng cả trang), "Chưa cấu hình".

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend
* **`backend/src/modules/health/quota-meters.ts` (mới):**
  * `mongoUsage()`: `dbStats` + `$collStats` theo danh sách collection, bắt lỗi từng phần.
  * `cloudinaryUsage()`: `cloudinary.api.usage()`.
  * `geminiUsage()`, `nominatimUsage()`: đọc bộ đếm của `service-health.ts` (16.8a, thêm đếm lượt gọi thành công).
  * `telegramUsage()`.
  * Cache theo TTL riêng từng nguồn.
* **`GET /admin/health/quotas`** (ADMIN).
* **`daily-jobs.ts`:** kiểm tra ngưỡng đỏ và tạo thông báo.
* **`.env.example`:** `ATLAS_STORAGE_LIMIT_MB=512`, kèm chú thích (WORKING_RULES mục 2).

### Frontend
* **`frontend/src/components/admin/QuotaMeter.tsx`, `QuotaCards.tsx` (mới):** gắn vào `AdminHealthPage.tsx` (16.8a), dạng tab hoặc khu vực riêng "Hạn mức".

---

## 5. Kiểm thử & Định nghĩa hoàn thành (DoD)
* [ ] Trên DB test: số MB và top collection khớp `db.stats()` chạy tay.
* [ ] Thử trên Atlas M0 thật **chỉ bằng lệnh đọc** (`dbStats`, `$collStats`), có báo trước với Project Owner. Lệnh nào bị chặn thì ẩn mục đó, không lỗi trang.
* [ ] Cloudinary trả số credits thật; lần gọi thứ hai trong 1 giờ lấy từ cache.
* [ ] Giả lập vượt 90% (hạ `ATLAS_STORAGE_LIMIT_MB` trên máy dev) thì có thông báo, tối đa 1 lần / ngày.
* [ ] Báo cáo dung lượng thực của `audit_logs` sau khi 16.2 chạy (mục tiêu < 100MB).
* [ ] `tsc --noEmit` hai phía sạch, build frontend thành công. Giao diện đạt checklist ở 390px / 1280px.
