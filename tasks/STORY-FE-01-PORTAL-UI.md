# STORY-FE-01: Giao diện Web App Bảng hàng Căn hộ cho Quản lý & CTV (React.js Frontend - Epic 1 & 2)

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý tòa nhà (Manager) hoặc Cộng tác viên môi giới (CTV).
* **Tôi muốn:** Một ứng dụng Web (giao diện hiện đại, tối ưu cho cả điện thoại di động và máy tính) để đăng nhập, tìm kiếm căn hộ trên bảng hàng, đổi nhanh trạng thái phòng, tải ảnh lên Cloudinary và xem thông tin phù hợp với phân quyền của mình.
* **Để:** Thao tác nhanh chóng trong lúc tư vấn khách hoặc đi khảo sát phòng thực tế, loại bỏ hoàn toàn việc dùng sổ sách hay bảng Excel thủ công.

---

## 2. Tiền điều kiện (Pre-conditions)
1. Backend Node.js chạy tại cổng `http://localhost:5000` với đầy đủ API của **Epic 1** (Auth, RBAC, Profile) và **Epic 2** (Apartment CRUD, Cloudinary Upload, Status 1-click, Master-Sub).
2. Chuẩn bị khởi tạo thư mục `frontend/` bằng **Vite + React (TypeScript) + TailwindCSS + Lucide Icons**.

---

## 3. Tiêu chí Chấp nhận (Acceptance Criteria - Gherkin)

### AC1: Màn hình Đăng nhập & Đăng ký trực quan (Mobile-First)
* **Given:** Người dùng truy cập trang chủ mà chưa đăng nhập.
* **When:** Hệ thống hiển thị form Đăng nhập / Đăng ký hiện đại.
* **Then:** 
  * Hỗ trợ đăng nhập bằng Số điện thoại và Mật khẩu.
  * Hỗ trợ đăng ký tài khoản mới: chọn vai trò `Quản lý` hoặc `Cộng tác viên (CTV)`.
  * Sau khi đăng nhập thành công, lưu `accessToken` và tự động chuyển hướng vào Bảng hàng căn hộ.

### AC2: Bảng hàng Căn hộ dạng Thẻ (Apartment Card Grid)
* **Given:** Người dùng đã đăng nhập và truy cập trang Bảng hàng (`/apartments`).
* **When:** Danh sách căn hộ được tải từ API `GET /api/v1/apartments`.
* **Then:**
  * Hiển thị dạng lưới thẻ (Cards) responsive (1 cột trên mobile, 2-3 cột trên tablet/desktop).
  * Mỗi thẻ hiển thị:
    * Ảnh đại diện chất lượng cao từ Cloudinary (có nhãn số lượng ảnh).
    * Tiêu đề, Mức giá thuê (format chuẩn VNĐ: `6.500.000 đ/tháng`), Tiền cọc.
    * Huy hiệu trạng thái phòng nổi bật: `Trống ở ngay` (Xanh lá), `Sắp trống` (Xanh dương), `Đã cọc` (Vàng), `Đã thuê` (Đỏ/Xám).
    * Mức hoa hồng CTV (Ví dụ: `Hoa hồng: 50%`).
    * Các tiện ích vắn tắt dạng tag icon: `Thang máy`, `Nuôi Pet`, `Ô tô`, `PCCC`.
    * Địa chỉ rút gọn (Quận, Tên đường).

### AC3: Thao tác 1-Click Đổi nhanh Trạng thái phòng (Dành cho Quản lý)
* **Given:** Quản lý đang xem danh sách các căn hộ do mình quản lý.
* **When:** Quản lý bấm trực tiếp vào huy hiệu trạng thái của căn hộ.
* **Then:** 
  * Hiện popup menu nhanh: `[Trống ở ngay]` `[Sắp trống]` `[Đang giữ cọc]` `[Đã cho thuê]`.
  * Khi chọn `Sắp trống`, hiển thị ô chọn ngày chuyển đi `availableDate`.
  * Cập nhật tức thì qua API `PATCH /api/v1/apartments/:id/status` mà không cần tải lại toàn bộ trang.

### AC4: Modal Tạo Mới & Chỉnh Sửa Căn Hộ (Kéo-Thả Ảnh Cloudinary)
* **Given:** Quản lý bấm nút `+ Thêm căn hộ mới`.
* **When:** Form nhập liệu hiện ra.
* **Then:**
  * Điền đầy đủ thông số: Tiêu đề, Giá, Cọc, Địa chỉ, Thuộc tính phòng, Phí dịch vụ (Điện, Nước, Xe).
  * Khu vực tải ảnh: Cho phép kéo-thả hoặc chọn nhiều ảnh cùng lúc, gọi API `POST /api/v1/apartments/upload-media` đẩy thẳng lên Cloudinary và hiển thị ảnh xem trước (preview thumbnail) ngay lập tức.
  * Bấm `Lưu căn hộ` $\rightarrow$ Căn hộ mới xuất hiện ngay trên đầu bảng hàng.

### AC5: Phân quyền Hiển thị & Bảo vệ Số điện thoại Chủ nhà
* **Given:** CTV đăng nhập vào hệ thống.
* **When:** Mở xem chi tiết căn hộ.
* **Then:**
  * Số điện thoại chủ nhà hiển thị dạng đã che: `0912***678` (không có nút gọi cho chủ nhà).
  * Không hiển thị nút `Sửa` hay `Xóa` căn hộ của quản lý.
* **Given:** Quản lý đăng nhập vào hệ thống.
* **When:** Mở xem chi tiết căn hộ.
* **Then:** Hiển thị trọn vẹn số điện thoại thật của chủ nhà, ghi chú mật, và các nút `Sửa`, `Xóa`.

### AC6: Thanh Header & Hồ sơ CTV (Profile Bar)
* **Given:** CTV đang sử dụng Web App.
* **When:** Nhìn vào góc phải thanh điều hướng (Header).
* **Then:**
  * Hiển thị Tên CTV kèm Huy hiệu mã định danh: `Mã CTV: CTV1801`.
  * Nút bấm mở Drawer Hồ sơ cá nhân: Xem/sửa hotline Zalo, Lời chào mặc định.
  * Nút Đăng xuất an toàn.

---

## 4. Phạm vi Kỹ thuật (Technical Implementation Scope)

### A. Công nghệ Sử dụng:
* **Core:** React 18+ (Vite) + TypeScript.
* **Styling:** TailwindCSS (chuẩn Mobile-first, màu sắc bất động sản hiện đại: Indigo / Emerald / Amber / Rose).
* **Icons:** `lucide-react` (siêu nhẹ, không bloat).
* **HTTP Client:** `fetch` native hoặc `axios` gọn gàng, có interceptor tự động gắn `Authorization: Bearer <token>`.

### B. Cấu trúc Thư mục Frontend (`frontend/src/`):
```plaintext
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts             # Axios/Fetch wrapper kèm Bearer Token
│   │   ├── authApi.ts            # API Đăng ký, đăng nhập, /me
│   │   ├── apartmentApi.ts       # API Bảng hàng, CRUD, 1-Click Status, Upload Media
│   │   └── userApi.ts            # API Hồ sơ cá nhân CTV
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx        # Header hiển thị ctvCode, Tên user, Nút Logout
│   │   │   └── ProtectedRoute.tsx # Chặn truy cập nếu chưa đăng nhập
│   │   ├── apartment/
│   │   │   ├── ApartmentCard.tsx # Thẻ hiển thị căn hộ (Badges, ảnh Cloudinary)
│   │   │   ├── StatusBadge.tsx   # Huy hiệu 1-Click đổi trạng thái
│   │   │   ├── ApartmentModal.tsx # Form thêm/sửa căn hộ + Upload ảnh Cloudinary
│   │   │   └── ApartmentDetailModal.tsx # Xem chi tiết (che SĐT nếu là CTV)
│   │   └── profile/
│   │       └── ProfileModal.tsx  # Drawer/Modal quản lý hồ sơ cá nhân CTV
│   ├── pages/
│   │   ├── LoginPage.tsx         # Trang đăng nhập / đăng ký
│   │   └── ApartmentsPage.tsx    # Trang bảng hàng căn hộ chính
│   ├── App.tsx                   # React Router cấu hình chuyển trang
│   ├── main.tsx
│   └── index.css                 # Tailwind directives
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 5. Danh sách Kiểm thử & Định nghĩa Hoàn thành (Definition of Done)
- [ ] Chạy `npm run dev` trên `frontend/` cổng `5173`, kết nối thông suốt với Backend cổng `5000`.
- [ ] Màn hình Đăng nhập / Đăng ký hoạt động mượt mà, lưu token an toàn.
- [ ] Bảng hàng căn hộ hiển thị đẹp mắt, ảnh Cloudinary tải sắc nét trên cả điện thoại và máy tính.
- [ ] Nút 1-Click đổi trạng thái hoạt động ngay trên giao diện (chuyển màu xanh/vàng/đỏ tức thì).
- [ ] Form thêm căn hộ: Upload ảnh trực tiếp lên Cloudinary thành công.
- [ ] Phân quyền chuẩn xác: CTV thấy SĐT chủ bị che `0912***678`, Quản lý thấy đầy đủ.
- [ ] Tuân thủ [WORKING_RULES.md](file:///d:/CODE/AppartmentSaleProject/WORKING_RULES.md): Không tự ý chạy lệnh git nếu chưa được phép.

