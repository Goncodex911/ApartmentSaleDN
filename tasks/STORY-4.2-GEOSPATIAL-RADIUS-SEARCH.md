# STORY-4.2: Tìm kiếm theo Bán kính & Điểm mốc (Geospatial Radius Search & 2dsphere)

## 1. Mô tả Story (User Story)
* **Là một:** Cộng tác viên môi giới (CTV) hoặc Quản lý kho hàng.
* **Tôi muốn:** Tìm kiếm các căn hộ cho thuê nằm trong bán kính X km (1km, 2km, 3km, 5km) xung quanh một trường đại học, bệnh viện hoặc tòa nhà văn phòng của khách thuê (Ví dụ: *"Quanh ĐH Quốc Gia bán kính 2km"* hoặc *"Quanh Keangnam 3km"*).
* **Để:** Đáp ứng chính xác nhu cầu đi lại thực tế của khách hàng, giúp CTV tự tin tư vấn ngay trong cuộc gọi mà không cần mất công tra Google Maps thủ công.

---

## 2. Tiền điều kiện (Pre-conditions)
1. Model `Apartment` trong MongoDB đã có trường `location.coordinates: [longitude, latitude]` (kinh độ, vĩ độ) và chỉ mục `2dsphere`.
2. Dữ liệu căn hộ có tọa độ địa lý (hoặc tự động chuyển đổi từ địa chỉ bằng Geocoding).
3. Đã có API tìm kiếm từ Story 4.1 để mở rộng thêm tham số bán kính.

---

## 3. Tiêu chí Chấp nhận (Acceptance Criteria - Gherkin)

### AC1: Chỉ mục Không gian Địa lý MongoDB `2dsphere` (Geospatial Index)
* **Given:** Cơ sở dữ liệu MongoDB Atlas lưu trữ các căn hộ.
* **When:** Hệ thống khởi tạo hoặc chạy truy vấn tìm kiếm không gian.
* **Then:** Trường `location.coordinates` được định dạng GeoJSON chuẩn: `[longitude, latitude]` với chỉ mục `2dsphere` đảm bảo tốc độ truy vấn cực nhanh (< 150ms).

### AC2: Bảng Tra Tọa độ Điểm Mốc & Đại học Phổ biến (Landmarks Geocoding)
* **Given:** Người dùng chọn hoặc gõ tên một trường đại học hoặc tòa nhà văn phòng lớn tại Hà Nội.
* **When:** Hệ thống nhận diện điểm mốc.
* **Then:** Hệ thống tự động chuyển đổi sang tọa độ GPS chính xác mà không cần tốn phí API Google Maps:
  * `ĐH Quốc Gia Hà Nội` $\rightarrow$ `[105.7825, 21.0378]`
  * `ĐH Sư Phạm Hà Nội` $\rightarrow$ `[105.7836, 21.0369]`
  * `ĐH Thương Mại` $\rightarrow$ `[105.7725, 21.0366]`
  * `ĐH Ngoại Thương (FTU)` $\rightarrow$ `[105.8055, 21.0227]`
  * `Học viện Báo chí & Tuyên truyền` $\rightarrow$ `[105.7907, 21.0375]`
  * `ĐH Bách Khoa Hà Nội` $\rightarrow$ `[105.8431, 21.0048]`
  * `ĐH Kinh tế Quốc dân (NEU)` $\rightarrow$ `[105.8427, 20.9998]`
  * `Tòa nhà Keangnam Landmark 72` $\rightarrow$ `[105.7839, 21.0167]`
  * `Lotte Center Liễu Giai` $\rightarrow$ `[105.8128, 21.0326]`
  * Đồng thời hỗ trợ Geocoding động qua OpenStreetMap/Nominatim cho các địa chỉ tự do khác.

### AC3: Lọc theo Bán kính ($geoNear / $nearSphere)
* **Given:** CTV chọn điểm mốc và khoảng cách bán kính (1km, 2km, 3km, 5km).
* **When:** Gọi API `GET /api/v1/apartments/search?lng=...&lat=...&radiusKm=2`.
* **Then:**
  * Hệ thống lọc ra tất cả các căn hộ có khoảng cách `distanceMeters <= radiusKm * 1000`.
  * Sắp xếp danh sách căn hộ theo thứ tự **từ gần nhất đến xa nhất**.
  * Trong mỗi căn hộ trả về, bổ sung trường `distanceKm` (Ví dụ: `0.6 km`, `1.2 km`).

### AC4: Hiển thị Khoảng cách & Bộ chọn Bán kính trên Web Portal
* **Given:** CTV mở giao diện tìm kiếm trên điện thoại hoặc máy tính.
* **When:** CTV bấm vào dropdown chọn Điểm mốc hoặc Bán kính.
* **Then:**
  * Cung cấp các nút chọn nhanh bán kính: `[1 km]` `[2 km]` `[3 km]` `[5 km]`.
  * Trên mỗi thẻ căn hộ (`ApartmentCard`), hiển thị huy hiệu khoảng cách nổi bật:
    `📍 Cách ĐH Quốc Gia 1.2 km` (màu xanh lá tươi sáng, dễ nhìn).

---

## 4. Phạm vi Kỹ thuật (Technical Implementation Scope)

### A. Backend (`backend/src/modules/search/`):
```plaintext
backend/src/modules/search/
├── landmarks.data.ts         # Từ điển tọa độ các trường đại học, bệnh viện, tòa nhà lớn tại Hà Nội
├── geocoding.service.ts      # Service xử lý geocoding tọa độ (Dictionary + Free OSM fallback)
├── search.service.ts         # Bổ sung logic `$geoNear` / `$nearSphere` tính khoảng cách km
└── search.controller.ts      # Tiếp nhận tham số: lat, lng, radiusKm, landmark
```

### B. Frontend Integration:
* Cập nhật [frontend/src/components/apartment/ApartmentFilters.tsx](file:///d:/CODE/AppartmentSaleProject/frontend/src/components/apartment/ApartmentFilters.tsx):
  * Thêm bộ chọn điểm mốc (`landmark`) và bán kính (`radiusKm`).
* Cập nhật [frontend/src/components/apartment/ApartmentCard.tsx](file:///d:/CODE/AppartmentSaleProject/frontend/src/components/apartment/ApartmentCard.tsx):
  * Hiển thị huy hiệu khoảng cách `distanceKm` khi có tìm kiếm theo điểm mốc.

---

## 5. Danh sách Kiểm thử & Định nghĩa Hoàn thành (Definition of Done)
- [ ] Test Kịch bản 1: Tìm kiếm bán kính 2km quanh `ĐH Quốc Gia` $\rightarrow$ Trả về đúng các căn hộ trong bán kính, sắp xếp gần nhất trước.
- [ ] Test Kịch bản 2: Giá trị `distanceKm` tính toán chuẩn xác (sai số < 50m).
- [ ] Test Kịch bản 3: Kết hợp tìm kiếm bán kính VÀ khoảng giá/loại phòng (VD: *"Quanh ĐH Thương Mại 2km giá dưới 6tr"*).
- [ ] Test Kịch bản 4: Hiển thị thẻ căn hộ kèm badge khoảng cách trên giao diện.
- [ ] Tuân thủ Ponytail: Sử dụng các công thức tính toán tọa độ (Haversine) và MongoDB native `$geoNear`, file < 250 dòng.
- [ ] Tuân thủ [WORKING_RULES.md](file:///d:/CODE/AppartmentSaleProject/WORKING_RULES.md): Không tự ý commit git khi chưa được phép.

