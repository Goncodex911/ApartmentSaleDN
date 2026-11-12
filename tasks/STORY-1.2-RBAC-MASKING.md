# STORY-1.2: Phân quyền Dữ liệu & Ẩn Thông tin Nhạy cảm (RBAC & Data Masking)

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý nguồn hàng (Manager) hoặc Quản trị viên (Admin).
* **Tôi muốn:** Số điện thoại và ghi chú mật của chủ nhà được tự động ẩn hoặc che bớt khi dữ liệu căn hộ được gửi về cho Cộng tác viên (CTV).
* **Để:** Tránh trường hợp CTV vượt mặt liên hệ thẳng với chủ nhà, đảm bảo quyền lợi hoa hồng và giữ vững tính bảo mật của nguồn hàng.

---

## 2. Tiền điều kiện (Pre-conditions)
1. **[STORY-1.1](file:///d:/CODE/AppartmentSaleProject/tasks/STORY-1.1-AUTH-JWT.md)** đã hoàn thành: Hệ thống đã có JWT Authentication, nhận diện được `req.user.role` (`'ADMIN' | 'MANAGER' | 'COLLABORATOR'`).
2. Schema căn hộ cơ bản có trường thông tin chủ nhà `ownerContact: { name: string, phone: string, note?: string }`.

---

## 3. Tiêu chí Chấp nhận (Acceptance Criteria - Gherkin)

### AC1: Phân quyền truy cập route bằng Middleware `roleGuard`
* **Given:** Người dùng đăng nhập với vai trò `COLLABORATOR`.
* **When:** Cố tình gọi các API chỉ dành cho Quản lý (ví dụ: `POST /api/v1/apartments`, `DELETE /api/v1/apartments/:id`).
* **Then:** Hệ thống chặn ngay ở tầng Middleware, trả về HTTP 403 Forbidden kèm message: `"Bạn không có quyền thực hiện hành động này"`.

### AC2: CTV xem danh sách hoặc chi tiết căn hộ (Ẩn SĐT chủ nhà)
* **Given:** Người dùng gửi request có token với vai trò `COLLABORATOR` (hoặc khách vãng lai không có token).
* **When:** Gọi API `GET /api/v1/apartments` hoặc `GET /api/v1/apartments/:id`.
* **Then:** 
  * Trường `ownerContact.phone` bị che định dạng `0912***678` (hoặc loại bỏ hoàn toàn khỏi JSON response).
  * Trường `ownerContact.note` (ghi chú mật) bị loại bỏ hoàn toàn khỏi JSON response.
  * Các thông tin về phòng (giá, diện tích, ảnh, tiện ích, hoa hồng CTV) vẫn hiển thị đầy đủ.

### AC3: Manager hoặc Admin xem căn hộ (Hiển thị đầy đủ)
* **Given:** Người dùng đăng nhập với vai trò `MANAGER` hoặc `ADMIN`.
* **When:** Gọi API `GET /api/v1/apartments` hoặc `GET /api/v1/apartments/:id`.
* **Then:** Dữ liệu trả về hiển thị nguyên vẹn 100% số điện thoại thật của chủ nhà và ghi chú mật để quản lý làm việc.

### AC4: Bảo mật tuyệt đối tại Backend (Zero Leakage)
* **Given:** Bất kỳ ai mở công cụ DevTools (Network Tab) trên trình duyệt.
* **Then:** JSON response trả về từ máy chủ cho CTV tuyệt đối **không chứa** số điện thoại đầy đủ của chủ nhà (không được xử lý che tạm bợ bằng CSS hoặc filter phía Frontend).

---

## 4. Phạm vi Kỹ thuật (Technical Implementation Scope)

### A. Backend Files cần tạo/sửa:
1. `backend/src/middlewares/rbac.ts`:
   * Middleware `requireRoles(...allowedRoles: string[])`: Kiểm tra `req.user.role`, nếu không khớp trả về 403.
2. `backend/src/modules/apartments/apartment.model.ts`:
   * Định nghĩa trường `ownerContact`:
     ```typescript
     ownerContact: {
       name: { type: String, required: true },
       phone: { type: String, required: true },
       note: { type: String }, // Ghi chú riêng của chủ nhà
     }
     ```
3. `backend/src/modules/apartments/apartment.service.ts`:
   * Hàm transformer / serializer: `maskApartmentForRole(apartment, userRole)`:
     ```typescript
     // Nếu userRole !== 'ADMIN' && userRole !== 'MANAGER':
     // Che phone: 0912345678 -> 0912***678, xóa note
     ```
4. `backend/src/modules/apartments/apartment.controller.ts`:
   * Áp dụng transformer trước khi `res.json()`.
5. `backend/src/modules/apartments/apartment.routes.ts`:
   * Gắn `authMiddleware` và `requireRoles` vào các route tạo/sửa/xóa.

---

## 5. Danh sách Kiểm thử & Định nghĩa Hoàn thành (Definition of Done)
- [ ] Middleware `requireRoles` hoạt động chính xác: chặn CTV vào route quản trị với HTTP 403.
- [ ] Kiểm thử tự động (Unit/Integration Test):
  - Test 1: User CTV gọi chi tiết căn hộ $\rightarrow$ Response có `ownerContact.phone` dạng `0912***678` và không có `ownerContact.note`.
  - Test 2: User Manager gọi cùng căn hộ đó $\rightarrow$ Response hiển thị đầy đủ `0912345678` và `ownerContact.note`.
- [ ] TypeScript build check (`npm run build`) hoàn tất 0 lỗi.
- [ ] Tuân thủ [WORKING_RULES.md](file:///d:/CODE/AppartmentSaleProject/WORKING_RULES.md): Không tự ý chạy lệnh git nếu chưa được phép.

