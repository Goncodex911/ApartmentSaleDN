# STORY 20.4: Ô Tìm Địa Chỉ / Dán Link Ngay Trên Bản Đồ Chọn Vị Trí (Map Address Search in Location Picker)

**Bối cảnh:** `docs/stories/EPIC_20_USER_FEEDBACK_INGESTION_MAP_FORM.md` (mục C, Story 20.4). **Project Owner chọn Phương án 1 (OSM Nominatim) ngày 28/11/2026.**
Đã kiểm tra trên `main` ee1fdfe:
* `LocationPicker.tsx` (205 dòng): kéo bản đồ, Vệ tinh, GPS, reverse geocoding — **không có ô tìm kiếm**.
* `street-geocoder.ts`: hàng đợi Nominatim ≤ 1 req/s dùng chung toàn máy chủ (`throttled`), cache `Geocache`, viewbox Đà Nẵng — chỉ trả 1 kết quả theo tên đường.
* `utils/google-maps.ts`: `resolveMapCoordinates` (link rút gọn, redirect), `decodePlusCode`, `isValidDanangCoordinates`.
* Route tìm kiếm ở `modules/search/search.routes.ts`.
* Chính sách Nominatim: **cấm gợi ý theo từng phím** → chỉ tìm khi bấm.

**Độ khó:** Khó (API mới gọi dịch vụ ngoài, giới hạn tần suất, UI bản đồ) — **Claude làm**.

---

## 1. Mô tả Story (User Story)
* **Là một:** CTV / Quản lý thêm hoặc sửa căn trên điện thoại.
* **Tôi muốn:** Gõ địa chỉ hoặc dán link Google Maps ngay trên màn "Đặt vị trí chính xác".
* **Để:** Không phải chuyển sang Google Maps tìm rồi copy link, mà vị trí lưu vẫn chính xác.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story 17.4 / 17.5 / 19.3 đã có (LocationPicker, giải mã link, Plus Code).
* Không cần API key. Biến tùy chọn `NOMINATIM_USER_AGENT` đã có trong `.env.example`.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Tìm theo chữ
* **Given** mở "Đặt vị trí chính xác"
* **When** gõ "Hồ Nghinh" / "Monarchy" rồi bấm Enter hoặc nút Tìm
* **Then** hiện tối đa 5 kết quả trong Đà Nẵng (tên + dòng địa chỉ ngắn); chọn 1 kết quả → bản đồ bay tới (zoom 18), danh sách đóng.
* **And** ô nhập chữ ≥ 16px (iPhone không tự phóng to), nút ≥ 44px, **không gọi API khi đang gõ**.

### AC2 — Dán link Google Maps / Plus Code
* **When** dán `https://maps.app.goo.gl/...`, `https://www.google.com/maps/...@16.05,108.24...` hoặc Plus Code (`7RJW+XX Đà Nẵng`)
* **Then** nhận ra là link / Plus Code (không gửi Nominatim), backend giải mã → bay đúng điểm (zoom 19), hiện "Đã định vị theo link Google Maps".
* **And** link ngoài Đà Nẵng / không giải mã được → "Không đọc được vị trí từ link — hãy kéo ghim".

### AC3 — Độ chính xác giữ nguyên
* **Then** tìm kiếm **chỉ di chuyển bản đồ**; vị trí lưu vẫn là tâm ghim khi bấm **Xác nhận vị trí** (`EXACT`) như hiện nay.
* **And** khi xác nhận sau khi dán link, form điền luôn link vào ô `mapUrl` (để Chỉ đường — Story 20.5 — dùng được).

### AC4 — API backend
* **Given** `GET /api/v1/search/geo?q=<chuỗi>` (bắt buộc đăng nhập)
* **Then** `q` 2–120 ký tự (Zod); là link / Plus Code → giải mã; còn lại → Nominatim `limit=5`, `bounded=1`, viewbox Đà Nẵng, `countrycodes=vn`, qua **cùng hàng đợi 1 req/s** với `street-geocoder.ts`, timeout 4s.
* **And** cache theo chuỗi đã chuẩn hóa (dùng lại `Geocache` với tiền tố khóa `search:`, TTL như cũ); kết quả lọc lại bằng `inDanang`.
* **And** rate limit 20 lần / phút / người dùng → quá giới hạn trả 429 với thông điệp tiếng Việt.
* **And** không gửi SĐT / thông tin chủ; không log nội dung tìm kiếm kèm tên người dùng.

### AC5 — Lỗi & trống
* **Then** không có kết quả → "Không tìm thấy — thử tên đường hoặc dán link Google Maps"; Nominatim lỗi / quá tải → "Dịch vụ bản đồ đang bận, thử lại sau vài giây"; bản đồ vẫn kéo / ghim / GPS được.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend
* **`backend/src/modules/search/street-geocoder.ts`**: xuất hàng đợi `throttled` (hoặc tách sang `nominatim-queue.ts`) để dùng chung.
* **Tạo `backend/src/modules/search/geo-search.service.ts`**: `searchPlaces(q)` → `{ label, sublabel, coordinates: [lng, lat], source: 'OSM' | 'GOOGLE_LINK' | 'PLUS_CODE' }[]`.
* **`search.controller.ts`** + **`search.routes.ts`**: route `GET /search/geo` (auth + rate limit theo người dùng, dùng middleware rate limit đang có nếu có).
* `record('nominatim', …)` (service-health) cho lời gọi mới.

### Frontend
* **Tạo `frontend/src/components/map/PlaceSearchBox.tsx`**: ô tìm + danh sách kết quả + trạng thái loading / lỗi / trống.
* **`frontend/src/api/`**: hàm `searchGeo(q)` (file api tìm kiếm hiện có).
* **`LocationPicker.tsx`**: gắn `PlaceSearchBox` thay dòng gợi ý "🎯 Kéo bản đồ…" ở trên; `onConfirm` trả thêm `mapUrl` khi định vị từ link.
* **`LocationSection.tsx`**: nhận `mapUrl` từ picker điền vào form.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Test hàm thuần phân loại chuỗi (link / Plus Code / chữ) ≥ 6 ca.
* [ ] `npm test`, `npm run build` backend + frontend đạt.
* [ ] Thử thật trên điện thoại: tìm "Hồ Nghinh" → bay tới; dán link `maps.app.goo.gl` → đúng điểm; xác nhận → căn lưu `EXACT`.
* [ ] File ≤ 300 dòng, không `console.log`, comment tiếng Việt cho chính sách Nominatim.
