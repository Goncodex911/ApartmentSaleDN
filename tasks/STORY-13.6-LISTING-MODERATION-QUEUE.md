# STORY 13.6: Trung Tâm Xử Lý Báo Cáo Vi Phạm & Làm Sạch Bảng Hàng (Listing Moderation)

**Bối cảnh:** `docs/stories/EPIC_13_ADMIN_CONTROL_CENTER_AND_GOVERNANCE.md` Story 13.6 kết hợp cùng `Story 11.4b` (Cộng đồng CTV báo lỗi căn).  
Khi CTV đi dẫn khách hoặc liên hệ chủ nhà phát hiện căn đã cho thuê, chủ tăng giá hoặc số điện thoại bị sai, CTV gửi báo lỗi. Story này xây dựng trung tâm kiểm duyệt tập trung cho Admin/Manager xử lý nhanh các tin báo lỗi để làm sạch kho bảng hàng.

---

## 1. Mô tả Story (User Story)
* **Là một:** Admin quản lý chất lượng kho dữ liệu.
* **Tôi muốn:** Nhận danh sách các căn hộ bị cộng đồng CTV báo lỗi ("Đã cho thuê", "Chủ tăng giá", "Số điện thoại sai") và xử lý nhanh trong 1 chạm.
* **Để:** Giữ cho kho dữ liệu luôn sạch, chính xác và đáng tin cậy 100%, không để tin ảo tồn tại trên bảng hàng.

---

## 2. Tiền điều kiện (Pre-conditions)
* Đã có bảng ghi nhận báo lỗi từ CTV (`ListingFlag` hoặc `flags` array trong `Apartment`).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Hàng Đợi Báo Lỗi Tập Trung (`/admin/moderation`)
* **Given** Admin truy cập trang Kiểm duyệt kho tin `/admin/moderation`
* **When** trang hiển thị
* **Then** hệ thống liệt kê các căn hộ đang nhận báo lỗi:
  - Tên căn hộ, hình ảnh thu nhỏ, giá hiện tại.
  - Số lượng CTV đã gửi báo lỗi (ví dụ: `⚠️ 3 CTV cùng báo`).
  - Phân loại lý do:
    - `Đã cho thuê / Hết phòng`
    - `Chủ tăng giá` (kèm giá mới do CTV ghi chú)
    - `Không liên lạc được chủ nhà / SĐT sai`
    - `Ảnh không đúng thực tế`.
  - Danh sách chi tiết các CTV đã báo lỗi kèm mốc thời gian.

### AC2 — Thao Tác Xử Lý Nhanh 1-Chạm
* **Given** Admin xem một căn bị báo "Đã cho thuê"
* **When** Admin bấm nút `[Đánh dấu Đã Thuê (RENTED)]`
* **Then** căn hộ lập tức chuyển sang trạng thái `RENTED`, biến mất khỏi danh sách phòng trống trên bảng hàng, đồng thời kích hoạt bộ đếm hạn hợp đồng.
* **Given** một căn bị báo "Chủ tăng giá lên 10 triệu"
* **When** Admin bấm `[Cập nhật Giá]` và nhập số tiền mới
* **Then** giá căn hộ được cập nhật ngay, đồng thời gỡ cờ cảnh báo `[Cần xác minh]`.
* **Given** thông tin căn hộ vẫn đúng (báo lỗi nhầm)
* **When** Admin bấm `[Bỏ qua Báo lỗi]`
* **Then** cờ cảnh báo được gỡ bỏ và căn hộ tiếp tục hiển thị bình thường.

### AC3 — Ghi Nhận Điểm Tín Nhiệm (Trust Score)
* **Given** Admin xác nhận báo lỗi của CTV là đúng
* **Then** CTV báo lỗi được cộng `+5 điểm tín nhiệm`.
* **Given** một tài khoản CTV liên tục gửi báo lỗi sai sự thật
* **Then** Admin có thể gắn cờ hạn chế quyền báo lỗi của CTV đó.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **Mongoose Model:** `backend/src/modules/apartments/listing-flag.model.ts`
  - Trường: `apartmentId`, `reporterId`, `reason`, `note`, `status: 'PENDING' | 'RESOLVED' | 'DISMISSED'`, `createdAt`.
* **API Endpoints:**
  - `GET /api/v1/admin/moderation`: Lấy danh sách các căn có báo lỗi chờ duyệt.
  - `POST /api/v1/admin/moderation/:apartmentId/resolve`: Xử lý báo lỗi (hành động: `MARK_RENTED`, `UPDATE_PRICE`, `DISMISS`).

### Frontend:
* **Tạo trang mới:** `frontend/src/pages/AdminModerationPage.tsx`.
* **Component con:** Hàng đợi thẻ căn bị báo lỗi `ModerationCard.tsx`, Modal cập nhật giá nhanh.
* **API Client:** Bổ sung phương thức `listModerationItems`, `resolveModeration` trong `adminApi.ts`.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Kiểm tra: Căn bị báo lỗi xuất hiện tức thì trong hàng đợi kiểm duyệt của Admin.
* [ ] Thao tác chuyển `RENTED` 1-chạm hoạt động mượt mà, căn hộ được ẩn khỏi danh sách `AVAILABLE`.
* [ ] Thao tác bỏ qua gỡ cờ cảnh báo thành công.

---

## 6. Đối chiếu với code hiện tại (bổ sung khi tạo story, 19/11/2026)
* **⚠️ Phụ thuộc Story 11.4b (CTV báo lỗi tin) — chưa làm:** chưa có nút Báo lỗi, model báo lỗi, cờ "Chờ xác minh".
  `listing-flag.model.ts` trong story này chính là `ListingReport` của 11.4b. **Đề xuất gộp 11.4b vào 13.6** (làm 1 lần: CTV báo lỗi + hàng đợi xử lý của Admin) để không có 2 model trùng nhau.
* **"Chủ tăng giá — kèm giá mới":** form báo lỗi cần thêm ô "Giá mới" (tùy chọn, số) khi chọn lý do này.
* **Chuyển RENTED:** gọi lại `ApartmentService.updateStatus` (để phát sự kiện real-time 11.4 và mở bảng nhập hợp đồng 11.5), không cập nhật DB trực tiếp.
* **Điểm tín nhiệm:** thêm `trustScore` (mặc định 0) vào User.
  - Báo đúng: +5. Báo sai (Admin bấm "Bỏ qua" với lý do "báo sai"): −5.
  - Điểm < −15 thì tự khoá quyền báo lỗi (`canReport = false`, Admin mở lại được).
* **Quyền:** story ghi "Admin". Quản lý của căn cũng nên xử lý được báo lỗi căn của mình (như 11.4b) — cần bạn xác nhận.
