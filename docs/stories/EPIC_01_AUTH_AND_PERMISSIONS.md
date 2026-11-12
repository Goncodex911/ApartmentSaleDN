# EPIC-01: Quản lý Người dùng & Phân quyền (Authentication & RBAC)

## Mục tiêu
Thiết lập hệ thống bảo mật, phân quyền nghiêm ngặt giữa **Quản trị viên (Admin)**, **Quản lý tòa nhà/nguồn hàng (Manager)** và **Cộng tác viên (CTV)**. Đảm bảo bảo vệ quyền lợi và bảo mật thông tin liên hệ của chủ nhà gốc.

---

### User Story 1.1: Đăng ký, Đăng nhập & Xác thực an toàn (JWT)
* **Là một:** Người dùng hệ thống (Admin / Manager / CTV).
* **Tôi muốn:** Đăng nhập bằng số điện thoại/email và mật khẩu an toàn.
* **Để:** Truy cập vào không gian làm việc phù hợp với vai trò của mình.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. Sử dụng JWT (Access Token ngắn hạn + Refresh Token an toàn trong HttpOnly Cookie).
  2. Mật khẩu được mã hóa an toàn bằng `bcryptjs` (salt rounds >= 10).
  3. Validate dữ liệu đầu vào (SĐT chuẩn Việt Nam, mật khẩu tối thiểu 6 ký tự).
  4. Trả về thông tin cơ bản: Tên, SĐT, Role, `ctvCode` định danh.

---

### User Story 1.2: Phân quyền dữ liệu & Ẩn thông tin nhạy cảm (Data Masking)
* **Là một:** Quản lý nguồn hàng.
* **Tôi muốn:** Ẩn số điện thoại chủ nhà và ghi chú mật đối với tài khoản CTV thông thường.
* **Để:** Tránh trường hợp CTV vượt mặt làm việc trực tiếp với chủ nhà làm mất hoa hồng của bên quản lý.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. API Căn hộ khi trả về cho CTV: Field `ownerContact.phone` bị ẩn (dạng `0912***678` hoặc bị loại bỏ hoàn toàn khỏi JSON response).
  2. Chỉ có Admin và Manager sở hữu căn hộ đó mới xem được số điện thoại và ghi chú chủ nhà đầy đủ.
  3. Middleware `RoleGuard` kiểm tra chặt chẽ trên Backend, không xử lý ẩn sơ sài ở Frontend.

---

### User Story 1.3: Cấp mã định danh CTV & Hồ sơ cá nhân (CTV Profile & Code)
* **Là một:** Cộng tác viên (CTV).
* **Tôi muốn:** Sở hữu một mã định danh duy nhất (Ví dụ: `CTV_HAI_01`) và thông tin liên hệ cá nhân (Tên, SĐT, link Zalo).
* **Để:** Hệ thống tự động gắn vào các bài đăng mẫu và link giới thiệu phòng khi tôi gửi cho khách.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. Mỗi CTV khi tạo tài khoản được tự động sinh một `ctvCode` duy nhất.
  2. CTV có trang cấu hình cá nhân: Cập nhật Tên hiển thị, Số điện thoại Zalo, Lời chào khách hàng mặc định.

