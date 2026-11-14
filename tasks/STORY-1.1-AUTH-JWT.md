# STORY-1.1: Đăng ký, Đăng nhập & Xác thực an toàn (JWT & User Model)

## 1. Mô tả Story (User Story)
* **Là một:** Người dùng hệ thống (Admin / Manager / CTV).
* **Tôi muốn:** Đăng ký tài khoản và đăng nhập bằng số điện thoại/email cùng mật khẩu an toàn.
* **Để:** Truy cập vào không gian làm việc phù hợp với vai trò của mình và nhận diện qua mã `ctvCode`.

---

## 2. Tiền điều kiện (Pre-conditions)
1. Cơ sở dữ liệu MongoDB Atlas đã được kết nối thông qua chuỗi cấu hình trong `.env` (`sale.jtnrk3b.mongodb.net`).
2. Khóa bí mật `JWT_SECRET` đã được khai báo trong `.env`.

---

## 3. Tiêu chí Chấp nhận (Acceptance Criteria - Gherkin)

### AC1: Đăng ký tài khoản mới thành công
* **Given:** Payload hợp lệ gồm: `name`, `phone` (chuẩn 10 số VN, ví dụ: `0912345678`), `password` (tối thiểu 6 ký tự), `role` (`MANAGER` hoặc `COLLABORATOR`).
* **When:** Gửi request `POST /api/v1/auth/register`.
* **Then:** 
  * Mật khẩu được mã hóa an toàn bằng `bcryptjs` (salt rounds >= 10).
  * Nếu role là `COLLABORATOR`, hệ thống tự sinh mã định danh `ctvCode` duy nhất (dạng `CTV` + 4 số ngẫu nhiên/tăng dần).
  * Trả về HTTP 201 kèm thông tin người dùng (không chứa trường `password`).

### AC2: Đăng nhập thành công & Cấp phát JWT kép (Access + Refresh Token)
* **Given:** Người dùng đã có tài khoản trong hệ thống và nhập đúng SĐT/mật khẩu.
* **When:** Gửi request `POST /api/v1/auth/login`.
* **Then:**
  * Hệ thống trả về HTTP 200.
  * Body trả về `accessToken` (thời hạn 15-60 phút) và thông tin cơ bản: `{ _id, name, phone, role, ctvCode }`.
  * `refreshToken` (thời hạn 7 ngày) được set an toàn vào `HttpOnly`, `SameSite` Cookie để chống XSS.

### AC3: Đăng nhập thất bại (Sai mật khẩu hoặc SĐT không tồn tại)
* **Given:** Người dùng nhập sai mật khẩu hoặc số điện thoại chưa từng đăng ký.
* **When:** Gửi request `POST /api/v1/auth/login`.
* **Then:** Hệ thống trả về HTTP 401 kèm message: `"Số điện thoại hoặc mật khẩu không chính xác"`.

### AC4: Kiểm tra tính hợp lệ của dữ liệu (Validation)
* **Given:** Người dùng gửi SĐT sai định dạng (chứa chữ cái, < 10 số) hoặc mật khẩu < 6 ký tự.
* **When:** Gửi request đăng ký hoặc đăng nhập.
* **Then:** Hệ thống chặn ngay ở tầng validation, trả về HTTP 400 kèm chi tiết lỗi của từng trường.

### AC5: Lấy thông tin người dùng hiện tại (Me Profile)
* **Given:** Request có đính kèm Bearer Access Token hợp lệ ở header `Authorization`.
* **When:** Gửi request `GET /api/v1/auth/me`.
* **Then:** Trả về HTTP 200 kèm thông tin chi tiết: `_id`, `name`, `phone`, `role`, `ctvCode`, `status`.

---

## 4. Phạm vi Kỹ thuật (Technical Implementation Scope)

### A. Database Model (`users` collection)
```typescript
interface IUser {
  _id: ObjectId;
  name: string;
  phone: string;        // Unique, Index, chuẩn 10 số VN
  email?: string;       // Sparse index
  password: string;     // Hash bcryptjs
  role: 'ADMIN' | 'MANAGER' | 'COLLABORATOR';
  ctvCode: string;      // Unique, Index (VD: CTV_1024)
  status: 'ACTIVE' | 'BLOCKED';
  createdAt: Date;
  updatedAt: Date;
}
```

### B. Backend Files cần triển khai:
* `backend/src/modules/users/user.model.ts` (Mongoose Schema & Types)
* `backend/src/modules/auth/auth.validation.ts` (Zod schema: phone regex `/(84|0[3|5|7|8|9])+([0-9]{8})\b/`, min password length = 6)
* `backend/src/modules/auth/auth.service.ts` (Bcrypt hash/compare, sinh ctvCode, sinh JWT tokens)
* `backend/src/modules/auth/auth.controller.ts` (Register, Login, Me, Logout)
* `backend/src/modules/auth/auth.routes.ts` (Khai báo route Express)
* `backend/src/middlewares/auth.middleware.ts` (Verify JWT token, gắn `req.user`)

---

## 5. Danh sách Kiểm thử & Định nghĩa Hoàn thành (Definition of Done)
- [ ] Schema `users` được tạo trên MongoDB Atlas với đầy đủ indexes (`phone`, `ctvCode`).
- [ ] Mật khẩu được mã hóa bằng `bcryptjs` với salt rounds >= 10.
- [ ] Không có trường hợp nào API trả về mật khẩu gốc hoặc password hash ra ngoài client.
- [ ] `refreshToken` được lưu trong HttpOnly Cookie.
- [ ] Test curl/script thành công cho cả 3 kịch bản: Đăng ký -> Đăng nhập -> Gọi `/me`.
- [ ] Mã nguồn tuân thủ [WORKING_RULES.md](file:///d:/CODE/AppartmentSaleProject/WORKING_RULES.md) (không tự ý commit git, không hardcode secret).

---

## 6. Cập nhật sau rà soát bảo mật (2026-11-15, đã được Project Owner duyệt)
* **Đăng ký vai trò `MANAGER` phải chờ ADMIN duyệt:** tài khoản tạo với `status: 'PENDING'`, **không** cấp token. API trả `201` kèm `pendingApproval: true`. Đăng nhập khi đang chờ duyệt → `403`.
  * Lý do: Quản lý xem được SĐT chủ nhà, nên nếu cho tự đăng ký MANAGER thì CTV có thể vượt qua Data Masking của Story 1.2.
* **ADMIN duyệt tài khoản:** `GET /api/v1/users?status=PENDING` và `PATCH /api/v1/users/:id/status` với `{ status: 'ACTIVE' | 'BLOCKED' }`. Chỉ ADMIN được gọi. Không đổi được trạng thái tài khoản ADMIN khác.
* **Tạo ADMIN đầu tiên:** đăng ký tài khoản bình thường, sau đó chạy `npm run promote-admin -- <SĐT>` trong thư mục `backend`.
* **Refresh token:** dùng qua `POST /api/v1/auth/refresh` (cookie HttpOnly). Token mang `type: 'refresh'` nên không dùng thay access token được. Frontend tự refresh khi gặp lỗi 401.
