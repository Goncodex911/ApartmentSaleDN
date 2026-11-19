# STORY 13.8: Hai Lựa Chọn Nhập Vị Trí: Địa Chỉ Trực Tiếp hoặc Link Maps (Dual Location Input Mode)

**Bối cảnh:** `docs/stories/EPIC_13_ADMIN_CONTROL_CENTER_AND_GOVERNANCE.md` Story 13.8.  
Trước đây, form nhập căn hộ yêu cầu người dùng phải dán link Google Maps để xác định vị trí. Điều này gây bất tiện khi môi giới đang đi ngoài đường bằng điện thoại (phải mở app Google Maps, tìm vị trí, copy link rồi dán lại). Story này nâng cấp giao diện phần "Vị trí", mang đến cho CTV và Quản lý 2 phương thức nhập liệu linh hoạt: gõ thẳng địa chỉ trên app HOẶC dán link Google Maps có sẵn.

---

## 1. Mô tả Story (User Story)
* **Là một:** CTV hoặc Quản lý đang nạp thông tin căn hộ trên điện thoại hoặc máy tính.
* **Tôi muốn:** Có 2 sự lựa chọn nhập vị trí rõ ràng: hoặc gõ thẳng địa chỉ trên app (tên đường, số nhà/kiệt, khu vực), hoặc dán link Google Maps nếu có sẵn link.
* **Để:** Thao tác nhập vị trí nhanh chóng, không bị phụ thuộc vào việc phải mở app Google Maps tìm link rồi copy dán qua lại gây mất thời gian khi đang di chuyển ngoài đường.

---

## 2. Tiền điều kiện (Pre-conditions)
* Đã có từ điển địa danh và khu vực Đà Nẵng (`ZONES`, `OTHER_DISTRICTS`) trong `danang.ts`.
* Vẫn đảm bảo nguyên tắc 2 tầng địa chỉ: Khách xem public chỉ thấy Tên đường + Khu vực; số nhà chi tiết và link Maps chỉ Quản lý & CTV nội bộ xem được.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Giao Diện Bộ Chuyển Đổi 2 Chế Độ Nhập (Segmented Control)
* **Given** Quản lý hoặc CTV mở form thêm/sửa căn hộ tại phần "Vị trí"
* **When** nhìn vào đầu mục Vị trí
* **Then** hiển thị bộ chọn 2 chế độ rõ ràng (Segmented Tabs / Radio Chips):
  - `[📍 Nhập địa chỉ trực tiếp]` *(Mặc định)*
  - `[🔗 Dán link Google Maps]`
* **When** người dùng bấm chuyển đổi giữa 2 chế độ
* **Then** giao diện bên dưới thay đổi các trường nhập liệu tương ứng mà không làm mất thông tin chung đã chọn (Khu vực / Tên đường).

### AC2 — Chế Độ 1: Nhập Địa Chỉ Trực Tiếp (Direct Address Input)
* **Given** người dùng chọn chế độ `[📍 Nhập địa chỉ trực tiếp]`
* **When** nhập liệu
* **Then**:
  - Chọn **Khu vực** (Mỹ An, An Thượng, Sơn Trà...) qua các chip bấm chọn nhanh.
  - Ô **Tên đường** (bắt buộc, vd: *"Hoàng Kế Viêm"*).
  - Ô **Số nhà / kiệt** (tùy chọn, vd: *"K12/4"*).
  - Ô **Phường** (tùy chọn, vd: *"Mỹ An"*).
  - **Không hiển thị và không bắt buộc ô nhập link Google Maps**.
* **Then** backend tự động ghép chuỗi địa chỉ đầy đủ: `[Số nhà] [Tên đường], [Phường], [Khu vực], Đà Nẵng` và tự động ước tính tọa độ GPS tương đối dựa trên từ điển địa danh để tính khoảng cách ra biển.

### AC3 — Chế Độ 2: Dán Link Google Maps (Map Link Pasting)
* **Given** người dùng chọn chế độ `[🔗 Dán link Google Maps]`
* **When** dán một link Google Maps hợp lệ (hỗ trợ `https://maps.app.goo.gl/...`, `https://goo.gl/maps/...`, `https://www.google.com/maps?q=...`)
* **Then**:
  - Hệ thống lưu lại link bản đồ này để phục vụ dẫn đường nội bộ.
  - Vẫn cho phép chọn Khu vực và Tên đường để hiển thị công khai cho khách thuê trên trang landing page.

### AC4 — Thống Nhất Dữ Liệu & Hiển Thị
* **Given** một căn hộ được tạo bằng chế độ 1 (chỉ có địa chỉ, không có link maps)
* **When** Quản lý hoặc CTV mở xem chi tiết căn hộ
* **Then** nút "Mở Google Maps" tự động tạo đường link tìm kiếm nhanh dựa trên địa chỉ: `https://www.google.com/maps/search/?api=1&query=[Địa chỉ]` để vẫn chỉ đường được bình thường.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/modules/apartments/apartment.validation.ts`:**
  - `mapUrl` trong `location` tiếp tục là `z.string().optional()`.
  - Nếu không có `mapUrl`, `address` được tự động ghép từ `houseNumber` + `street` + `ward` + `district` / `zone`.
  - Logic Geocoding tự động gán tọa độ tương đối theo `zone` / `street` nếu chưa có tọa độ chính xác.

### Frontend:
* **`frontend/src/components/apartment/LocationSection.tsx`:**
  - Bổ sung state `inputMode: 'DIRECT' | 'MAP_LINK'`.
  - Render thanh gạt 2 tab `[📍 Nhập địa chỉ trực tiếp]` / `[🔗 Dán link Google Maps]`.
  - Ở chế độ `DIRECT`: Ẩn trường link Google Maps, tập trung vào Khu vực, Tên đường, Số nhà/kiệt.
  - Ở chế độ `MAP_LINK`: Hiện ô nhập link Google Maps cùng Tên đường, Khu vực.
* **`frontend/src/components/apartment/ApartmentDetailModal.tsx`:**
  - Nếu căn có `mapUrl`: Mở trực tiếp `mapUrl`.
  - Nếu căn không có `mapUrl`: Mở link tìm kiếm Google Maps theo địa chỉ thực tế.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Kiểm tra tạo căn hộ chỉ bằng việc gõ Tên đường + Khu vực (không cần link maps) $\rightarrow$ Thành công.
* [ ] Kiểm tra tạo căn hộ bằng cách dán link maps $\rightarrow$ Thành công.
* [ ] Nút chỉ đường trên chi tiết căn hoạt động tốt trong cả 2 trường hợp.
* [ ] Thao tác chuyển đổi qua lại giữa 2 tab mượt mà, không bị mất dữ liệu đã gõ.

---

## 6. Đối chiếu với code hiện tại (bổ sung khi tạo story, 19/11/2026)
* **Phần lớn đã có từ Story 8.3:** `LocationSection` đã cho nhập Khu vực + Tên đường (bắt buộc) + Số nhà (tùy chọn) + link Google Maps (**đã tùy chọn**). Backend tự ghép `address` và lấy toạ độ từ link nếu có.
  Story này chủ yếu là **giao diện 2 chế độ** + **nút chỉ đường khi không có link**.
* **Toạ độ khi chỉ nhập địa chỉ:** `GeocodingService` hiện chỉ nhận ra **điểm mốc và tâm quận**, chưa có từ điển tên đường.
  Căn chỉ nhập địa chỉ sẽ có toạ độ ước lượng (bản đồ 11.2 hiện viền nét đứt). Thêm từ điển đường Đà Nẵng là việc riêng, không nằm trong story này.
* **"Phường":** form hiện chưa có ô Phường. Model đã có `location.ward` → thêm ô tùy chọn.
* **Link hỗ trợ:** `resolveMapCoordinates` đã xử lý `maps.app.goo.gl` và `google.com/maps` (có lọc tên miền chống SSRF). Thêm `goo.gl/maps` vào danh sách cho phép nếu chưa có.
* **Chuyển chế độ:** đổi tab không xoá dữ liệu. Chế độ "Nhập địa chỉ" chỉ **ẩn** ô link — link đã có vẫn giữ khi sửa căn cũ.
* **Khu vực:** dùng `ZONES` hiện có (chưa có "An Thượng", đang nằm trong "An Hải").
