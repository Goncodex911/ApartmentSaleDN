# STORY 13.2: Quản Lý Thành Viên Toàn Diện & Phân Quyền Linh Hoạt (Full User Management)

**Bối cảnh:** `docs/stories/EPIC_13_ADMIN_CONTROL_CENTER_AND_GOVERNANCE.md` Story 13.2.  
Hiện tại hệ thống chỉ hỗ trợ xem danh sách `PENDING` (chờ duyệt) thông qua modal `PendingUsersModal`. Admin không có cách nào xem danh sách CTV hay Quản lý đang hoạt động, không thể tìm kiếm, không thể đổi role (thăng cấp CTV lên Quản lý) hoặc khóa tài khoản vi phạm. Story này xây dựng trang quản trị người dùng toàn diện cho Admin.

---

## 1. Mô tả Story (User Story)
* **Là một:** Admin hệ thống.
* **Tôi muốn:** Xem danh sách toàn bộ người dùng, tìm kiếm theo tên/SĐT/mã CTV, thay đổi vai trò (thăng cấp CTV lên Quản lý) và khóa tài khoản khi cần.
* **Để:** Chủ động quản trị nhân sự, trao quyền cho nhân viên tin cậy và ngăn chặn kịp thời các tài khoản có hành vi gian lận.

---

## 2. Tiền điều kiện (Pre-conditions)
* Đã có tài khoản Admin (`user.role === 'ADMIN'`).
* API hiện tại đã có `GET /api/v1/users?status=PENDING` và `PATCH /api/v1/users/:id/status`.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Danh Sách Người Dùng & Bộ Lọc
* **Given** Admin truy cập trang Quản lý thành viên `/admin/users`
* **When** trang hiển thị
* **Then** danh sách hiển thị đầy đủ thông tin: Họ tên, Số điện thoại (Zalo), Mã `ctvCode`, Vai trò (`ADMIN`, `MANAGER`, `COLLABORATOR`), Trạng thái (`ACTIVE`, `PENDING`, `BLOCKED`), Ngày tạo.
* **When** Admin chọn các tab lọc: `Tất cả` · `Chờ duyệt (Pending)` · `Quản lý` · `CTV` · `Bị khóa (Blocked)`
* **Then** danh sách lọc tương ứng chính xác.
* **When** Admin gõ vào ô tìm kiếm: Tên, SĐT hoặc mã CTV (tìm kiếm tức thời debounce 300ms)
* **Then** kết quả được lọc trực tiếp trên danh sách.

### AC2 — Thay Đổi Vai Trò Thành Viên (Role Assignment)
* **Given** Admin chọn một người dùng có role `COLLABORATOR`
* **When** Admin bấm `[Thăng cấp lên Quản lý]` và xác nhận
* **Then** hệ thống cập nhật role của người dùng thành `MANAGER`, cấp đầy đủ quyền xem số chủ nhà và duyệt tin đăng.
* **Given** Admin thao tác trên tài khoản Admin của chính mình hoặc tài khoản Admin duy nhất
* **Then** nút giáng cấp và nút khóa tài khoản bị vô hiệu hóa (disabled) để tránh tự tước quyền quản trị.

### AC3 — Khóa Tài Khoản Khẩn Cấp (Emergency Kill-Switch)
* **Given** một tài khoản có hành vi vi phạm hoặc gian lận
* **When** Admin bấm `[Khóa tài khoản]` (Trạng thái chuyển sang `BLOCKED`)
* **Then** trạng thái người dùng đổi sang `BLOCKED`, và phiên đăng nhập của người dùng đó bị vô hiệu hóa (từ chối mọi request API sau đó với mã HTTP 403 `Tài khoản đã bị khóa`).

### AC4 — Đặt Lại Mật Khẩu Tạm Thời (Reset Password Assistance)
* **Given** một CTV hoặc Quản lý quên mật khẩu và nhờ hỗ trợ
* **When** Admin bấm `[Reset mật khẩu]` trên dòng người dùng đó
* **Then** hệ thống tạo một mật khẩu tạm ngẫu nhiên (vd: `Room@2026!`), băm bcrypt lưu vào DB và hiển thị mật khẩu tạm đó trên modal để Admin sao chép gửi cho thành viên.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **Mở rộng API Users:**
  - `GET /api/v1/users`: Mở rộng query schema cho phép lọc theo `role`, `status`, `search` (tên, phone, ctvCode) kèm phân trang `page`, `limit`.
  - `PATCH /api/v1/users/:id/role`: Đổi vai trò (`role: 'MANAGER' | 'COLLABORATOR'`), yêu cầu quyền `ADMIN`. Chặn tự đổi role của chính mình.
  - `POST /api/v1/users/:id/reset-password`: Sinh mật khẩu ngẫu nhiên tạm thời, lưu hash và trả về chuỗi mật khẩu rõ cho Admin.

### Frontend:
* **Tạo trang:** `frontend/src/pages/AdminUsersPage.tsx`.
* **Component con:** Bảng người dùng `UserTable.tsx`, Modal xác nhận đổi role, Modal hiển thị mật khẩu tạm.
* **API Client:** Bổ sung các phương thức vào `userApi.ts` (`listAllUsers`, `updateUserRole`, `resetUserPassword`).

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Kiểm tra tìm kiếm và lọc tab hoạt động chính xác.
* [ ] Kiểm tra thăng cấp CTV $\rightarrow$ Manager và ngược lại.
* [ ] Kiểm tra tài khoản bị khóa (`BLOCKED`) không thể gọi API.
* [ ] Chặn Admin tự khóa tài khoản của chính mình.

---

## 6. Đối chiếu với code hiện tại (bổ sung khi tạo story, 19/11/2026)
* **Đã có:** `GET /users?status=` (chỉ ADMIN, lọc theo trạng thái), `PATCH /users/:id/status` (ACTIVE / BLOCKED), `PendingUsersModal`. Mở rộng các API này, không viết lại.
* **⚠️ Khoá tài khoản chưa có hiệu lực tức thì:** `authMiddleware` chỉ kiểm tra chữ ký JWT, không đọc DB.
  Người bị khoá vẫn gọi API được tới khi access token hết hạn (1 giờ), và có thể vẫn refresh được. Cần chọn 1 trong 2 cách:
  - **Cách A (đề xuất):** thêm `tokenVersion` vào User; khoá / đổi vai trò / reset mật khẩu thì tăng `tokenVersion`.
    `authMiddleware` so `tokenVersion` trong token với bản ghi đọc từ cache bộ nhớ 30 giây → bị chặn trong ≤ 30 giây, gần như không tốn thêm truy vấn DB.
    Đổi vai trò cũng cần cách này, vì vai trò đang nằm trong token.
  - **Cách B:** mỗi request đọc trạng thái user từ DB (chặn ngay lập tức nhưng thêm 1 truy vấn cho mọi API).
* **Refresh token:** `/auth/refresh` phải từ chối user `BLOCKED` hoặc `tokenVersion` cũ.
* **Mật khẩu tạm:** sinh bằng `crypto.randomInt` (12 ký tự). Chỉ trả về đúng 1 lần, không ghi vào log. Ghi AuditLog `RESET_PASSWORD` nếu Story 13.3 đã có.
* **An toàn:** chặn cả ở backend (không chỉ tắt nút): không tự hạ quyền / tự khoá mình, không khoá / hạ quyền ADMIN cuối cùng.
