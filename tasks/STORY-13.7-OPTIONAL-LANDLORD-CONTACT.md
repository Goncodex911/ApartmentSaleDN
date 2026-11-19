# STORY 13.7: Chuyển Số Điện Thoại & Tên Chủ Nhà Thành Tùy Chọn (Optional Landlord Contact)

**Bối cảnh:** `docs/stories/EPIC_13_ADMIN_CONTROL_CENTER_AND_GOVERNANCE.md` Story 13.7.  
Hiện tại, cả form "Thêm căn hộ" của Quản lý (`ApartmentModal`) và form "Đăng tin" của CTV (`Submissions`) đều bắt buộc nhập `ownerContact.name` và `ownerContact.phone`. Trong thực tế môi giới, nhiều căn hộ thuộc nguồn liên kết, đối tác trung gian hoặc chủ nhà chỉ trao đổi qua Zalo mà chưa có SĐT trực tiếp. Việc bắt buộc nhập khiến người dùng phải điền số điện thoại rác/ảo làm bẩn cơ sở dữ liệu. Story này nới lỏng validation, biến SĐT và tên chủ thành trường tùy chọn (optional).

---

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý (Manager) hoặc CTV đang đăng tin căn hộ mới lên hệ thống.
* **Tôi muốn:** Trường số điện thoại và tên chủ nhà (`ownerContact.phone`, `ownerContact.name`) trở thành trường **Tùy chọn (Optional)**, không còn bắt buộc phải nhập.
* **Để:** Tôi có thể nhanh chóng lưu trữ các căn hộ thuộc nguồn liên kết, căn hộ đối tác môi giới, hoặc các căn chủ nhà chỉ trao đổi qua Zalo/mạng xã hội mà không bị chặn form hoặc phải điền bừa số điện thoại ảo làm bẩn dữ liệu hệ thống.

---

## 2. Tiền điều kiện (Pre-conditions)
* Giữ nguyên tính năng bảo mật: Nếu có SĐT chủ nhà thì CTV thông thường vẫn không xem được (bị mask); Quản lý và Admin vẫn xem được đầy đủ.
* Nếu người dùng có nhập SĐT thì vẫn phải kiểm tra hợp lệ theo định dạng số điện thoại Việt Nam (`vnPhone`).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Nới Lỏng Validation Backend (Backend Schema)
* **Given** Quản lý hoặc CTV gửi request tạo/sửa căn hộ hoặc đăng tin CTV
* **When** payload gửi lên không có `ownerContact.phone` hoặc phone là chuỗi rỗng `""`
* **Then** backend validation (Zod) chấp nhận request là hợp lệ và lưu vào database.
* **When** payload có gửi `ownerContact.phone` với giá trị (vd: `"0905123456"`)
* **Then** backend kiểm tra định dạng số điện thoại VN: nếu sai định dạng (vd: `"12345"`) thì trả về lỗi validation tương ứng.
* **When** payload không có `ownerContact.name`
* **Then** backend chấp nhận hợp lệ (hoặc gán giá trị mặc định là `"Chưa cập nhật"` nếu cần thiết).

### AC2 — Giao Diện Form Nhập Liệu Linh Hoạt (`ApartmentModal.tsx` & form Submissions)
* **Given** Quản lý mở form "Thêm căn hộ" hoặc CTV mở form "Đăng tin"
* **When** quan sát phần "Chủ nhà / đầu mối"
* **Then**:
  - Nhãn "Tên" và "Số điện thoại" không còn dấu sao đỏ bắt buộc (`*`).
  - Placeholder của ô SĐT hiển thị: *"0905... (để trống nếu là nguồn liên kết)"*.
  - Ô "Ghi chú riêng" giữ nguyên để lưu thông tin liên hệ phụ (vd: *"Liên hệ qua Zalo bạn Minh đối tác"*).
* **When** người dùng bỏ trống cả tên và SĐT chủ nhà rồi bấm `[Lưu căn hộ]`
* **Then** form gửi dữ liệu thành công, không xuất hiện thông báo lỗi chặn Submit.

### AC3 — Hiển Thị Trong Chi Tiết Căn Hộ (`ApartmentDetailModal.tsx`)
* **Given** Quản lý mở xem chi tiết một căn hộ không có SĐT chủ
* **When** nhìn vào phần thông tin chủ nhà
* **Then**:
  - Hiển thị nhãn thông tin nhẹ nhàng: *"Chưa có SĐT chủ (Nguồn liên kết / Đang cập nhật)"*.
  - Nút "Gọi chủ nhà" chuyển sang trạng thái mờ (disabled) hoặc ẩn đi để tránh hiểu lầm.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/modules/apartments/apartment.model.ts`:**
  - Sửa `ownerContact`:
    ```typescript
    ownerContact: {
      name: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      note: { type: String, trim: true },
    }
    ```
* **`backend/src/modules/apartments/apartment.validation.ts`:**
  - Trong `createApartmentSchema`:
    ```typescript
    ownerContact: z.object({
      name: z.string().trim().optional().default(''),
      phone: z.string().trim().refine(
        (val) => !val || /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(val.replace(/\s+/g, '')),
        'Số điện thoại chủ nhà không đúng định dạng VN'
      ).optional().default(''),
      note: z.string().trim().optional(),
    }).optional().default({}),
    ```
  - `submissionDataSchema` tự động thừa hưởng do kế thừa từ `createApartmentSchema`.

### Frontend:
* **`frontend/src/components/apartment/ApartmentModal.tsx`:**
  - Xóa `required` khỏi `<Field label="Tên">` và `<Field label="Số điện thoại">`.
  - Cập nhật placeholder thân thiện.
* **`frontend/src/components/apartment/ApartmentDetailModal.tsx`:**
  - Xử lý điều kiện render khi `ownerContact.phone` trống.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Tạo căn hộ mới mà không điền Tên và SĐT chủ nhà $\rightarrow$ Thành công.
* [ ] Điền SĐT chủ nhà sai định dạng $\rightarrow$ Báo lỗi đúng format.
* [ ] Điền SĐT chủ nhà đúng định dạng $\rightarrow$ Lưu thành công.
* [ ] CTV mở xem căn hộ vẫn không thấy số chủ nhà (bảo vệ quyền lợi).

---

## 6. Đối chiếu với code hiện tại (bổ sung khi tạo story, 19/11/2026)
* **Đang bắt buộc ở 2 tầng:** `apartment.model.ts` (`name`, `phone`: `required: true`) và `apartment.validation.ts` (`name` tối thiểu 2 ký tự, `phone` theo `vnPhone`). `submissionDataSchema` kế thừa từ `createApartmentSchema` nên sửa 1 chỗ là đủ.
* **Dùng lại `vnPhone`** trong `utils/validators.ts` kèm `.optional().or(z.literal(''))` (cách `lead.validation.ts` đang dùng), không viết lại regex riêng.
* **Không đặt mặc định "Chưa cập nhật" cho tên:** để trống và hiện nhãn ở giao diện. Tránh chữ giả làm bẩn dữ liệu và bài gửi khách.
* **Chỗ khác dùng SĐT chủ nhà (đã an toàn khi trống):**
  - `dedup.service.ts`: bỏ qua SĐT ngắn hơn 8 số.
  - `maskApartment`: dùng `contact.phone?.`.
  - `DetailActionBar`: nút Gọi chủ nhà chỉ hiện khi có SĐT.
  - `TourPlanSheet`: chỉ hiện dòng SĐT khi có.
  Cần rà thêm `MatchShareModal` và bài gửi khách (`shareText`).
* **Bot cào tin:** Gemini vẫn gắn cờ `needsReview` khi tin thiếu SĐT (giữ nguyên — tin cào thiếu SĐT vẫn đáng nghi). Story này chỉ nới cho form nhập tay.
