# STORY-4.3: Thanh lọc Nhanh 1-Chạm trên Di động (1-Tap Faceted Filter)

## 1. Mô tả Story (User Story)
* **Là một:** Cộng tác viên môi giới (CTV) sử dụng điện thoại thông minh để tìm phòng cho khách hàng.
* **Tôi muốn:** Có các hàng tag lọc nhanh cuộn ngang hiển thị theo các tiêu chí thực tế quan trọng nhất (khoảng giá, loại phòng, tiện ích hot) để chạm chọn tức thì bằng một ngón tay thay vì phải mở nhiều tầng menu dropdown phức tạp.
* **Để:** Lọc ngay danh sách căn hộ phù hợp trong chưa đầy 3 giây khi đang trực tiếp gọi điện hoặc nhắn tin tư vấn khách hàng.

---

## 2. Tiền điều kiện (Pre-conditions)
1. Model `Apartment` đã có đầy đủ các trường thông tin:
   * `price`: Giá thuê hàng tháng (VNĐ).
   * `attributes.bedrooms`: Số phòng ngủ (0 = Studio, 1, 2, ...).
   * `attributes.balcony`: Ban công (boolean).
   * `attributes.elevator`: Thang máy (boolean).
   * `attributes.allowPets`: Cho phép nuôi thú cưng (boolean).
   * `attributes.carParking`: Ô tô đỗ cửa (boolean).
   * `attributes.pcccStandard`: Tiêu chuẩn PCCC (boolean).
2. Backend API tìm kiếm `GET /api/v1/apartments/search` (từ Story 4.1 & 4.2) đã hoạt động ổn định.

---

## 3. Tiêu chí Chấp nhận (Acceptance Criteria - Gherkin)

### AC1: Các Dải Tag Lọc Nhanh Cuộn Ngang (Horizontal Scrollable Chips)
* **Given:** CTV truy cập Bảng hàng căn hộ trên màn hình điện thoại hoặc máy tính bảng.
* **When:** CTV quan sát khu vực bộ lọc trên giao diện.
* **Then:** Hệ thống hiển thị 3 dải tag lọc nhanh phân loại rõ ràng, hỗ trợ vuốt chạm cuộn ngang mượt mà (`overflow-x-auto` không thanh cuộn thô):
  1. **Khoảng giá (Price Ranges):**
     * `[< 5 triệu]` (0 - 5.000.000 VNĐ)
     * `[5 - 8 triệu]` (5.000.000 - 8.000.000 VNĐ)
     * `[8 - 12 triệu]` (8.000.000 - 12.000.000 VNĐ)
     * `[> 12 triệu]` (> 12.000.000 VNĐ)
  2. **Loại phòng (Room Types):**
     * `[Studio]` (`bedrooms: 0` hoặc tiêu đề/mô tả Studio)
     * `[1PN / 1N1K]` (`bedrooms: 1`)
     * `[2PN]` (`bedrooms: 2`)
     * `[Duplex / Gác xép]` (Duplex hoặc căn có gác lửng)
  3. **Tiện ích Hot (Hot Amenities):**
     * `[🛗 Thang máy]` (`elevator: true`)
     * `[🐾 Nuôi Pet]` (`allowPets: true`)
     * `[🚗 Ô tô đỗ cửa]` (`carParking: true`)
     * `[🌿 Ban công]` (`balcony: true`)
     * `[🛡️ PCCC đạt chuẩn]` (`pcccStandard: true`)

### AC2: Lọc Tức Thì & Bỏ Nút "Áp Dụng" (Instant Reactive Filtering)
* **Given:** CTV chạm vào bất kỳ tag nào trên thanh lọc nhanh.
* **When:** Tag được kích hoạt.
* **Then:**
  * Hệ thống cập nhật danh sách căn hộ ngay lập tức (< 200ms) mà **không cần bấm nút "Áp dụng" hay "Lọc"**.
  * Chạm lần 1: Kích hoạt bộ lọc (Tag đổi sang màu nổi bật, có viền & bóng).
  * Chạm lần 2 vào cùng tag: Hủy kích hoạt (Toggle Off), quay lại trạng thái mặc định.

### AC3: Kết Hợp Đa Tiêu Chí & Nút "Xóa Tất Cả" (Multi-faceted & Reset)
* **Given:** CTV muốn tìm phòng có nhiều yêu cầu khắt khe.
* **When:** CTV chạm chọn đồng thời: `[5 - 8 triệu]` + `[1PN / 1N1K]` + `[🐾 Nuôi Pet]` + `[🛗 Thang máy]`.
* **Then:**
  * Hệ thống áp dụng logic giao (AND): lọc đúng các căn hộ thỏa mãn đồng thời tất cả các tiêu chí đã chọn.
  * Hiển thị nút `Xóa bộ lọc (Reset)` kèm huy hiệu đếm tổng số tiêu chí đang lọc (VD: `Đang lọc: 4`).
  * Bấm `Xóa bộ lọc` sẽ đưa tất cả về mặc định chỉ với 1 chạm.

### AC4: Tối Ưu Backend Query & Index Khảo sát
* **Given:** Lượng truy vấn lọc nhanh gửi liên tục từ các thiết bị di động.
* **When:** API `GET /api/v1/apartments/search` tiếp nhận các tham số: `priceRange`, `roomType`, `elevator`, `allowPets`, `carParking`, `balcony`, `pcccStandard`.
* **Then:**
  * Backend ánh xạ chính xác vào các điều kiện truy vấn MongoDB.
  * Thời gian phản hồi API duy trì tốc độ < 200ms.
  * Tiếp tục tuân thủ Data Masking số điện thoại chủ nhà đối với CTV.

---

## 4. Phạm vi Kỹ thuật (Technical Implementation Scope)

### A. Backend Architecture:
```plaintext
backend/src/modules/search/
├── search.service.ts         # Mở rộng ISearchOptions: priceRange, roomType, elevator, allowPets, carParking, balcony, pcccStandard
├── search.controller.ts      # Tiếp nhận và ép kiểu các tham số boolean & range
└── search.routes.ts          # Giữ nguyên routes GET /api/v1/apartments/search
```

### B. Frontend Architecture:
```plaintext
frontend/src/components/apartment/
├── FacetedFilterBar.tsx      # Component thanh lọc nhanh 1-chạm (Price, RoomType, Amenities)
├── ApartmentFilters.tsx      # Tích hợp FacetedFilterBar đồng bộ cùng thanh tìm kiếm mờ & điểm mốc
└── ApartmentCard.tsx         # Hiển thị các tiện ích tương ứng trên card
```

---

## 5. Danh sách Kiểm thử & Định nghĩa Hoàn thành (Definition of Done)
- [ ] Test Kịch bản 1: Bấm chọn khoảng giá `[5 - 8 triệu]` $\rightarrow$ Danh sách lập tức chỉ còn các căn giá từ 5tr đến 8tr.
- [ ] Test Kịch bản 2: Bấm chọn tiện ích `[🐾 Nuôi Pet]` $\rightarrow$ Danh sách chỉ còn các căn `allowPets: true`.
- [ ] Test Kịch bản 3: Kết hợp chọn `[1PN / 1N1K]` + `[🛗 Thang máy]` + Bán kính `[2 km]` quanh ĐH Quốc Gia $\rightarrow$ Kết quả thỏa mãn cả 3 tiêu chí cùng lúc.
- [ ] Test Kịch bản 4: Chạm lại vào tag đang chọn để hủy lọc (Toggle) $\rightarrow$ Danh sách tự nới lỏng điều kiện ngay lập tức.
- [ ] Test Kịch bản 5: Bấm nút `Xóa bộ lọc` $\rightarrow$ Đưa toàn bộ các tag về trạng thái ban đầu.
- [ ] Tuân thủ Ponytail: Toàn bộ các file tạo mới hoặc sửa đổi đều $\le 250$ dòng.
- [ ] Tuân thủ [WORKING_RULES.md](file:///d:/CODE/AppartmentSaleProject/WORKING_RULES.md): Không tự ý commit hoặc push mã nguồn khi chưa được người dùng cho phép.

