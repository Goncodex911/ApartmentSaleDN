# STORY 13.3: Nhật Ký Truy Vết & Chống Rò Rỉ Số Chủ Nhà (Audit Log & Security Oversight)

**Bối cảnh:** `docs/stories/EPIC_13_ADMIN_CONTROL_CENTER_AND_GOVERNANCE.md` Story 13.3.  
Tài sản giá trị nhất của sàn môi giới cho thuê là thông tin liên lạc của chủ nhà. Hiện tại khi Manager mở xem số điện thoại chủ nhà hoặc sửa/xóa căn hộ, hệ thống không ghi vết. Nếu xảy ra hiện tượng "cắt cầu" hoặc tuồn dữ liệu, Admin không có bằng chứng đối soát. Story này xây dựng hệ thống Audit Log tự động ghi nhận mọi lượt truy cập dữ liệu nhạy cảm.

---

## 1. Mô tả Story (User Story)
* **Là một:** Admin và Chủ doanh nghiệp môi giới.
* **Tôi muốn:** Hệ thống tự động ghi lại nhật ký mỗi khi có ai đó bấm xem số điện thoại chủ nhà hoặc thực hiện các thao tác sửa/xóa/đổi giá căn hộ.
* **Để:** Bảo vệ tài sản thông tin cốt lõi của công ty (nguồn hàng chủ nhà), phát hiện kịp thời tình trạng tuồn dữ liệu và có bằng chứng rõ ràng khi xảy ra tranh chấp.

---

## 2. Tiền điều kiện (Pre-conditions)
* Đã có MongoDB collection sẵn sàng để lưu trữ `AuditLog`.
* Hoạt động ngầm tự động, không làm chậm tốc độ phản hồi của các API xem chi tiết căn hộ.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Ghi Nhận Tự Động Khi Mở Số Chủ Nhà
* **Given** người dùng có quyền (Manager hoặc Admin) gọi API `GET /api/v1/apartments/:id` và nhận được thông tin `ownerContact.phone` unmasked
* **When** request được xử lý thành công
* **Then** hệ thống tự động tạo một bản ghi `AuditLog` trong background với các thông tin:
  - `userId`: ID người thực hiện.
  - `userName`: Tên người thực hiện.
  - `userRole`: `MANAGER` hoặc `ADMIN`.
  - `action`: `UNMASK_OWNER_CONTACT`.
  - `targetType`: `APARTMENT`.
  - `targetId`: ID căn hộ.
  - `targetTitle`: Tiêu đề căn hộ.
  - `ipAddress`: Địa chỉ IP của client (xử lý proxy headers `x-forwarded-for`).
  - `timestamp`: Thời gian chính xác.

### AC2 — Ghi Nhận Các Thao Tác Trọng Yếu Khác
* **Given** Quản lý hoặc Admin thực hiện các thao tác:
  - Đổi trạng thái căn sang `DEPOSITED` / `RENTED` / `AVAILABLE`.
  - Cập nhật giá thuê hoặc xóa căn hộ khỏi bảng hàng.
  - Duyệt hoặc từ chối tin đăng CTV.
* **Then** hệ thống tự động ghi log với `action` tương ứng (`CHANGE_STATUS`, `UPDATE_PRICE`, `DELETE_APARTMENT`, `APPROVE_SUBMISSION`, `REJECT_SUBMISSION`).

### AC3 — Giao Diện Tra Cứu Nhật Ký (`/admin/audit-logs`)
* **Given** Admin truy cập trang Nhật ký truy vết `/admin/audit-logs`
* **When** trang tải xong
* **Then** hiển thị danh sách nhật ký theo thứ tự thời gian mới nhất trước:
  - Thời gian (format `DD/MM/YYYY HH:mm:ss`).
  - Người thực hiện (kèm badge role).
  - Hành động (Badge màu phân biệt: Xem số chủ nhà, Đổi trạng thái, Xóa căn...).
  - Đối tượng tác động (Tiêu đề căn hộ, kèm link xem nhanh).
  - Địa chỉ IP & Thiết bị.
* **When** Admin chọn bộ lọc hành động hoặc tìm kiếm theo tên người thực hiện / tên căn hộ
* **Then** danh sách lọc tức thời chính xác.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **Mongoose Model mới:** `backend/src/modules/audit/audit-log.model.ts`
  - Các trường: `userId`, `userName`, `userRole`, `action`, `targetType`, `targetId`, `targetTitle`, `details` (Object), `ipAddress`, `createdAt`.
  - Index: `{ createdAt: -1 }`, `{ targetId: 1 }`, `{ userId: 1 }`.
* **Audit Service:** `backend/src/modules/audit/audit.service.ts` với hàm `logAction(...)` chạy non-blocking.
* **Tích hợp middleware / controller:**
  - Gắn vào `apartment.controller.ts` (khi trả về unmasked phone).
  - Gắn vào `updateStatus`, `deleteApartment`, `approveSubmission`.
* **API Tra cứu cho Admin:** `GET /api/v1/admin/audit-logs` (phân trang, lọc theo `action`, `userId`, `search`).

### Frontend:
* **Tạo trang mới:** `frontend/src/pages/AdminAuditLogsPage.tsx`.
* **Component con:** `AuditLogTable.tsx`, bộ lọc hành động, icon phân loại thao tác.
* **API Client:** Thêm phương thức `listAuditLogs` trong `adminApi.ts`.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Kiểm tra: Khi Manager bấm xem chi tiết căn hộ, log xem SĐT được lưu ngay vào DB.
* [ ] Kiểm tra: Khi xóa căn hoặc đổi trạng thái, log được ghi nhận đầy đủ.
* [ ] Giao diện lọc log theo người dùng và hành động hoạt động trơn tru.
* [ ] Logging chạy ngầm, không gây tăng độ trễ (latency) của API chính.

---

## 6. Đối chiếu với code hiện tại (bổ sung khi tạo story, 19/11/2026)
* **⚠️ Chỉ ghi log ở `GET /apartments/:id` thì bị lách:** `maskApartment` đang trả SĐT chủ nhà **đầy đủ** cho Quản lý / ADMIN ở **mọi** API danh sách / tìm kiếm / bản đồ.
  Ai mở Bảng hàng là đã nhận đủ SĐT của 12–50 căn mà không có log nào. Cần chọn:
  - **Cách A (đề xuất):** che SĐT ở mọi danh sách cho cả Quản lý. Chi tiết căn có nút **"Hiện SĐT chủ nhà"** gọi `POST /apartments/:id/owner-contact` → trả SĐT + ghi `UNMASK_OWNER_CONTACT`.
    Log đúng người, đúng lúc thật sự xem. Đổi thói quen: Quản lý bấm thêm 1 lần mỗi căn.
  - **Cách B:** giữ như cũ và ghi log mỗi lần mở chi tiết. Không đổi thói quen nhưng log không phản ánh đúng ai đã có SĐT.
* **Các chỗ khác cũng trả SĐT chủ nhà:** lộ trình (11.3), so sánh (11.6), tin CTV, chi tiết căn, `subListings[].ownerContact`. Cách A phải áp dụng đồng bộ cho các chỗ này.
* **Dung lượng:** đặt TTL cho `audit_logs` (đề xuất 180 ngày) để không đầy Atlas gói free (512MB).
* **IP:** dùng `req.ip`. `TRUST_PROXY` đã cấu hình ở Render nên `req.ip` là IP thật; không đọc `x-forwarded-for` thủ công vì giả mạo được.
