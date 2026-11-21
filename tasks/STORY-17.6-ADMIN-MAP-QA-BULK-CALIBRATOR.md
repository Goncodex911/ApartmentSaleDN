# STORY 17.6: Bảng Rà Soát & Căn Chỉnh Vị Trí Kho Hàng Cho Quản Trị Viên (Admin Map QA & Bulk Location Calibrator)

**Bối cảnh:** `docs/stories/EPIC_17_MULTI_CHANNEL_AUTO_POSTING_AND_PRECISION_MAPS.md` (Story 17.6).  
Trong quá trình vận hành thực tế, một lượng căn hộ cũ hoặc tin cào tự động từ bot chỉ có địa chỉ tương đối (đang cắm ở tâm phường/quận với cờ `geoPrecision: 'APPROXIMATE'`). Nếu Quản lý phải mở từng căn, bấm Sửa, kéo ghim rồi bấm Lưu thì sẽ mất hàng giờ đồng hồ. Story này xây dựng màn hình chuyên dụng **Admin Map QA Dashboard (`/admin/map-qa`)** với giao diện chia đôi màn hình thông minh (Split-Screen), cho phép Quản lý kiểm duyệt, kéo ghim và lưu vị trí chính xác chỉ trong 5 giây cho mỗi căn hộ.

---

## 1. Mô tả Story (User Story)
* **Là một:** Admin hoặc Quản lý hệ thống.
* **Tôi muốn:** Có một trang chuyên dụng kiểm tra chất lượng bản đồ (`/admin/map-qa`) để lọc toàn bộ các căn hộ chưa chuẩn vị trí và căn chỉnh trực tiếp trên bản đồ chỉ trong vài giây.
* **Để:** Làm sạch toàn bộ kho hàng nhanh chóng, đạt mục tiêu 100% căn hộ trên hệ thống đều nằm chính xác trên bản đồ.

---

## 2. Tiền điều kiện (Pre-conditions)
* Người dùng có vai trò `ADMIN` hoặc `MANAGER`.
* Đã có cờ `location.geoPrecision` (`'EXACT'` hoặc `'APPROXIMATE'`) trong schema căn hộ.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Giao Diện Soát Lỗi Chia Đôi Màn Hình (Split-Screen Map QA)
* **Given** Quản lý truy cập đường dẫn `/admin/map-qa`
* **When** trang tải xong
* **Then** giao diện hiển thị 2 cột chuyên nghiệp:
  1. **Cột bên trái (Danh sách chờ chuẩn hóa — ~380px):**
     - Thanh thống kê tiến độ trên cùng: `🎯 Tiến độ chuẩn hóa: [Số căn EXACT]/[Tổng số căn] ([%])`.
     - Bộ lọc theo Khu vực / Quận: Mỹ An, An Thượng, Sơn Trà, Hải Châu...
     - Danh sách thẻ căn hộ cần chuẩn hóa (các căn có `geoPrecision === 'APPROXIMATE'`): Hiển thị ảnh đại diện, tiêu đề, địa chỉ, giá thuê và cờ cảnh báo *"Vị trí ước tính"*.
  2. **Cột bên phải (Bản đồ tương tác toàn màn hình):**
     - Bản đồ Leaflet với khả năng chuyển đổi giữa lớp Vệ tinh (Satellite) và Bản đồ đường phố (Street Map).
     - Hiển thị marker vị trí hiện tại của căn đang chọn.

### AC2 — Thao Tác Căn Chỉnh Vị Trí 1-Chạm Siêu Tốc
* **Given** Quản lý bấm chọn một căn hộ ở danh sách bên trái
* **When** căn hộ được kích hoạt
* **Then** hệ thống thực hiện:
  - Bản đồ bên phải tự động lướt mượt mà (`flyTo`) đến vị trí hiện tại của căn với mức zoom cận cảnh 18.
  - Marker của căn đổi sang màu cam nổi bật và có thể kéo thả trực tiếp (`draggable: true`).
  - Nếu căn có link Google Maps hoặc địa chỉ text: Cung cấp nút tiện ích `[🔗 Mở link Maps gốc]` để Quản lý đối chiếu vị trí nóc nhà.
* **When** Quản lý dùng chuột kéo marker đến đúng nóc tòa nhà
* **Then** nút `[💾 Lưu vị trí chính xác]` sáng lên màu xanh nổi bật kèm phím tắt `Ctrl + S` / `Cmd + S`.
* **When** Quản lý bấm `[Lưu vị trí chính xác]`
* **Then** hệ thống:
  1. Gửi API cập nhật tọa độ GPS mới và chuyển `geoPrecision = 'EXACT'`.
  2. Căn hộ vừa xử lý tự động biến mất khỏi danh sách chờ bên trái với hiệu ứng mượt mà.
  3. Hệ thống tự động chọn căn hộ kế tiếp trong danh sách để Quản lý tiếp tục thao tác mà không cần bấm chuột chọn lại.
  4. Thanh tiến độ phần trăm tự động nhảy tăng lên.

### AC3 — Hỗ Trợ Phím Tắt Tăng Năng Suất (Hotkeys for Power Users)
* **Given** Quản lý đang ở trang Map QA
* **When** thao tác bằng bàn phím
* **Then** hỗ trợ:
  - `Phím mũi tên Xuống / Lên`: Chuyển đổi giữa các căn trong danh sách.
  - `Phím Space`: Căn tâm bản đồ vào vị trí ghim.
  - `Phím Enter` hoặc `Ctrl + S`: Lưu vị trí căn hiện tại và nhảy sang căn kế tiếp.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/modules/apartments/apartment.controller.ts` & `apartment.routes.ts`:**
  - Endpoint `GET /api/v1/apartments/admin/map-qa/pending`: Lấy danh sách các căn hộ đang có `geoPrecision: 'APPROXIMATE'` (hỗ trợ phân trang và lọc theo zone).
  - Endpoint `PATCH /api/v1/apartments/:id/calibrate-location`: Cập nhật nhanh tọa độ `coordinates: [lng, lat]`, tự động set `geoPrecision: 'EXACT'`, ghi nhận người hiệu chỉnh và thời gian hiệu chỉnh vào audit log.

### Frontend:
* **`frontend/src/pages/admin/MapQAPage.tsx` (Tạo mới):**
  - Màn hình Split-Screen chia đôi: List bên trái + Leaflet Map bên phải.
  - Tích hợp lớp bản đồ vệ tinh để dễ dàng nhận diện nóc nhà.
  - Tích hợp phím tắt `keydown`.
* **`frontend/src/api/apartmentApi.ts`:**
  - Bổ sung hàm `getMapQAPending(params)` và `calibrateApartmentLocation(id, coordinates)`.
* **`frontend/src/App.tsx`:**
  - Đăng ký route mới: `/admin/map-qa` được bảo vệ bởi quyền `ADMIN` hoặc `MANAGER`.
* **Thanh điều hướng Admin Console (`frontend/src/pages/admin/AdminLayout.tsx`):**
  - Bổ sung menu item: *"Rà soát Bản đồ (Map QA)"* kèm huy hiệu số lượng căn cần xử lý.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Kiểm tra quyền: Chỉ Admin và Quản lý mới truy cập được `/admin/map-qa`, CTV thường truy cập sẽ bị điều hướng về trang chủ.
* [ ] Kiểm tra kéo ghim và lưu: Kéo ghim căn hộ và bấm Lưu $\rightarrow$ Tọa độ mới được ghi vào DB, cờ chuyển thành `EXACT`, căn biến mất khỏi danh sách chờ.
* [ ] Kiểm tra tốc độ: Thử nghiệm căn chỉnh liên tục 5 căn bằng phím tắt diễn ra trơn tru trong dưới 1 phút.
* [ ] Build test: Cả frontend và backend biên dịch sạch sẽ không có lỗi TypeScript hay linter.
