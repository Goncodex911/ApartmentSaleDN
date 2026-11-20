# STORY 15.7: Chọn Vị Trí Chính Xác Khi Nhập Căn (Exact Location Pin Picker & Building Name)

**Bối cảnh:** Epic 15. Project Owner muốn bản đồ (trong app và trang khách) hiện **đúng vị trí** từng căn. Hiện chỉ có 1 cách lấy tọa độ chính xác: dán link Google Maps (Story 8.3 / 13.8); còn lại là ước lượng theo tên đường (15.6) hoặc tâm quận.
Định vị tự động theo **số nhà** ở Việt Nam (OSM / Nominatim) rất thiếu dữ liệu → không đủ tin cậy. Cách chính xác nhất là **người nhập tự đặt ghim**.

---

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý / CTV nhập hoặc sửa căn.
* **Tôi muốn:** Đặt ghim đúng chỗ căn hộ trên bản đồ ngay trong form (hoặc dùng vị trí GPS khi đang đứng tại căn), và ghi tên tòa nhà / dự án.
* **Để:** Mọi bản đồ hiện đúng vị trí mà không bắt buộc phải có link Google Maps.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story 15.1 (`mapTiles.ts`, định vị GPS), Story 15.6 (`location.geoPrecision`, định vị tên đường).
* Không thêm thư viện.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Trường thông tin mới
| Trường | Bắt buộc | Mục đích |
| :--- | :---: | :--- |
| `location.coordinates` + `geoPrecision = EXACT` | Không | Tọa độ chính xác từ ghim kéo tay / GPS / link Maps |
| `location.buildingName` | Không | Tên tòa nhà / dự án (VD "Monarchy", "Hiyori") — hiện trên trang khách, giúp tìm kiếm |
| `location.ward` | Không (đã có, chưa hiện trên form) | Phường — hoàn thiện địa chỉ đầy đủ |

### AC2 — Ghim trên form
* Mục Vị trí của form thêm / sửa căn (và form CTV đăng tin) có bản đồ nhỏ + `[Đặt vị trí trên bản đồ]`.
* Bản đồ mở sẵn ở vị trí tốt nhất đang có: link Maps → tên đường (15.6) → khu vực.
* Kéo **bản đồ** dưới 1 ghim cố định giữa khung (dễ thao tác 1 tay hơn kéo ghim), bấm `[Xác nhận vị trí]` → lưu tọa độ, độ chính xác `EXACT`.
* `[Dùng vị trí hiện tại]` (GPS, khi đang đứng ở căn) → đưa bản đồ tới vị trí đó để xác nhận.
* Dán link Maps vẫn hoạt động; link Maps và ghim cùng có → lấy cái được đặt sau cùng, có dòng nhắc nguồn đang dùng.

### AC3 — Hiển thị
* Bản đồ trong app: căn `EXACT` có viền liền, căn khác viền nét đứt (giữ quy ước Story 11.2 / 15.6).
* Danh sách căn: Quản lý lọc được "Chưa có vị trí chính xác" để bổ sung dần.

### AC4 — Kiểm tra dữ liệu
* Tọa độ phải nằm trong khung Đà Nẵng mở rộng (gồm Hội An); ngoài khung → báo lỗi ngay dưới bản đồ.
* Chữ ô nhập ≥ 16px, vùng bấm ≥ 44px, bản đồ trong form không làm tràn ngang ở 390px.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/modules/apartments/apartment.model.ts`:** `location.buildingName`, `location.geoPrecision` (nếu 15.6 chưa thêm).
* **`backend/src/modules/apartments/apartment.validation.ts`:** `buildingName` (≤ 100 ký tự), `coordinates` kiểm tra khung Đà Nẵng.
* **`backend/src/modules/apartments/apartment-location.ts`:** client gửi `coordinates` → `EXACT` (đã ưu tiên tọa độ gửi lên — dòng `if (input.coordinates?.length === 2) return;`).
* **`backend/src/modules/search/*`:** `buildingName` vào trường tìm theo chữ (KEYWORD_FIELDS, Atlas path).
* **Lọc "chưa có vị trí chính xác":** tham số `precision=NOT_EXACT` cho Quản lý.

### Frontend:
* **`frontend/src/components/apartment/LocationPicker.tsx` (mới):** Leaflet lazy, ghim cố định giữa khung, GPS.
* **`frontend/src/components/apartment/LocationSection.tsx`:** thêm ô Tên tòa nhà, Phường, nút mở `LocationPicker`.
* **`frontend/src/api/apartmentApi.ts`:** kiểu mới.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Đặt ghim → lưu `EXACT`, ghim trên bản đồ app và trang khách trùng chỗ đã đặt.
* [ ] Tọa độ ngoài Đà Nẵng → 400 với câu báo rõ.
* [ ] Tìm "Monarchy" ra căn có `buildingName` đó.
* [ ] Chrome headless 390px: mở picker, kéo bản đồ, xác nhận; GPS giả lập; không tràn ngang.
* [ ] `tsc` 2 phía + build không lỗi.
* [ ] Báo cáo và đề xuất commit, chờ duyệt.
