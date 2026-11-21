# STORY 17.4: Ghim Vị Trí Trực Quan Trên Bản Đồ & Định Vị GPS Hiện Tại (Interactive Pin-on-Map Picker & Current GPS Snapping)

**Bối cảnh:** `docs/stories/EPIC_17_MULTI_CHANNEL_AUTO_POSTING_AND_PRECISION_MAPS.md` (Story 17.4).  
Hiện nay nhiều môi giới và Quản lý gặp khó khăn khi nhập vị trí căn hộ: hoặc chỉ nhập địa chỉ dạng chữ (khiến hệ thống phải ước tính về tâm phường/quận), hoặc phải mở ứng dụng Google Maps riêng biệt để chia sẻ link rồi paste vào form. Story này hoàn thiện công cụ **Ghim vị trí trực quan trên bản đồ (Interactive Pin-on-Map Picker)** và nút **Lấy vị trí GPS hiện tại (GPS Snapping)** ngay trên form thêm/sửa căn hộ, đồng thời hỗ trợ **Tự động điền địa chỉ ngược (Reverse Geocoding)** để ghim đến đâu là nhận diện tên đường/khu vực đến đó.

---

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý hoặc CTV đang nạp/chỉnh sửa thông tin căn hộ vào hệ thống.
* **Tôi muốn:** Có thể mở một bản đồ tương tác trực quan ngay trên form nhập liệu để kéo thả ghim đến đúng nóc tòa nhà, hoặc bấm 1 nút để lấy tọa độ GPS chính xác nơi tôi đang đứng khảo sát.
* **Để:** Căn hộ có tọa độ GPS chính xác tuyệt đối 100% (đến từng mét) mà không cần chuyển đổi qua lại giữa ứng dụng Google Maps, chấm dứt hoàn toàn hiện tượng dồn cục ở tâm quận.

---

## 2. Tiền điều kiện (Pre-conditions)
* Môi trường trình duyệt hỗ trợ Leaflet (với các tile layer đã cấu hình CARTO / OpenStreetMap).
* Với tính năng GPS hiện tại: Trình duyệt được cấp quyền truy cập vị trí (`navigator.geolocation`).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Bản Đồ Chọn Vị Trí Trực Quan (Interactive Pin Picker)
* **Given** Quản lý hoặc CTV đang ở mục Vị trí trên [LocationSection.tsx](file:///d:/CODE/AppartmentSaleProject/frontend/src/components/apartment/LocationSection.tsx)
* **When** người dùng bấm nút `[📍 Đặt vị trí trên bản đồ]` hoặc `[Sửa vị trí trên bản đồ]`
* **Then** hệ thống mở giao diện [LocationPicker.tsx](file:///d:/CODE/AppartmentSaleProject/frontend/src/components/apartment/LocationPicker.tsx):
  - Khung bản đồ hiển thị mượt mà với tâm mặc định tại Đà Nẵng (hoặc vị trí tọa độ đã lưu trước đó của căn).
  - Ghim vị trí (Marker Pin) hiển thị nổi bật ở trung tâm bản đồ. Người dùng có thể kéo bản đồ hoặc kéo thả ghim tới đúng nóc tòa nhà.
  - Tọa độ GPS `[kinh độ, vĩ độ]` được cập nhật theo thời gian thực với độ chuẩn xác 6 chữ số thập phân (dung sai $< 0.1\text{m}$).
  - Hiển thị nhãn trạng thái trực quan: `Đã có vị trí chính xác (Chính xác 100%)` màu xanh lá.

### AC2 — Bắt Vị Trí GPS Nơi Đang Đứng (GPS Snapping)
* **Given** môi giới đang đi khảo sát thực tế tại căn hộ và đang mở form trên điện thoại
* **When** người dùng bấm nút `[🎯 Vị trí hiện tại]`
* **Then** hệ thống gọi API `navigator.geolocation.getCurrentPosition` với cờ `enableHighAccuracy: true`:
  - Trong lúc lấy vị trí: Nút hiển thị icon xoay tải ngầm (spinner) và vô hiệu hóa tạm thời.
  - Khi lấy thành công: Bản đồ tự động lướt (flyTo) với hiệu ứng mượt mà và zoom cận cảnh cấp độ 18–19 về đúng tọa độ người dùng đang đứng.
  - Cập nhật ngay tọa độ ghim vào form.
* **And** nếu người dùng từ chối cấp quyền định vị hoặc GPS yếu: Hiển thị thông báo hướng dẫn nhẹ nhàng: *"Không lấy được vị trí GPS. Vui lòng bật định vị trên điện thoại hoặc kéo ghim thủ công."*.

### AC3 — Tự Động Phân Giải Tên Đường & Khu Vực Ngược (Reverse Geocoding)
* **Given** người dùng di chuyển ghim đến một điểm mới trên bản đồ
* **When** người dùng bấm `[Xác nhận vị trí]`
* **Then** hệ thống gọi dịch vụ Reverse Geocoding ngầm (thông qua API proxy backend hoặc Nominatim có debounce):
  - Tự động trích xuất Tên đường và Phường/Khu vực.
  - Nếu ô "Tên đường" hoặc "Khu vực" trên form đang để trống $\rightarrow$ Tự động điền giá trị được phân giải vào ô tương ứng.
  - Nếu người dùng đã gõ tên đường trước đó $\rightarrow$ Không ghi đè tùy tiện mà hiển thị gợi ý xác nhận.

### AC4 — Giới Hạn Vùng Địa Lý Hợp Lệ (Danang Geofence Guard)
* **Given** người dùng kéo ghim hoặc thiết bị trả về tọa độ ở tỉnh khác (Hà Nội, Sài Gòn...)
* **When** người dùng cố gắng bấm `[Xác nhận vị trí]`
* **Then** hệ thống chặn lại và báo lỗi cảnh báo:
  > *"⚠️ Vị trí ghim phải nằm trong phạm vi khu vực Đà Nẵng (Vĩ độ: 15.80 – 16.25, Kinh độ: 107.90 – 108.40)."*

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Frontend:
* **`frontend/src/components/apartment/LocationPicker.tsx`:**
  - Nâng cấp trải nghiệm UX:
    - Bổ sung nút phóng to / thu nhỏ tiện lợi.
    - Tích hợp lớp bản đồ Vệ tinh (Esri Satellite / Google Satellite Tiles) để người dùng dễ nhìn thấy nóc tòa nhà và ban công.
    - Tích hợp nút `Vị trí hiện tại` có haptic feedback và báo lỗi thân thiện.
    - Hiển thị thanh thông tin tọa độ hiện tại `[16.054321, 108.234567]` và độ chính xác ước tính.
* **`frontend/src/components/apartment/LocationSection.tsx`:**
  - Tích hợp nút mở `LocationPicker` kèm huy hiệu trạng thái: `[EXACT - Vị trí chuẩn xác]` vs `[APPROXIMATE - Vị trí ước tính]`.
  - Tự động nhận diện toạ độ ghim mới `pinned: [lng, lat]` và chuyển cờ `geoPrecision = 'EXACT'`.
* **`frontend/src/utils/reverseGeocoding.ts` (Tạo mới):**
  - Hàm `reverseGeocodeDanang(lng, lat)`: Phân giải tọa độ ra tên đường và khu vực (Sơn Trà, Ngũ Hành Sơn, Hải Châu...).

### Backend:
* **`backend/src/modules/apartments/apartment.model.ts`:**
  - Đảm bảo trường `location.coordinates` lưu chuẩn GeoJSON Point `[longitude, latitude]`.
  - Lưu trường `location.geoPrecision`: `'EXACT' | 'APPROXIMATE'`.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Kiểm tra kéo ghim: Di chuyển ghim trên bản đồ cập nhật đúng kinh độ / vĩ độ 6 số thập phân.
* [ ] Kiểm tra GPS Snapping: Bấm "Vị trí hiện tại" trên điện thoại nhảy đúng tọa độ GPS với độ chính xác cao.
* [ ] Kiểm tra Geofence: Kéo ghim ra ngoài Đà Nẵng $\rightarrow$ Bị chặn lưu và hiện thông báo rõ ràng.
* [ ] Kiểm tra lưu form: Căn hộ sau khi ghim được lưu với `geoPrecision = 'EXACT'` và hiển thị đúng vị trí trên bản đồ lớn của hệ thống.
