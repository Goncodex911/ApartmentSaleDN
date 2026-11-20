# STORY 15.3: Tìm Ở Khu Vực Này (Viewport Bounding Box Search)

**Bối cảnh:** Epic 15. Ghim bản đồ (`GET /apartments/search/pins`, Story 11.2) lấy theo bộ lọc + từ khóa, tối đa 500 căn, và bản đồ **tự canh khung** cho vừa mọi ghim mỗi khi danh sách ghim đổi (`ApartmentMap.tsx` dòng 73–78). CTV muốn kéo bản đồ sang khu khác rồi tìm đúng trong khung đang nhìn.

---

## 1. Mô tả Story (User Story)
* **Là một:** Môi giới đang lướt bản đồ.
* **Tôi muốn:** Kéo bản đồ sang khu khác và bấm "Tìm ở khu vực này" để chỉ thấy căn trong khung hình.
* **Để:** Lọc theo vùng nhìn thấy mà không phải gõ tên phường / quận.

---

## 2. Tiền điều kiện (Pre-conditions)
* Có `findMapPins`, `parseSearchOptions` (Story 11.2), index `2dsphere` trên `location.coordinates`. Tọa độ lưu dạng mảng `[kinh độ, vĩ độ]`.
* Không cấu hình mới, không thêm thư viện.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Nút nổi
* **Given** người dùng kéo / phóng to làm tâm bản đồ lệch > **500m** so với lần tải ghim gần nhất, hoặc đổi mức phóng to ≥ 2 nấc
* **Then** hiện nút nổi `[Tìm ở khu vực này]` ở cạnh trên bản đồ (icon `Search` của lucide, bo tròn, bóng nhẹ, vùng bấm ≥ 44px).

### AC2 — Tìm theo khung
* **When** bấm nút
* **Then** gửi `bbox=minLng,minLat,maxLng,maxLat` của khung đang nhìn kèm **mọi bộ lọc đang chọn** (giá, loại căn, tiện ích…).
* Ghim tải lại chỉ trong khung, nút ẩn đi.
* **Bản đồ KHÔNG tự canh khung lại** (giữ nguyên chỗ người dùng đang nhìn).
* Khung có > 500 căn → hiện "Có hơn 500 căn, phóng to để xem đủ".
* Điểm mốc đang chọn (bán kính) bị thay bằng khung nhìn, và chip bộ lọc điểm mốc tự gỡ để người dùng hiểu đang lọc theo khung.

### AC3 — Tự động tìm khi di chuyển
* Ô chọn nhỏ `[ ] Tự động tìm khi di chuyển` ở góc bản đồ; app nhớ lựa chọn trên máy.
* Bật → mỗi lần ngừng kéo / phóng to (`moveend`, chờ 500ms) tự tải ghim trong khung, không hiện nút nổi.
* Request cũ chưa xong mà có request mới → bỏ kết quả cũ.

### AC4 — Thoát chế độ khung
* Đổi bộ lọc, gõ từ khóa mới, hoặc bấm `[Xem toàn bộ]` trên dải trạng thái "Đang xem trong khu vực này" → bỏ `bbox`, quay về hành vi cũ (tự canh khung).
* Chế độ Danh sách **không** bị lọc theo khung (chỉ bản đồ).

### AC5 — An toàn tham số
* Backend chỉ nhận `bbox` gồm 4 số hợp lệ:
  - kinh độ trong [-180, 180], vĩ độ trong [-90, 90];
  - min < max;
  - cạnh tối đa **1 độ** (~110km).
* Sai định dạng → bỏ qua `bbox` (không lỗi 500).

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/modules/search/search.controller.ts`:** `parseSearchOptions` đọc `bbox` (hàm `parseBbox` kiểm tra như AC5).
* **`backend/src/modules/search/search.service.ts`:** `ISearchOptions.bbox?: [number, number, number, number]`.
* **`backend/src/modules/search/map-pins.service.ts`:**
  - Có `bbox` → `filter['location.coordinates'] = { $geoWithin: { $box: [[minLng, minLat], [maxLng, maxLat]] } }`, bỏ điều kiện bán kính điểm mốc, `withoutLocation = 0`.
  - Trả thêm `truncated: boolean` khi đủ 500 căn.

### Frontend:
* **`frontend/src/api/apartmentApi.ts`:** `getMapPins` nhận `bbox`; kiểu trả về thêm `truncated`.
* **`frontend/src/hooks/useMapPins.ts`:** nhận `bbox?: string`; hủy kết quả request cũ (đã có cờ `cancelled`).
* **`frontend/src/components/map/ApartmentMap.tsx`:**
  - Prop `fitToPins: boolean` (false khi đang tìm theo khung).
  - Phát `onViewChange({ bbox, center, zoom })` khi `moveend`.
* **`frontend/src/components/map/MapPanel.tsx`:** state `bbox`, so tâm mới với tâm lần tải trước (`L.latLng.distanceTo`); nút nổi, ô tự động (`localStorage` bọc try/catch), dải trạng thái + `[Xem toàn bộ]`; reset khi `filters` / `query` đổi.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] API:
  - `bbox` hợp lệ → chỉ trả căn trong khung, kết hợp bộ lọc giá.
  - `bbox` sai (chữ, min > max, cạnh 5 độ) → bỏ qua, 200.
  - Không token → 401 (Story 14.4).
* [ ] Chrome headless 390px:
  - Kéo bản đồ > 500m → hiện nút; bấm → ghim đổi, bản đồ đứng yên.
  - Bật tự động → kéo → ghim tự tải sau ~0.5 giây.
  - Đổi bộ lọc → về chế độ cũ.
* [ ] `tsc` 2 phía + build không lỗi.
* [ ] Báo cáo và đề xuất commit, chờ duyệt.

---

## 6. Rủi ro & lựa chọn
* `$box` tính theo mặt phẳng (không cong theo Trái Đất) — sai số không đáng kể ở phạm vi 1 thành phố.
* Mỗi lần kéo ở chế độ tự động = 1 request; giới hạn 500 ghim / lần và chờ 500ms đủ nhẹ cho Render free.
