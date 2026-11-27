# STORY 20.5: Chỉ Đường Theo Link Google Maps Đã Dán (Directions From Pasted Map Link)

**Bối cảnh:** `docs/stories/EPIC_20_USER_FEEDBACK_INGESTION_MAP_FORM.md` (mục D, Story 20.5). Phản hồi: "Bấm chỉ đường thì theo tọa độ map lỏ mặc dù đã dán link gg map".
Đã kiểm tra trên `main` ee1fdfe:
* `MapQuickCard.tsx` dòng 13: `directionsUrl` dùng `pin.coordinates` → **không dùng link**.
* `tourRoute.ts` (lộ trình) dùng `location.coordinates` của các căn.
* `ApartmentDetailModal.tsx` dòng 143–151: nút "Mở Google Maps" **đã** ưu tiên `location.mapUrl` → giữ nguyên.
* `apartment-location.ts` `prepareLocation`: link giải mã thất bại → **lặng lẽ** dùng tọa độ theo tên đường / tâm khu vực.
* Luồng nhập tin AI (`dedup.service.ts`) không tách link Google Maps trong nội dung tin.

**Độ khó:** Trung bình — **Claude làm**.

---

## 1. Mô tả Story (User Story)
* **Là một:** CTV dẫn khách đi xem căn.
* **Tôi muốn:** Nút Chỉ đường đưa tới đúng điểm của link Google Maps chủ nhà gửi.
* **Để:** Không dẫn khách tới sai chỗ.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story 17.5 (giải mã link) đã có. Nên làm sau 20.4 (picker điền `mapUrl`), nhưng không bắt buộc.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Chỉ đường ưu tiên link
* **Given** căn có `location.mapUrl`
* **When** bấm **Chỉ đường** trên thẻ bản đồ (`MapQuickCard`)
* **Then** mở đúng `mapUrl` (Google Maps tự mở app trên điện thoại).
* **And** căn không có link → giữ cách cũ (`/maps/dir/?api=1&destination=lat,lng`).
* **And** API ghim bản đồ (`map-pins.service.ts`) trả thêm `mapUrl` **chỉ cho người được xem chi tiết căn nội bộ** (cùng quyền với `ApartmentDetailModal`), không trả ở API công khai.

### AC2 — Lộ trình 1 căn
* **Given** lộ trình chỉ có 1 căn và căn đó có `mapUrl` → nút "Mở Google Maps" mở `mapUrl`. Lộ trình ≥ 2 căn giữ tọa độ (Google Maps cần tọa độ cho điểm dừng).

### AC3 — Báo khi link không đọc được
* **Given** lưu căn (tạo / sửa) có `mapUrl` **mới** nhưng `resolveMapCoordinates` trả `null`
* **Then** vẫn lưu căn, API trả thêm `warnings: ['MAP_URL_UNRESOLVED']`; form hiện "Không đọc được vị trí từ link — vui lòng ghim trên bản đồ" và badge vị trí **không** hiện "Chính xác".
* **And** `geoPrecision` giữ đúng mức thật (`STREET` / `AREA`), không đánh `EXACT`.

### AC4 — Nhập tin AI tách link
* **Given** nội dung tin có link Google Maps (`maps.app.goo.gl`, `goo.gl/maps`, `google.com/maps`)
* **Then** link đầu tiên được lưu vào `location.mapUrl` của căn mới; giải mã được → `coordinates` theo link, `geoPrecision = EXACT` (ưu tiên hơn tên đường).

### AC5 — Rà soát dữ liệu cũ (chỉ đọc)
* **Given** chạy `npm run audit-map-links` (backend)
* **Then** in danh sách căn có `mapUrl` nhưng `geoPrecision ≠ EXACT` (mã căn + tiêu đề đã che SĐT) để Admin xử lý ở `/admin/map-qa`. Không ghi DB.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend
* **`map-pins.service.ts`**: thêm `mapUrl` vào `select` theo quyền (AC1).
* **`apartment-location.ts`** `prepareLocation`: trả cờ `mapUrlUnresolved`; **`apartment.service.ts`** / controller gộp vào `warnings` của response tạo / sửa.
* **`dedup.service.ts`** (hoặc `create-master.ts` sau Story 20.1): tách link bằng regex, gọi `resolveMapCoordinates` trước `geocodeStreet`.
* **Tạo `backend/src/scripts/audit-map-links.ts`** + script trong `package.json`.

### Frontend
* **`frontend/src/components/map/MapQuickCard.tsx`**: `directionsUrl(pin)` ưu tiên `pin.mapUrl`; kiểu `MapPin` thêm `mapUrl?`.
* **`frontend/src/utils/tourRoute.ts`** / `TourPlanSheet.tsx`: AC2.
* **`LocationSection.tsx`** / `ApartmentModal.tsx`: hiện cảnh báo AC3 khi response có `warnings`.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Test hàm thuần tách link Google Maps khỏi nội dung tin ≥ 5 ca (link rút gọn, link dài, không link, 2 link, link Zalo không phải map).
* [ ] `npm test`, `npm run build` backend + frontend đạt.
* [ ] Thử thật: căn có link → Chỉ đường mở đúng điểm trên điện thoại; dán link hỏng → form cảnh báo.
* [ ] File ≤ 300 dòng, không `console.log`.
