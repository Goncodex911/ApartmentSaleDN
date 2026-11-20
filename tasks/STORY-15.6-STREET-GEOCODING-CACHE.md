# STORY 15.6: Tự Định Vị Theo Tên Đường Khi Nhập Tin (Street Geocoding with Cache)

**Bối cảnh:** Epic 15. Căn nhập không có link Google Maps được gán tọa độ ước lượng: điểm mốc có trong địa chỉ, nếu không có thì **tâm quận** (`apartment-location.ts` → `GeocodingService.resolveCoordinates`, cũng dùng trong pipeline tin AI `dedup.service.ts`). Hậu quả: hàng chục căn chồng lên tâm quận trên bản đồ.

**Chọn dịch vụ (kiểm tra 21/11/2026):**
* **OSM Nominatim** (`nominatim.openstreetmap.org`) — có chính sách rõ ràng:
  - tối đa 1 request / giây;
  - User-Agent định danh app;
  - bắt buộc cache kết quả;
  - không tải hàng loạt.

  → **Chọn làm mặc định.**
* **Photon public** (`photon.komoot.io`) — người duy trì nói bản công khai chỉ để **demo / thử nghiệm**, không cam kết hoạt động → không dùng cho app kinh doanh (chỉ dùng nếu sau này tự cài Photon).

---

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý / CTV nhập căn bằng tên đường, không dán link Google Maps.
* **Tôi muốn:** Hệ thống tự tìm tọa độ theo tên đường ở Đà Nẵng.
* **Để:** Căn hiện đúng con đường trên bản đồ thay vì dồn về tâm quận.

---

## 2. Tiền điều kiện (Pre-conditions)
* `prepareLocation` đã là hàm async, chạy khi tạo / sửa căn và duyệt tin CTV.
* Biến tùy chọn `NOMINATIM_USER_AGENT` (đã có trong `.env.example`); mặc định `RoomMaster-Danang/1.0`.
* Không thêm thư viện (dùng `fetch` có sẵn).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Định vị theo tên đường
* **Given** căn mới / sửa vị trí có tên đường, **không** có tọa độ từ link Maps
* **Then** hệ thống tìm tọa độ đường đó trong Đà Nẵng.
* Có kết quả **nằm trong khung Đà Nẵng** → lưu tọa độ, độ chính xác `STREET`.
* Không có → giữ cách ước lượng hiện tại (điểm mốc / tâm quận), độ chính xác `AREA`.
* Có link Maps → độ chính xác `EXACT` (như hiện tại, ưu tiên cao nhất).
* Áp dụng cho cả tin AI (Telegram / dán nhanh) và tin CTV được duyệt.

### AC2 — Chỉ gửi tên đường + quận
* Request ra ngoài chỉ chứa **tên đường + quận + "Đà Nẵng"** — không gửi số nhà / kiệt, tên chủ, SĐT hay bất kỳ dữ liệu cá nhân nào.
* Giới hạn kết quả trong Việt Nam và khung Đà Nẵng (tránh trùng tên đường ở thành phố khác, VD "Lê Duẩn").

### AC3 — Bộ nhớ đệm
* Kết quả lưu theo khóa "tên đường đã chuẩn hóa + quận" trong collection `geocaches`.
* Lần sau cùng đường → lấy từ cache, không gọi ra ngoài.
* Cache cả kết quả "không tìm thấy" trong 7 ngày (không hỏi lại liên tục); kết quả tìm thấy lưu 180 ngày.

### AC4 — Tuân thủ giới hạn & không làm chậm / hỏng việc nhập
* Mọi lần gọi xếp hàng **tối đa 1 request / giây** cho cả máy chủ; mỗi request chờ tối đa 4 giây.
* Lỗi / quá giờ / bị từ chối (429, 403) → dùng ước lượng cũ, căn vẫn lưu bình thường, ghi log ngắn.
* Header `User-Agent` theo `NOMINATIM_USER_AGENT`; có ghi nguồn "Dữ liệu vị trí © OpenStreetMap" trong app (đã có trên bản đồ).

### AC5 — Bản đồ & dữ liệu cũ
* Ghim `STREET` vẫn có viền nét đứt; chú thích đổi thành "Viền nét đứt: vị trí theo tên đường / khu vực" (đường dài vài km nên chưa chính xác tới từng nhà).
* Căn cũ: không có trường độ chính xác → coi `EXACT` nếu có link Maps, còn lại `AREA`.
* Script `npm run geocode-streets` (mặc định **chạy thử**, `--apply` mới ghi) định vị lại các căn `AREA` có tên đường, đi qua cùng hàng đợi 1 request / giây. ⚠️ Chỉ chạy `--apply` trên DB thật khi Project Owner đồng ý.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/modules/search/street-geocoder.ts` (mới):**
  - `geocodeStreet(street, district)` → `[lng, lat] | null`.
  - Chuẩn hóa khóa bằng `streetKey` (Story 14.2).
  - Hàng đợi tuần tự 1 giây (Promise chain trong bộ nhớ).
  - Gọi Nominatim: `GET /search?format=jsonv2&limit=1&countrycodes=vn&street=<đường>&city=Đà Nẵng&county=<quận>&viewbox=107.90,16.25,108.35,15.90&bounded=1`, timeout `AbortSignal.timeout(4000)`.
  - Kiểm tra kết quả trong khung Đà Nẵng.
* **`backend/src/modules/search/geocache.model.ts` (mới):** `{ key (unique), coordinates?, found, expiresAt }`, TTL theo `expiresAt`.
* **`backend/src/modules/apartments/apartment-location.ts`:**
  - Sau bước link Maps, nếu chưa có tọa độ và có `street` → `geocodeStreet`; nếu không có thì fallback hiện tại.
  - Ghi `input.geoPrecision`.
* **`backend/src/modules/apartments/apartment.model.ts`:** `location.geoPrecision?: 'EXACT' | 'STREET' | 'AREA'`.
* **`backend/src/modules/dedup/dedup.service.ts`:** tin AI dùng chung `geocodeStreet` trước fallback.
* **`backend/src/modules/search/map-pins.service.ts`:** `approximate = precision !== 'EXACT'` (căn cũ suy theo `mapUrl` như AC5); trả thêm `precision`.
* **`backend/src/scripts/geocode-streets.ts` (mới)** + script trong `package.json`.

### Frontend:
* **`frontend/src/components/map/MapPanel.tsx`:** đổi chú thích viền nét đứt (AC5).

### Cấu hình & tài liệu:
* **`EXTERNAL_CONFIG.md` mục 8.3:** ghi rõ chọn Nominatim (không dùng Photon public), cách đặt `NOMINATIM_USER_AGENT` trên Render.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Thật (gọi Nominatim, ≤ 5 lần, cách nhau ≥ 1 giây):
  - "Hoàng Kế Viêm, Ngũ Hành Sơn" → tọa độ trong Đà Nẵng.
  - Lần 2 → từ cache (không gọi ra ngoài).
  - Tên đường bịa → null, cache 7 ngày.
* [ ] Giả lập lỗi mạng / timeout → căn vẫn lưu với `AREA`.
* [ ] 3 căn gửi cùng lúc → các request ra ngoài cách nhau ≥ 1 giây.
* [ ] Request ra ngoài không chứa số nhà (kiểm tra URL gửi đi trong log thử).
* [ ] Script chạy thử trên DB local ra đúng số căn cần định vị.
* [ ] `tsc` 2 phía + build không lỗi.
* [ ] Báo cáo và đề xuất commit, chờ duyệt. Hỏi Project Owner trước khi chạy script trên DB thật.

---

## 6. Rủi ro & lựa chọn
* Nominatim công cộng có thể chặn nếu dùng nặng → hàng đợi 1 req / giây + cache là bắt buộc; kho vài trăm căn chỉ cần vài trăm lần gọi **một lần**.
* Đường dài (Võ Nguyên Giáp ~10km) → tọa độ là 1 điểm trên đường, có thể lệch vài km so với căn thật → giữ viền nét đứt, khuyến khích dán link Maps cho căn quan trọng.
* `NOMINATIM_USER_AGENT` nên kèm cách liên hệ (VD website app) theo chính sách Nominatim; Project Owner tự quyết có ghi email hay không — code **không** tự gắn email.
