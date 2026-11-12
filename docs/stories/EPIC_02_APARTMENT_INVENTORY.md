# EPIC-02: Bảng hàng Căn hộ & Quản lý Kho (Apartment Inventory)

## Mục tiêu
Xây dựng trung tâm lưu trữ và quản lý bảng hàng căn hộ, hỗ trợ đầy đủ các trường thông tin đặc thù của thị trường căn hộ/phòng trọ Việt Nam, theo dõi trạng thái trống/cọc theo thời gian thực.

---

### User Story 2.1: Nhập liệu & Quản lý Căn hộ chi tiết (CRUD Apartment)
* **Là một:** Quản lý hoặc Quản trị viên.
* **Tôi muốn:** Thêm mới, chỉnh sửa, xóa và quản lý danh sách căn hộ với đầy đủ thông số chi tiết.
* **Để:** Tạo kho hàng phong phú, chuẩn hóa cho toàn bộ CTV khai thác.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. Hỗ trợ đầy đủ các trường đặc thù:
     * Tiêu đề, mô tả.
     * Mức giá thuê, số tiền cọc (tháng), hoa hồng CTV (% hoặc số tiền cứng).
     * Địa chỉ phân cấp: Số nhà/ngõ, Đường, Phường, Quận, Thành phố + Tọa độ GPS.
     * Thuộc tính phòng: Diện tích ($m^2$), số phòng ngủ, phòng khách, phòng tắm, ban công.
     * Tình trạng nội thất: `Trống`, `Cơ bản`, `Full nội thất`.
     * Tiện ích phụ: Thang máy, ô tô đỗ cửa, cho nuôi thú cưng (pet), máy giặt riêng/chung, PCCC đạt chuẩn.
     * Bảng chi phí dịch vụ: Tiền điện (kWh), tiền nước (khối hoặc người), phí dịch vụ chung, phí gửi xe.
  2. Upload nhiều hình ảnh và video ngắn (lưu trên Cloudinary hoặc S3).
  3. Validate ràng buộc dữ liệu (giá > 0, địa chỉ không được để trống).

---

### User Story 2.2: Quản lý Trạng thái Vòng đời Căn hộ (Listing Status & Availability)
* **Là một:** CTV hoặc Quản lý.
* **Tôi muốn:** Biết chính xác căn hộ đang ở trạng thái nào (Trống ở ngay, Đã cọc, Đã thuê, hoặc Sắp trống từ ngày X).
* **Để:** Không mất công tư vấn cho khách những căn đã hết phòng.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. Căn hộ có các trạng thái rõ ràng:
     * `AVAILABLE` (Trống ở ngay - hiển thị nổi bật màu xanh lá).
     * `UPCOMING` (Sắp trống - có chọn ngày khách cũ chuyển đi).
     * `DEPOSITED` (Đang giữ cọc - tạm ẩn hoặc đánh dấu vàng).
     * `RENTED` (Đã có khách ở - tự động ẩn khỏi bảng hàng tìm kiếm của CTV).
  2. Quản lý có thể cập nhật trạng thái phòng chỉ bằng 1 thao tác click nhanh ngay trên danh sách.

---

### User Story 2.3: Mô hình Căn hộ Gốc & Nguồn tham chiếu (Master - Sub Listings)
* **Là một:** Quản lý hệ thống.
* **Tôi muốn:** Gom các bài đăng cùng 1 căn hộ từ nhiều nguồn khác nhau vào 1 căn hộ gốc (Master).
* **Để:** Bảng hàng không bị rác và CTV có thể so sánh giá/ảnh giữa các nguồn.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. Một `Master Apartment` có thể chứa mảng các `subListings` (Nguồn Telegram ngày 10/11 giá 6.5tr, Nguồn Zalo ngày 12/11 giá 6.2tr).
  2. Giao diện hiển thị giá chuẩn nhất do Quản lý chọn làm giá đại diện.

