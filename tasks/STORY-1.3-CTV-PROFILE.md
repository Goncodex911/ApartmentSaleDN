# STORY-1.3: Cấp mã định danh CTV & Hồ sơ cá nhân (CTV Profile & Code)

## 1. Mô tả Story (User Story)
* **Là một:** Cộng tác viên (CTV).
* **Tôi muốn:** Sở hữu một mã định danh duy nhất (Ví dụ: `CTV_HAI_01` hoặc `CTV1801`) cùng trang quản lý hồ sơ cá nhân (Tên hiển thị, SĐT Zalo, Lời chào khách mặc định, Ảnh đại diện).
* **Để:** Hệ thống tự động gắn thương hiệu cá nhân của tôi vào các bài đăng mẫu và link giới thiệu phòng khi tôi gửi cho khách hàng, giúp khách liên hệ trực tiếp cho tôi.

---

## 2. Tiền điều kiện (Pre-conditions)
1. **[STORY-1.1](file:///d:/CODE/AppartmentSaleProject/tasks/STORY-1.1-AUTH-JWT.md)** đã hoàn tất: CTV đã có tài khoản và `ctvCode` mặc định khi đăng ký.
2. Token xác thực JWT được gửi qua header `Authorization: Bearer <token>`.

---

## 3. Tiêu chí Chấp nhận (Acceptance Criteria - Gherkin)

### AC1: Xem hồ sơ cá nhân của CTV
* **Given:** CTV đã đăng nhập và gửi request `GET /api/v1/users/profile`.
* **When:** Server xử lý xác thực qua `authMiddleware`.
* **Then:** Trả về HTTP 200 kèm thông tin chi tiết:
  * `_id`, `name`, `phone`, `role`, `ctvCode`.
  * `zaloPhone` (SĐT kết nối Zalo).
  * `zaloLink` (link zalo.me rút gọn).
  * `avatarUrl` (ảnh đại diện).
  * `greetingMessage` (lời chào mở đầu khi gửi tin cho khách).

### AC2: Cập nhật thông tin hồ sơ cá nhân
* **Given:** CTV gửi payload cập nhật `PUT /api/v1/users/profile` chứa:
  * `name`: Tên hiển thị mới.
  * `zaloPhone`: Số điện thoại Zalo (chuẩn 10 số VN).
  * `avatarUrl`: Link ảnh đại diện.
  * `greetingMessage`: Lời chào mặc định (VD: *"Em Hải chuyên căn hộ dịch vụ Cầu Giấy xin chào anh/chị!"*).
* **When:** Hệ thống kiểm tra dữ liệu hợp lệ qua Zod schema.
* **Then:** 
  * Cập nhật thành công vào MongoDB.
  * Tự động sinh `zaloLink` dạng `https://zalo.me/<zaloPhone>`.
  * Trả về HTTP 200 kèm profile mới.

### AC3: Lấy thông tin công khai của CTV qua mã `ctvCode` (Public Endpoint)
* **Given:** Khách hàng mở link xem phòng có gắn mã giới thiệu (ví dụ: `?ref=CTV1801`).
* **When:** Frontend gọi API công khai `GET /api/v1/users/ctv/:ctvCode` (không cần đăng nhập).
* **Then:**
  * Trả về HTTP 200 chứa các thông tin công khai của CTV: `name`, `ctvCode`, `zaloPhone`, `zaloLink`, `avatarUrl`, `greetingMessage`.
  * Tuyệt đối **không trả về** các trường nhạy cảm: `password`, `email`, `role`, `status`, `createdAt`.
  * Nếu mã `ctvCode` không tồn tại, trả về HTTP 404 với thông báo rõ ràng.

---

## 4. Phạm vi Kỹ thuật (Technical Implementation Scope)

### A. Mở rộng Model `User` (`backend/src/modules/auth/user.model.ts` hoặc `user.model.ts`):
```typescript
interface IUser {
  // ... các trường cũ từ Story 1.1 ...
  zaloPhone?: string;        // SĐT Zalo của CTV
  zaloLink?: string;         // https://zalo.me/<zaloPhone>
  avatarUrl?: string;        // Link ảnh đại diện
  greetingMessage?: string;  // Lời chào gửi khách mặc định
}
```

### B. Backend Files cần tạo/cập nhật:
1. `backend/src/modules/users/user.validation.ts`:
   * `updateProfileSchema`: Validate tên, `zaloPhone` regex chuẩn VN, `greetingMessage` tối đa 300 ký tự.
2. `backend/src/modules/users/user.service.ts`:
   * `getProfile(userId)`
   * `updateProfile(userId, data)`
   * `getPublicCtvByCode(ctvCode)`
3. `backend/src/modules/users/user.controller.ts`:
   * Các hàm điều hướng tương ứng.
4. `backend/src/modules/users/user.routes.ts`:
   * `GET /profile` (Private - `authMiddleware`)
   * `PUT /profile` (Private - `authMiddleware`)
   * `GET /ctv/:ctvCode` (Public - không cần token)
5. `backend/src/app.ts`:
   * Đăng ký route `/api/v1/users`.

---

## 5. Danh sách Kiểm thử & Định nghĩa Hoàn thành (Definition of Done)
- [ ] Schema `User` được mở rộng với các trường `zaloPhone`, `zaloLink`, `avatarUrl`, `greetingMessage`.
- [ ] API `PUT /api/v1/users/profile` cập nhật dữ liệu thành công và validate dữ liệu chặt chẽ qua Zod.
- [ ] API public `GET /api/v1/users/ctv/:ctvCode` hoạt động mà không cần token, chỉ trả về thông tin phục vụ gửi khách, không lộ thông tin bảo mật.
- [ ] Chạy kiểm thử tự động (Integration Test) kiểm tra cả 3 kịch bản thành công.
- [ ] TypeScript build check (`npm run build`) hoàn tất 0 lỗi.
- [ ] Tuân thủ [WORKING_RULES.md](file:///d:/CODE/AppartmentSaleProject/WORKING_RULES.md): Không tự ý chạy lệnh git nếu chưa được phép.

