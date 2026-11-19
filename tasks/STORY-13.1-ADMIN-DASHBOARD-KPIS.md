# STORY 13.1: Trung Tâm Điều Hành & Bảng Thống Kê Tổng Quan (Admin Dashboard KPIs)

**Bối cảnh:** `docs/stories/EPIC_13_ADMIN_CONTROL_CENTER_AND_GOVERNANCE.md` Story 13.1.  
Hiện tại hệ thống chưa có route `/admin` riêng biệt. Người dùng có role `ADMIN` phải dùng chung hoàn toàn giao diện với Manager, chỉ có thêm modal "Duyệt tài khoản" trong menu avatar. Story này xây dựng trung tâm điều hành tập trung cho Admin với bảng thống kê kinh doanh (KPIs), phân bổ kho căn hộ, tình trạng cào tin tự động và lượt truy cập của khách.

---

## 1. Mô tả Story (User Story)
* **Là một:** Quản trị viên cao cấp (Admin).
* **Tôi muốn:** Có một trang Dashboard riêng (`/admin`) hiển thị bức tranh toàn cảnh về kho hàng, thành viên, dữ liệu thu thập và lượt khách truy cập.
* **Để:** Nắm bắt nhịp độ vận hành của toàn bộ hệ thống trong 5 giây mà không cần kiểm tra thủ công từng bảng dữ liệu.

---

## 2. Tiền điều kiện (Pre-conditions)
* Người dùng đã đăng nhập và có `user.role === 'ADMIN'`.
* Không sử dụng các thư viện biểu đồ nặng (Chart.js, Recharts, D3); toàn bộ visual bars, progress pills được dựng bằng CSS/Tailwind thuần nhẹ nhàng (nguyên tắc Ponytail).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Menu Điều Hướng & Bảo Vệ Route Guard
* **Given** người dùng đăng nhập tài khoản có role `ADMIN`
* **When** người dùng quan sát thanh điều hướng
* **Then** trên Navbar (Desktop) và Account Menu (Mobile) xuất hiện thêm mục `[⚙️ Quản trị Admin]` dẫn đến `/admin`
* **Given** người dùng có role `COLLABORATOR` hoặc `MANAGER` hoặc khách vãng lai
* **When** cố tình truy cập trực tiếp vào URL `/admin`
* **Then** hệ thống chặn lại và tự động chuyển hướng (Redirect) về `/apartments`.

### AC2 — Thẻ Chỉ Số Kinh Doanh Cốt Lõi (Executive KPI Cards)
* **Given** Admin truy cập trang `/admin`
* **When** trang tải xong
* **Then** hiển thị 4 nhóm thẻ thống kê chỉ số:
  1. **Kho căn hộ:** Tổng số căn, phân loại theo trạng thái:
     - `Trống (AVAILABLE)`
     - `Sắp trống (UPCOMING)`
     - `Đã cọc (DEPOSITED)`
     - `Đã thuê (RENTED)`.
  2. **Đội ngũ thành viên:**
     - Tổng số CTV, tổng số Quản lý.
     - Số tài khoản `PENDING` đang chờ duyệt (kèm badge đỏ nhấp nháy nếu $> 0$).
  3. **Cào tin tự động (Ingestion Health):**
     - Số tin nhận được trong 24h qua.
     - Số tin AI trích xuất thành công.
     - Số tin rác / trùng lặp bị thuật toán dHash chặn lại.
  4. **Tương tác thị trường:**
     - Tổng lượt khách xem landing page công khai (`/p/:slug`).
     - Tổng số Lead (Khách tìm phòng) đang hoạt động trong hệ thống.

### AC3 — Biểu Đồ Trực Quan Thuần CSS/Tailwind
* **Given** Admin đang xem trang Dashboard
* **When** cuộn xuống phần phân tích
* **Then** hệ thống hiển thị:
  - **Phân bố căn hộ theo khu vực Đà Nẵng:** Thanh tỷ lệ % các khu vực (Mỹ An, An Thượng, Sơn Trà, Hải Châu, Ngũ Hành Sơn, Hòa Xuân, Khác).
  - **Phân bổ phân khúc giá:** Tỷ lệ % các tầm giá: Dưới 5tr, 5-8tr, 8-12tr, trên 12tr.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **Endpoint mới:** `GET /api/v1/admin/dashboard-stats` (yêu cầu `authMiddleware` + `requireRoles('ADMIN')`).
* **Controller / Service:** `AdminController.getDashboardStats` trong `backend/src/modules/admin/`.
  - Dùng MongoDB aggregation (`$facet`, `$group`) để tính toán thống kê trong 1 query duy nhất:
    - Đếm căn hộ theo `status`, `location.zone`, `price`.
    - Đếm người dùng theo `role` và `status`.
    - Đếm tin ingestion 24h, đếm leads, đếm lượt xem share link (`viewCount`).

### Frontend:
* **Tạo trang mới:** `frontend/src/pages/AdminDashboardPage.tsx`.
* **Cập nhật Route:** Trong `frontend/src/App.tsx`, bổ sung Route `/admin` với `ProtectedRoute` kiểm tra `role === 'ADMIN'`.
* **Thanh điều hướng:** Bổ sung mục `Quản trị Admin` trong `frontend/src/components/layout/Navbar.tsx` và `AccountMenu.tsx`.
* **API Client:** Thêm `adminApi.ts` gọi `GET /api/v1/admin/dashboard-stats`.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Kiểm tra phân quyền: CTV/Manager không vào được `/admin`, Admin vào bình thường.
* [ ] Kiểm tra số liệu thống kê khớp 100% với dữ liệu thực tế trong MongoDB.
* [ ] Kiểm tra giao diện hiển thị mượt mà trên cả điện thoại (responsive) và máy tính.
* [ ] Không phát sinh lỗi console, không cài thêm thư viện npm nặng.

---

## 6. Đối chiếu với code hiện tại (bổ sung khi tạo story, 19/11/2026)
* **Chưa có nơi lưu lịch sử cào tin:** `dedup.service.ts` tạo căn / gộp trùng nhưng không ghi lại "đã nhận bao nhiêu tin, bao nhiêu tin bị loại".
  → Cần thêm collection nhỏ `ingestion_events` (`{ at, result: 'CREATED' | 'MERGED_DUPLICATE' | 'NOT_RENTAL' | 'FAILED' }`, TTL 30 ngày), ghi 1 dòng mỗi tin trong `IngestionController`.
  Số liệu "24h qua" chỉ có từ lúc triển khai trở đi, không có dữ liệu cũ.
* **Lượt xem trang khách:** cộng trường `views` của `ShareLink` (không phải `viewCount`).
* **Lead:** dùng `Lead.createdAt` cho "Lead mới trong tuần"; Lead đang mở = `stage` thuộc `OPEN_LEAD_STAGES`.
* **Khu vực:** danh sách `ZONES` hiện tại là Mỹ An, Sơn Trà, Hải Châu, An Hải, Khuê Mỹ, Ngũ Hành Sơn, Hòa Xuân, Khác. **Chưa có "An Thượng"**; An Thượng đang nằm trong "An Hải". Biểu đồ dùng đúng danh sách `ZONES`; nếu cần tách An Thượng thì làm story riêng (đổi dữ liệu).
* **Khoảng giá:** dùng lại `PRICE_RANGES` của bộ lọc (Dưới 5tr · 5–8tr · 8–12tr · 12–20tr · Trên 20tr) để số trên Dashboard khớp với chip lọc.
* **Giao diện:** dùng `Card`, `Badge`, `Skeleton`, `EmptyState` của Epic 12. Icon `lucide` (`Settings`, …) thay emoji ⚙️.
* **Hiệu năng:** 1 lần `$facet` cho căn hộ, `countDocuments` song song cho phần còn lại; không cần cache ở quy mô hiện tại.
