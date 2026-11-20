# STORY 15.5: Bản Đồ Vị Trí Chính Xác Trên Trang Khách (`/p/:slug` Exact Location Map)

**Bối cảnh:** Epic 15. Trang khách hiện có bản đồ khu vực (`AreaMap` trong `PublicListingPage.tsx`): khung nhúng OpenStreetMap, tâm làm tròn ~500m, vòng tròn cố định 112px, chỉ ghi tên đường (Story 8.3 giữ số nhà nội bộ).

**✅ Quyết định Project Owner (21/11/2026):** **không làm lệch vị trí** — trang khách hiện **đúng vị trí và đúng địa chỉ** của căn.
Thay thế các phần "làm lệch / vòng 300m" của bản Epic trước. Ảnh hưởng tới Story 5.3 / 8.3: số nhà và tọa độ thật không còn là dữ liệu nội bộ đối với trang khách.

---

## 1. Mô tả Story (User Story)
* **Là một:** Khách thuê (kể cả khách nước ngoài) mở link xem phòng CTV gửi.
* **Tôi muốn:** Thấy đúng vị trí căn trên bản đồ, địa chỉ đầy đủ, và khoảng cách tới biển / chợ / phố Tây.
* **Để:** Tự đánh giá vị trí và hẹn xem phòng nhanh.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story 15.1: `utils/mapTiles.ts`.
* Story 15.4: danh sách tiện ích `POIS`.
* Story 15.7: độ chính xác vị trí `EXACT` (link Maps hoặc ghim kéo tay).
* Leaflet tải tách riêng (lazy) để không làm nặng trang khách.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Ghim đúng vị trí
* **Given** căn có vị trí chính xác (`EXACT`)
* **Then** trang khách hiện bản đồ mini có **ghim tại tọa độ thật**, mức phóng to 16.
* Căn chỉ có vị trí theo tên đường / khu vực (`STREET` / `AREA`) → **không** cắm ghim giả chính xác; hiện vòng mờ ~500m quanh vị trí ước lượng kèm chữ "Vị trí gần đúng".
* Căn không có tọa độ → không hiện bản đồ.

### AC2 — Địa chỉ đầy đủ
* Dưới bản đồ: **số nhà / kiệt + tên đường, khu vực, Đà Nẵng** (VD "K12/3 Nguyễn Văn Thoại, Mỹ An, Đà Nẵng"); thêm tên tòa nhà / dự án nếu có (15.7).
* `[Chỉ đường]` mở Google Maps tới đúng tọa độ: `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>` (link chuẩn của Google, không cần key, không tốn phí).

### AC3 — Bản đồ mini tải chậm
* Chỉ tải khi cuộn tới gần (`IntersectionObserver`, 200px).
* Khóa kéo / phóng to bằng 1 ngón để không kẹt cuộn trang (2 ngón vẫn phóng to được).
* Tile + ghi nguồn theo `mapTiles.ts`.

### AC4 — Huy hiệu khoảng cách
* Tối đa 3 huy hiệu cho tiện ích gần nhất trong nhóm Bãi biển · Chợ & TTTM · Phố An Thượng, trong 2km.
* Tính từ tọa độ thật, làm tròn 50m; kèm phút đi bộ (80m / phút) khi ≤ 1.5km.
* Icon lucide, song ngữ VI / EN.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/modules/share/public-listing.util.ts`:**
  - Bỏ `roundToGrid`.
  - Trả `location.coordinates` (thật), `location.precision`, `location.fullAddress` (số nhà + đường + khu vực), `location.buildingName?` (15.7).
  - Thêm `nearby` (Haversine với `POIS`, dùng `GeocodingService.haversineDistanceKm`).
  - Cập nhật chú thích "danh sách trắng" cho đúng quyết định mới.
* `ownerContact`, `subListings`, `mapUrl`, `description` gốc **vẫn không** trả ra trang khách.

### Frontend:
* **`frontend/src/components/public/NeighborhoodMap.tsx` (mới):** lazy `import('leaflet')`, ghim (`EXACT`) hoặc vòng gần đúng (`STREET` / `AREA`).
* **`frontend/src/pages/PublicListingPage.tsx`:** thay `AreaMap`, hiện địa chỉ đầy đủ, nút `[Chỉ đường]`, huy hiệu khoảng cách.
* **`frontend/src/utils/publicCopy.ts`:** nhãn VI / EN.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Căn `EXACT` → ghim trùng tọa độ thật; `AREA` → vòng gần đúng, không ghim.
* [ ] `[Chỉ đường]` mở Google Maps đúng điểm.
* [ ] Phản hồi API trang khách không có SĐT / tên chủ, nguồn phụ, `mapUrl`.
* [ ] Chrome headless 390px, ẩn danh: trang đầu không tải Leaflet; cuộn xuống → bản đồ hiện; đổi VI / EN; không tràn ngang.
* [ ] `tsc` 2 phía + build không lỗi.
* [ ] Báo cáo và đề xuất commit, chờ duyệt.

---

## 6. Rủi ro (đã báo Project Owner)
* Khách / môi giới ngoài có thể tự tới nhà và làm việc thẳng với chủ, bỏ qua CTV ("luồn chủ") — đây là lý do Story 5.3 / 8.3 từng giấu số nhà. Project Owner đã chọn hiển thị đúng; nếu sau này cần, có thể thêm công tắc theo từng căn mà không phải làm lại.
