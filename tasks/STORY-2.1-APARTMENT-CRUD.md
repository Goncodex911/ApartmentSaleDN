# STORY-2.1: Nhập liệu & Quản lý Căn hộ chi tiết (CRUD Apartment & Cloudinary Upload)

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý nguồn hàng (Manager) hoặc Quản trị viên (Admin).
* **Tôi muốn:** Thêm mới, cập nhật, xóa và quản lý danh sách căn hộ với đầy đủ thông số đặc thù của thị trường Việt Nam cùng chức năng tải nhiều ảnh/video lên Cloudinary.
* **Để:** Tạo kho hàng phong phú, chuẩn hóa dữ liệu cho toàn bộ CTV dễ dàng tra cứu và xuất tin gửi khách.

---

## 2. Tiền điều kiện (Pre-conditions)
1. **[EPIC-01](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_01_AUTH_AND_PERMISSIONS.md)** đã hoàn thành: Đã có xác thực JWT và phân quyền RBAC (`ADMIN`, `MANAGER`, `COLLABORATOR`).
2. Tài khoản Cloudinary (`dhiifbnwf`) đã được cấu hình và kiểm thử thành công trong `.env`.

---

## 3. Tiêu chí Chấp nhận (Acceptance Criteria - Gherkin)

### AC1: Thêm mới căn hộ với đầy đủ thông số đặc thù Việt Nam
* **Given:** Quản lý đã đăng nhập và gửi request `POST /api/v1/apartments` với payload đầy đủ:
  * **Cơ bản:** Tiêu đề, mô tả, giá thuê (VNĐ/tháng), tiền cọc (tháng), hoa hồng CTV (tỷ lệ % hoặc số tiền cứng).
  * **Địa chỉ:** Số nhà/ngõ, Đường, Phường, Quận, Thành phố, Tọa độ GPS `[longitude, latitude]`.
  * **Thuộc tính phòng:** Diện tích ($m^2$), số phòng ngủ, phòng khách, phòng tắm, ban công.
  * **Nội thất:** `FULL` (Full đồ) | `BASIC` (Đồ cơ bản) | `EMPTY` (Phòng trống).
  * **Tiện ích:** Thang máy (`elevator`), ô tô đỗ cửa (`carParking`), nuôi thú cưng (`allowPets`), máy giặt riêng/chung (`washingMachine`), PCCC đạt chuẩn (`pcccStandard`).
  * **Phí dịch vụ:** Tiền điện (kWh), tiền nước (khối hoặc người), phí dịch vụ chung, phí gửi xe máy/ô tô.
  * **Chủ nhà:** Tên, SĐT, ghi chú riêng.
* **When:** Request được kiểm tra qua Zod schema hợp lệ.
* **Then:** Hệ thống lưu vào MongoDB Atlas với trạng thái mặc định `AVAILABLE`, trả về HTTP 201 Created.

### AC2: Upload nhiều hình ảnh và video lên Cloudinary
* **Given:** Quản lý tải lên tối đa 10 ảnh hoặc video ngắn qua form-data tại endpoint `POST /api/v1/apartments/upload-media`.
* **When:** Server nhận file qua Multer và tải trực tiếp lên Cloudinary folder `apartment_sale/apartments`.
* **Then:** 
  * Tự động nén ảnh, tối ưu hóa định dạng webp.
  * Trả về HTTP 200 kèm danh sách URL an toàn (`secure_url`) của Cloudinary để gắn vào căn hộ.

### AC3: Cập nhật thông tin căn hộ (Update)
* **Given:** Quản lý gửi request `PUT /api/v1/apartments/:id` để thay đổi giá, cập nhật tình trạng nội thất hoặc thêm ảnh mới.
* **When:** Hệ thống xác thực quyền (chỉ Manager sở hữu căn hộ hoặc Admin mới được sửa).
* **Then:** Cập nhật thành công vào MongoDB, trả về HTTP 200 kèm thông tin căn hộ mới nhất.

### AC4: Xóa hoặc ẩn căn hộ (Delete)
* **Given:** Quản lý gửi request `DELETE /api/v1/apartments/:id`.
* **When:** Kiểm tra quyền hạn của người thực hiện.
* **Then:** Xóa căn hộ khỏi cơ sở dữ liệu (hoặc chuyển trạng thái sang lưu trữ), trả về HTTP 200.

### AC5: Kiểm tra tính hợp lệ dữ liệu (Validation)
* **Given:** Người dùng gửi giá thuê <= 0, thiếu địa chỉ, hoặc SĐT chủ nhà sai định dạng.
* **When:** Gửi request thêm mới hoặc cập nhật.
* **Then:** Hệ thống chặn ở tầng validation, trả về HTTP 400 kèm danh sách lỗi chi tiết cho từng trường.

### AC6: Xem danh sách có phân trang và lọc cơ bản
* **Given:** Người dùng (Manager, CTV hoặc khách) gọi `GET /api/v1/apartments?page=1&limit=20&district=Cầu Giấy&minPrice=5000000&maxPrice=8000000`.
* **When:** Hệ thống truy vấn MongoDB Atlas.
* **Then:** Trả về HTTP 200 kèm danh sách căn hộ (đã tự động che SĐT chủ nếu là CTV theo Story 1.2), tổng số trang (`totalPages`), tổng số căn (`totalItems`).

---

## 4. Phạm vi Kỹ thuật (Technical Implementation Scope)

### A. Cấu trúc Schema `apartments` hoàn chỉnh:
```typescript
interface IApartment {
  title: string;
  description?: string;
  price: number;              // VNĐ/tháng (index)
  deposit: number;            // Tiền cọc (VNĐ hoặc số tháng)
  commission: {
    type: 'PERCENT' | 'FIXED';
    value: number;            // VD: 50% hoặc 3.000.000đ
  };
  location: {
    address: string;
    ward?: string;
    district: string;         // Index
    city: string;
    coordinates?: [number, number]; // [kinh độ, vĩ độ] index 2dsphere
  };
  attributes: {
    area?: number;            // m2
    bedrooms: number;
    livingRooms?: number;
    bathrooms: number;
    balcony: boolean;
    furnishing: 'FULL' | 'BASIC' | 'EMPTY';
    elevator: boolean;
    carParking: boolean;
    allowPets: boolean;
    washingMachine: 'PRIVATE' | 'SHARED' | 'NONE';
    pcccStandard: boolean;    // PCCC đạt chuẩn
  };
  fees: {
    electricity?: number;     // VNĐ/kWh
    water?: number;           // VNĐ/khối hoặc người
    service?: number;         // Phí dịch vụ chung/phòng
    parkingMotor?: number;    // Xe máy
  };
  images: string[];           // Mảng Cloudinary URLs
  videos?: string[];
  ownerContact: {
    name: string;
    phone: string;
    note?: string;
  };
  status: 'AVAILABLE' | 'UPCOMING' | 'DEPOSITED' | 'RENTED';
  availableDate?: Date;
  managerId: ObjectId;
}
```

### B. Backend Files cần triển khai:
1. `backend/src/config/cloudinary.ts`: Cấu hình Cloudinary SDK và helper upload stream buffer.
2. `backend/src/middlewares/upload.ts`: Middleware Multer xử lý memory storage (nhận file buffer, giới hạn 10MB/file).
3. `backend/src/modules/apartments/apartment.validation.ts`: Zod schema validate toàn bộ thông số chi tiết của căn hộ.
4. `backend/src/modules/apartments/apartment.service.ts`: Mở rộng thêm phân trang (`page`, `limit`), lọc khoảng giá, quận, và hàm upload media lên Cloudinary.
5. `backend/src/modules/apartments/apartment.controller.ts`: Các hàm `create`, `update`, `delete`, `getAll`, `getById`, `uploadMedia`.
6. `backend/src/modules/apartments/apartment.routes.ts`: Đăng ký các endpoints kèm middleware `requireRoles('ADMIN', 'MANAGER')`.

---

## 5. Danh sách Kiểm thử & Định nghĩa Hoàn thành (Definition of Done)
- [ ] Schema `apartments` trong MongoDB Atlas được cập nhật đầy đủ các trường đặc thù của Việt Nam.
- [ ] Test upload ảnh thực tế lên Cloudinary: Nhận được link ảnh `https://res.cloudinary.com/dhiifbnwf/...`.
- [ ] Tạo mới thành công 1 căn hộ có đầy đủ: Giá, hoa hồng, phí dịch vụ, tiện ích và mảng ảnh Cloudinary.
- [ ] Test phân trang (`page`, `limit`) và lọc theo quận/khoảng giá hoạt động trơn tru.
- [ ] Vẫn bảo toàn tính năng Data Masking từ Story 1.2: CTV xem không thấy SĐT thật của chủ nhà.
- [ ] Chạy `npm run build` (`tsc`) biên dịch 0 lỗi.
- [ ] Tuân thủ [WORKING_RULES.md](file:///d:/CODE/AppartmentSaleProject/WORKING_RULES.md): Không tự ý chạy lệnh git nếu chưa được phép.

