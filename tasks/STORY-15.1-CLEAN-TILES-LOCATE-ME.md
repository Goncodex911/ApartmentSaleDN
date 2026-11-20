# STORY 15.1: Bản Đồ Nền Tối Giản & Nút Định Vị GPS Thực Địa (Clean Map Tiles & Field Locate-Me)

**Bối cảnh:** Epic 15. Bản đồ Bảng hàng (Story 11.2, `ApartmentMap.tsx`) đang dùng tile OpenStreetMap chuẩn: nhiều chi tiết, màu đậm, nên bong bóng giá khó nổi bật ngoài nắng. CTV đứng ngoài đường cũng không có cách nhanh để xem các căn quanh mình.

**⚠️ Cập nhật điều khoản CARTO (kiểm tra ngày 21/11/2026)** — khác với `EXTERNAL_CONFIG.md` bản cũ:
* Tile CARTO **cần API key** (miễn phí, đăng ký không cần chờ duyệt). Không có key thì tile bị đóng dấu "API key required".
* Dùng cho kinh doanh **miễn phí tối đa 1 triệu lượt tải tile / tháng**; vượt thì gói trả phí từ $500 / tháng.
* Bắt buộc ghi nguồn `© OpenStreetMap contributors, © CARTO`. Không được cache tile phía server, không cache trên máy quá 30 ngày.
* Key nằm ở frontend → **phải khóa theo tên miền** trong trang quản lý key của CARTO.

---

## 1. Mô tả Story (User Story)
* **Là một:** CTV đang khảo sát hoặc dẫn khách ngoài đường tại Đà Nẵng.
* **Tôi muốn:** Bản đồ sáng, tối giản để bong bóng giá nổi rõ, và 1 nút để bay tới vị trí GPS tôi đang đứng.
* **Để:** Thấy ngay các căn còn trống quanh mình mà không phải tra địa chỉ.

---

## 2. Tiền điều kiện (Pre-conditions)
* Project Owner đăng ký key CARTO (miễn phí), khóa theo tên miền Netlify + `localhost`, khai báo `VITE_MAP_TILE_URL` (xem mục 6). **Chưa có key → app tự dùng tile OSM như hiện tại**, không vỡ bản đồ.
* App chạy HTTPS (Netlify đã có) — trình duyệt chỉ cho dùng GPS trên HTTPS hoặc `localhost`.
* Không thêm thư viện (Leaflet đã có).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Bản đồ nền theo cấu hình
* **Given** đã khai báo `VITE_MAP_TILE_URL` (CARTO Voyager kèm `?key=`)
* **Then** bản đồ dùng tile đó, hỗ trợ màn hình retina (`{r}`), góc dưới phải ghi `© OpenStreetMap contributors, © CARTO`.
* **Given** chưa khai báo
* **Then** dùng tile OSM chuẩn như hiện tại, chỉ ghi nguồn OSM.
* Service Worker **không** cache tile (giữ như Story 11.2).

### AC2 — Nút định vị
* Nút tròn icon `LocateFixed` (lucide) ngay dưới nút phóng to / thu nhỏ, vùng bấm ≥ 44px, `aria-label="Vị trí của tôi"`.
* Bấm → xin quyền vị trí → nút hiện vòng xoay trong lúc chờ (tối đa 10 giây).
* Có vị trí → bản đồ lướt tới vị trí đó ở mức phóng to 16 (người bật giảm chuyển động: nhảy thẳng, không lướt).
* Hiện **chấm xanh** tại vị trí kèm **vòng tròn mờ** đúng bán kính sai số GPS (`accuracy`, mét). Chấm có hiệu ứng tỏa nhịp; tắt hiệu ứng khi giảm chuyển động.
* Bấm lại → lấy vị trí mới và lướt về.

### AC3 — Lỗi định vị không làm hỏng bản đồ
* Từ chối quyền / không có GPS / quá thời gian → hiện dòng báo nhỏ trên bản đồ (`role="status"`, tự ẩn sau 4 giây):
  * Từ chối quyền: "Bạn đã tắt quyền vị trí cho app. Bật lại trong Cài đặt trình duyệt rồi thử lại."
  * Lỗi khác: "Không lấy được vị trí hiện tại. Vui lòng bật định vị trên điện thoại."
* Trình duyệt không hỗ trợ định vị → ẩn nút.

### AC4 — Quyền riêng tư
* Vị trí của CTV **chỉ dùng trên máy**, không gửi về server, không lưu.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Frontend:
* **`frontend/src/utils/mapTiles.ts` (mới):** `TILE_URL = import.meta.env.VITE_MAP_TILE_URL || OSM`, `TILE_ATTRIBUTION` tự chọn theo tên miền (có `cartocdn` → thêm `© CARTO`). Dùng chung cho Story 15.5.
* **`frontend/src/vite-env.d.ts`:** khai báo kiểu `VITE_MAP_TILE_URL?: string`.
* **`frontend/src/components/map/ApartmentMap.tsx`:**
  - Dùng `mapTiles.ts`, `maxZoom` 20.
  - Thêm prop `locate` (hoặc `forwardRef` trả `flyToUser`) để lớp nút ở `MapPanel` điều khiển bản đồ.
  - Vẽ chấm xanh bằng `L.divIcon` và vòng sai số bằng `L.circle` trong 1 `layerGroup` riêng (không bị xóa khi vẽ lại ghim).
* **`frontend/src/components/map/LocateButton.tsx` (mới):** trạng thái `idle | locating | error`, gọi `navigator.geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 })`, phân biệt `PERMISSION_DENIED`.
* **`frontend/src/components/map/MapPanel.tsx`:** đặt `LocateButton` + dòng báo lỗi (z-index trên Leaflet như các lớp phủ hiện có).
* **`frontend/src/index.css`:** keyframe tỏa nhịp cho chấm xanh, `@media (prefers-reduced-motion: reduce)` tắt.

### Cấu hình & tài liệu:
* **`EXTERNAL_CONFIG.md` mục 8.1 + `.env.example`:** cập nhật điều khoản CARTO mới (key bắt buộc, 1 triệu tile / tháng, khóa tên miền) và vị trí đặt biến khi chạy local (`frontend/.env.local` — Vite không đọc file `.env` ở gốc repo).

### Backend:
* Không đổi.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Có `VITE_MAP_TILE_URL` → tile CARTO, không có chữ "API key required", ghi nguồn đủ 2 dòng. Không có → tile OSM.
* [ ] Chrome headless 390px, giả lập vị trí (`Emulation.setGeolocationOverride`): bấm nút → bản đồ về đúng vị trí, có chấm xanh + vòng sai số; giả lập từ chối quyền → hiện câu báo, bản đồ vẫn dùng được.
* [ ] Vùng bấm ≥ 44px; giảm chuyển động → không lướt, không tỏa nhịp.
* [ ] Thử trên điện thoại thật (iPhone Safari + Android Chrome) sau khi deploy: bay đúng vị trí trong ~2 giây khi có GPS.
* [ ] `tsc` + `npm run build` frontend không lỗi.
* [ ] Báo cáo và đề xuất commit, chờ duyệt.

---

## 6. Cấu hình Project Owner cần làm
1. Vào trang key của CARTO (`https://carto.com/basemaps/` → Get API key), đăng ký bằng email của bạn.
2. Khóa key theo website: `https://apartmentsaledn.netlify.app` và `http://localhost:5173`.
3. **Netlify** → Site settings → Environment variables: `VITE_MAP_TILE_URL=https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=<KEY>` → deploy lại (biến `VITE_` được gắn vào lúc build).
4. **Chạy local:** tạo `frontend/.env.local` với cùng dòng trên (file đã nằm trong `.gitignore`, không commit).

## 7. Rủi ro & lựa chọn
* **Hạn mức 1 triệu tile / tháng:** 1 lần mở bản đồ + kéo vài lần ≈ 50–150 tile. Đội 20 CTV dùng hằng ngày ≈ 300.000–900.000 tile / tháng — sát ngưỡng khi đội lớn. Theo dõi trên trang CARTO; vượt thì xóa biến → app tự về tile OSM (cũng có giới hạn "dùng nhẹ").
* Phương án khác nếu không muốn đăng ký: giữ OSM (không đẹp bằng) hoặc Stadia / MapTiler (gói free, cũng cần key) — chỉ đổi giá trị `VITE_MAP_TILE_URL`.
