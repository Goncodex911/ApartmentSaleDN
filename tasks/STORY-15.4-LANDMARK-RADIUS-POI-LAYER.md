# STORY 15.4: Vòng Bán Kính Điểm Mốc & Lớp Tiện Ích Đà Nẵng (Landmark Radius & POI Layer)

**Bối cảnh:** Epic 15. Tìm theo điểm mốc đã lọc theo bán kính ở backend (Story 4.2 / 11.2: `buildContext` → `resolvedLandmark`, mặc định 2km). Nhưng API ghim **không trả tâm và bán kính** về, nên bản đồ không vẽ được vòng. Câu "gần Cầu Rồng 2km" cũng chưa đọc được số "2km".
Danh sách điểm mốc (`landmarks.data.ts`, 16 điểm) dùng cho **tìm kiếm**. Nếu thêm điểm như "Bãi biển Phạm Văn Đồng" vào đây thì mọi lượt tìm theo **đường** Phạm Văn Đồng sẽ bị biến thành tìm theo bán kính → lớp tiện ích phải là danh sách riêng, chỉ để hiển thị.

---

## 1. Mô tả Story (User Story)
* **Là một:** CTV tư vấn khách muốn ở gần biển, trường, chỗ làm.
* **Tôi muốn:** Thấy vòng bán kính quanh điểm mốc đang tìm, và bật / tắt các nhóm tiện ích nổi bật của Đà Nẵng trên bản đồ.
* **Để:** Cùng khách nhìn ngay căn nào nằm trong cự ly mong muốn.

---

## 2. Tiền điều kiện (Pre-conditions)
* Có `GET /apartments/search/pins` (yêu cầu đăng nhập — Story 14.4) và `GET /apartments/search/landmarks` (công khai).
* Story 15.1 xong (cùng file bản đồ). Không cấu hình mới, không thêm thư viện.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Vòng bán kính
* **Given** đang tìm theo điểm mốc (chọn trong Bộ lọc, hoặc câu tìm có tên điểm mốc)
* **Then** bản đồ có:
  - ghim đặc biệt (icon `Flag`, kèm tên ngắn, VD "Cầu Rồng") tại tâm;
  - vòng tròn màu indigo `#4f46e5`, nền mờ ~8%, đúng bán kính theo mét;
  - bản đồ canh khung **bao trọn vòng tròn** (thay cho canh theo ghim).
* Bỏ điểm mốc → vòng và ghim mốc biến mất.

### AC2 — Đọc bán kính trong câu tìm
* "gần Cầu Rồng 2km", "ĐH Kinh tế 1.5 km", "near dragon bridge 3km" → bán kính tương ứng.
* Giới hạn 0.5–20km; không có số → mặc định 2km như hiện tại.
* Số "km" không bị hiểu nhầm thành giá / số phòng.

### AC3 — Lớp tiện ích Đà Nẵng
* Dải chip cuộn ngang ở cạnh trên bản đồ, icon lucide (không dùng emoji):
  | Chip | Điểm |
  | :--- | :--- |
  | Bãi biển | Mỹ Khê, Non Nước, Phạm Văn Đồng, T20 |
  | Chợ & TTTM | Chợ Hàn, Chợ Cồn, Chợ Bắc Mỹ An, Vincom, Lotte Mart |
  | Đại học | Bách Khoa, Kinh tế, Sư Phạm, Duy Tân, FPT |
  | Sân bay & Cầu | Sân bay, Cầu Rồng, Cầu Sông Hàn, Cầu Trần Thị Lý |
* Bật 1 chip → icon tròn 28px hiện trên bản đồ (vùng chạm ≥ 44px nhờ phần đệm trong suốt), màu khác hẳn bong bóng giá; bật nhiều chip cùng lúc được; app nhớ lựa chọn trên máy.
* Chạm icon → popup tên địa điểm. Nếu đã có vị trí GPS (15.1): kèm "cách bạn ~X km"; nếu đang tìm điểm mốc: kèm "cách [mốc] ~X km".
* Chip có `aria-pressed`, tương phản ≥ 4.5:1.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/modules/search/search.service.ts`:** `buildContext` đọc `(\d+(?:[.,]\d+)?)\s*km` trong câu khi chưa có `radiusKm` (kẹp 0.5–20) và bỏ cụm này khỏi từ khóa.
* **`backend/src/modules/search/text-tokens.ts`:** cụm `\d+km` không còn là từ khóa (thêm vào `PRICE_TOKEN` hoặc bỏ trước khi tách từ).
* **`backend/src/modules/search/map-pins.service.ts`:** trả thêm `landmark: { name, coordinates, radiusKm } | null` (lấy từ `buildContext`).
* **`backend/src/modules/search/landmarks.data.ts`:** thêm `POIS` (danh sách **riêng**, chỉ hiển thị) gồm `group: 'BEACH' | 'MARKET' | 'UNIVERSITY' | 'TRANSPORT'`, tái dùng tọa độ các mốc đã có + bổ sung Chợ Cồn, Chợ Bắc Mỹ An, bãi Phạm Văn Đồng, bãi T20, Cầu Trần Thị Lý (tọa độ kiểm tra trên bản đồ OSM).
* **`backend/src/modules/search/search.controller.ts` + `search.routes.ts`:** `GET /apartments/search/pois` (công khai — chỉ địa điểm công cộng, dùng lại cho Story 15.5).

### Frontend:
* **`frontend/src/api/apartmentApi.ts`:** kiểu `landmark` trong kết quả ghim; `getPois()`.
* **`frontend/src/components/map/ApartmentMap.tsx`:**
  - Layer riêng cho vòng mốc (`L.circle`, `L.marker`) và tiện ích.
  - Có `landmark` → `fitBounds(circle.getBounds())` thay cho canh theo ghim.
* **`frontend/src/components/map/PoiChips.tsx` (mới):** dải chip + lưu lựa chọn (`localStorage` bọc try/catch).
* **`frontend/src/components/map/MapPanel.tsx`:** đặt chip, truyền danh sách tiện ích đang bật xuống bản đồ.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Hàm đọc bán kính: 5 câu ở AC2 (tsx, scratchpad); "studio dưới 6tr" không sinh bán kính; "phòng 25m2" không bị hiểu là km.
* [ ] API: `pins?landmark=cau-rong&radiusKm=1` trả `landmark.radiusKm = 1`; `/search/pois` 200 không cần token.
* [ ] Tìm theo **đường** "Phạm Văn Đồng" vẫn là tìm theo chữ (không thành bán kính).
* [ ] Chrome headless 390px: chọn mốc Cầu Rồng 2km → có vòng + ghim mốc, khung bao trọn; bật chip Bãi biển → 4 icon; chạm icon → popup; chip cuộn ngang không tràn trang.
* [ ] `tsc` 2 phía + build không lỗi.
* [ ] Báo cáo và đề xuất commit, chờ duyệt.

---

## 6. Rủi ro & lựa chọn
* Tọa độ tiện ích bổ sung nhập tay — cần Project Owner xem lại nhanh vị trí trên bản đồ sau khi làm.
* Epic dùng emoji cho chip; Story dùng icon lucide theo quy tắc UI của dự án (không dùng emoji làm icon).
