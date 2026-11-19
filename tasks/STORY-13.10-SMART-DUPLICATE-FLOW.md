# STORY 13.10: Cảnh Báo & Khử Trùng Căn Hộ Phân Tách Cho Quản Lý & CTV (Smart Duplicate Flow)

**Bối cảnh:** `docs/stories/EPIC_13_ADMIN_CONTROL_CENTER_AND_GOVERNANCE.md` Story 13.10.  
Khi phát hiện căn hộ nghi trùng lặp (qua thuật toán bộ 3 từ Story 13.9), trải nghiệm xử lý cần **phân tách rõ ràng và phù hợp với từng vai trò**:
1. **Với CTV:** Cần sự thuận tiện, không được làm gián đoạn hay chặn cứng khiến CTV mất bài viết. Thay vào đó, hiển thị cảnh báo mềm (soft warning) để CTV tự kiểm tra lại số phòng/tầng trước khi gửi.
2. **Với Quản lý:** Quản lý là người trực tiếp kiểm soát bảng hàng, nên khi lưu căn nghi trùng cần bật Hộp thoại xác nhận (Confirmation Dialog) với 3 lựa chọn rõ ràng: Vẫn tạo mới (nếu là phòng khác cùng tòa) / Xem căn đã có / Hủy bỏ.

---

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý (Manager) hoặc CTV đang nạp/duyệt thông tin căn hộ vào hệ thống.
* **Tôi muốn:** Hệ thống có **cơ chế xử lý phân tách rõ ràng và phù hợp với từng vai trò**: CTV nhận cảnh báo mềm trên form để tự rà soát mà không bị chặn gửi, còn Quản lý nhận hộp thoại xác nhận 3 lựa chọn khi lưu căn để không bị nhầm lẫn và không bị chặn cứng.
* **Để:** Tối ưu hóa trải nghiệm thực tế cho từng đối tượng người dùng, giữ kho hàng luôn sạch, không bao giờ tạo trùng lặp do sơ ý.

---

## 2. Tiền điều kiện (Pre-conditions)
* Đã có thuật toán so khớp bộ 3 và endpoint `POST /api/v1/apartments/check-duplicate` từ Story 13.9.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Cơ Chế Dành Cho CTV Khi Đăng Tin (`SubmissionsPage.tsx`)
* **Given** CTV đang điền form Đăng tin
* **When** CTV điền Tên đường + Giá thuê hoặc bấm nút `[Gửi tin đăng]`
* **Then** hệ thống gọi API kiểm tra trùng lặp ngầm:
  - **Nếu phát hiện căn nghi trùng trong kho:** Form xuất hiện một **Khung cảnh báo mềm (Soft Warning Banner)** màu vàng nhạt ngay phía trên nút gửi:
    > *"⚠️ Lưu ý: Trong kho đã có 1 căn tương tự tại địa chỉ này ([Tiêu đề căn] · [Giá] · [Khu vực]). Vui lòng kiểm tra lại số phòng/tầng trước khi gửi để tránh gửi trùng."*
  - **TUYỆT ĐỐI KHÔNG CHẶN CỨNG:**
    - Nút `[Gửi tin đăng]` **vẫn sáng bình thường**, không bị vô hiệu hóa (disabled).
    - Không bật popup modal chặn đường thao tác.
    - CTV đọc cảnh báo xong, nếu xác nhận đây là phòng khác (ví dụ: căn cũ là P201, căn này là P302) thì vẫn bấm gửi tin bình thường $\rightarrow$ Tin vào hàng chờ duyệt `PENDING`.

### AC2 — Cơ Chế Dành Cho Quản Lý Khi Duyệt Tin CTV (`SubmissionsPage.tsx`)
* **Given** Quản lý mở danh sách tin chờ duyệt và bấm nút `[Duyệt]`
* **When** tin CTV gửi lên trùng căn đã có trong kho theo thuật toán bộ 3 hoặc ảnh
* **Then** hệ thống bật bảng trượt `DuplicateDialog` cho Quản lý 2 lựa chọn:
  1. `[Gộp làm nguồn phụ]`: Dữ liệu CTV gửi được gộp vào mảng `subListings` của căn gốc, không tạo thêm căn mới làm rác kho hàng.
  2. `[Vẫn tạo căn mới]`: Quản lý xác nhận đây là phòng độc lập $\rightarrow$ Tiến hành phê duyệt tạo căn mới trên bảng hàng.

### AC3 — Cơ Chế Dành Cho Quản Lý Khi Tự Tạo Căn Bằng Tay (`ApartmentModal.tsx`)
* **Given** Quản lý điền form thêm/sửa căn hộ và bấm nút `[Lưu căn hộ]`
* **When** hệ thống kiểm tra ngầm và phát hiện có căn tương tự trong kho
* **Then** hệ thống **chưa lưu ngay**, mà lập tức bật **Hộp thoại xác nhận `DuplicateConfirmDialog`**:
  - Tiêu đề: *"⚠️ Căn hộ này có thể đã có trong kho!"*
  - Nội dung cảnh báo:
    - Hiển thị thẻ tóm tắt căn nghi trùng: Ảnh đại diện, tiêu đề, giá thuê, địa chỉ, người tạo, ngày tạo, lý do nghi trùng (`Trùng Tên đường, Giá thuê và Loại căn`).
    - Dòng hỏi: *"Đây có phải là một phòng khác trong cùng tòa nhà?"*
  - **3 nút hành động rõ ràng:**
    1. `[✅ Vẫn tạo căn mới]`: Quản lý xác nhận là phòng khác trong cùng tòa $\rightarrow$ Hệ thống lập tức lưu căn hộ vào database (không bị chặn cứng).
    2. `[👁️ Xem căn đã có]`: Mở modal/tab xem chi tiết căn cũ để Quản lý đối chiếu kiểm tra.
    3. `[❌ Hủy bỏ]`: Đóng hộp thoại xác nhận, giữ nguyên form để Quản lý chỉnh sửa hoặc không lưu nữa nếu nhận ra nhập trùng.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/modules/dedup/dedup.service.ts`:**
  - Bổ sung hàm: `checkTripletMatch({ address, street, zone, district, price, propertyType, bedrooms, title })`:
    - Tìm kiếm các căn cùng khu vực/quận và giá trong khoảng $[0.95 \times \text{price}, 1.05 \times \text{price}]$.
    - So khớp từ khóa tên đường chuẩn hóa (đã bỏ dấu, tiền tố đường/ngõ/kiệt).
    - So khớp loại căn: Trùng `attributes.propertyType` hoặc `attributes.bedrooms`, hoặc Jaccard similarity từ khóa tiêu đề $\ge 50\%$.
  - Cập nhật hàm `checkDeterministicMatch` để tự động kích hoạt `checkTripletMatch` khi SĐT chủ nhà rỗng.
* **`backend/src/modules/apartments/apartment.controller.ts` & `apartment.routes.ts`:**
  - Endpoint mới: `POST /api/v1/apartments/check-duplicate`: Kiểm tra nhanh xem căn hộ chuẩn bị lưu có trùng căn nào trong kho không.
* **`backend/src/modules/submissions/submission.service.ts`:**
  - Cập nhật hàm `findDuplicates`: Sử dụng cả `checkDeterministicMatch`, `checkTripletMatch` và `checkVisualMatch`.

### Frontend:
* **`frontend/src/components/apartment/ApartmentModal.tsx`:**
  - Tích hợp kiểm tra trùng lặp trước khi submit:
    - Khi bấm Lưu: gọi `apartmentApi.checkDuplicate(...)`.
    - Nếu trùng và `confirmedDuplicate === false` $\rightarrow$ Mở `DuplicateConfirmDialog`.
    - Nếu người dùng bấm `[Vẫn tạo căn mới]` $\rightarrow$ Gán `confirmedDuplicate = true` và tiến hành `apartmentApi.create(...)`.
* **Component mới:** `frontend/src/components/apartment/DuplicateConfirmDialog.tsx`.
* **Form Đăng tin CTV (`SubmissionsPage.tsx` hoặc form CTV):**
  - Hiển thị `SoftWarningBanner` màu vàng khi phát hiện căn nghi trùng.
  - Không disable nút Gửi.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [x] Kiểm tra CTV: Gặp căn trùng $\rightarrow$ Hiện cảnh báo màu vàng, nút Gửi vẫn bấm được bình thường.
* [x] Kiểm tra Quản lý: Bấm Lưu căn trùng $\rightarrow$ Hiện hộp thoại xác nhận 3 lựa chọn.
* [x] Bấm "Vẫn tạo căn mới" $\rightarrow$ Lưu thành công căn hộ mới.
* [x] Bấm "Hủy bỏ" $\rightarrow$ Không có căn nào được ghi vào DB.
