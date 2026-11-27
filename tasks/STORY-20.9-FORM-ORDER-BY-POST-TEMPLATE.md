# STORY 20.9: Sắp Xếp Form Theo Thứ Tự Tin Mẫu (Form Order by Post Template)

**Bối cảnh:** `docs/stories/EPIC_20_USER_FEEDBACK_INGESTION_MAP_FORM.md` (mục E, Story 20.9). Phản hồi: "Gom các trường thông tin theo thứ tự của post".
Thứ tự tin mẫu: Type → Rooms → Square meters → Address → Distance to the sea → Price → Minimum rental period → Free dates → Other conditions → Contact.
Đã kiểm tra trên `main` ee1fdfe — thứ tự form hiện tại (`ApartmentModal.tsx`, 309 dòng):
1. Ảnh & video → 2. Tiêu đề + Giá → 3. Vị trí (`LocationSection`) → 4. Căn hộ (Loại, PN, WC, m², Nội thất) → 5. Tiện ích → 6. Biển & thời hạn (`MarketFieldsSection`: Cách biển, Giá USD, Thuê tối thiểu) → 7. Phí hàng tháng → 8. Chủ nhà / đầu mối.
* **"Free dates" (ngày trống)**: model có `availableDate` nhưng form thêm / sửa căn **không có** ô này (chỉ ở `LeaseSection`) → **ngoài phạm vi** story này.

**Độ khó:** Dễ (chỉ đổi vị trí hiển thị) — **giao Antigravity**, Claude rà diff + build. **Làm sau Story 20.6** (cùng sửa `ApartmentModal.tsx`).

---

## 1. Mô tả Story (User Story)
* **Là một:** Người nhập căn nhìn theo tin gốc.
* **Tôi muốn:** Các trường trong form xếp đúng thứ tự tin mẫu.
* **Để:** Nhập từ trên xuống một mạch, không phải cuộn lên xuống tìm ô.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story 20.6 đã xong (tránh xung đột `ApartmentModal.tsx`).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Thứ tự mới
* **Then** form hiển thị theo thứ tự:
  1. Ảnh & video
  2. Tiêu đề
  3. **Căn hộ:** Loại căn → Phòng ngủ / Phòng tắm → Diện tích → Nội thất
  4. **Vị trí** (`LocationSection` giữ nguyên bên trong)
  5. **Cách biển**
  6. **Giá:** Giá thuê (VNĐ) → Giá USD
  7. **Thuê tối thiểu**
  8. Tiện ích (điều kiện khác)
  9. Phí hàng tháng
  10. Chủ nhà / đầu mối (liên hệ)

### AC2 — Không đổi dữ liệu
* **Then** chỉ đổi vị trí hiển thị: tên trường, validate, giá trị mặc định, dữ liệu gửi lên, quyền xem mục Chủ nhà **không đổi**.
* **And** thứ tự Tab bàn phím đi theo thứ tự hiển thị mới.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Frontend
* **`frontend/src/components/apartment/MarketFieldsSection.tsx`**: tách thành các phần đặt được độc lập (VD prop `fields: ('beach' | 'usd' | 'lease')[]`, hoặc 2–3 component nhỏ) để đặt "Cách biển", "Giá USD", "Thuê tối thiểu" đúng chỗ.
* **`frontend/src/components/apartment/ApartmentModal.tsx`**: sắp xếp lại JSX theo AC1; tách "Giá" khỏi khối Tiêu đề. File phải **≤ 300 dòng** (tách component con nếu cần).
* Không đổi backend.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] `npm run build` (frontend) đạt.
* [ ] Thử tay: tạo và sửa căn (cả Quản lý và CTV) → lưu đúng mọi trường như trước.
* [ ] File ≤ 300 dòng, không `console.log`, không import thừa.
* [ ] Claude rà diff của Antigravity trước khi báo cáo.
