# STORY 20.6: Studio Ẩn Phòng Ngủ & Chọn Nhanh Số Phòng (Studio & Quick Room Picker)

**Bối cảnh:** `docs/stories/EPIC_20_USER_FEEDBACK_INGESTION_MAP_FORM.md` (mục E, Story 20.6). Phản hồi: "Studio thì không cần nhập số phòng ngủ", "Số phòng ngủ, phòng tắm cho thành enum chọn cho nhanh".
Đã kiểm tra trên `main` ee1fdfe:
* `ApartmentModal.tsx` (**309 dòng — đã vượt giới hạn 300**): ô Phòng ngủ / Phòng tắm là `<input type="number">` (dòng ~232–237), placeholder `0 = studio`; Phòng ngủ bắt buộc (`bedrooms === ''` bị chặn ở dòng ~122).
* Loại căn `STUDIO` có trong `PROPERTY_TYPES` (`frontend/src/utils/danang.ts`).
* Quy ước Story 19.6: Studio = **0 phòng ngủ**.

**Độ khó:** Dễ (chỉ UI form, không đổi API) — **giao Antigravity**, Claude rà diff + build.

---

## 1. Mô tả Story (User Story)
* **Là một:** Người nhập căn trên điện thoại.
* **Tôi muốn:** Chọn số phòng bằng 1 chạm và không phải nhập phòng ngủ cho Studio.
* **Để:** Nhập căn nhanh hơn, ít gõ phím.

---

## 2. Tiền điều kiện (Pre-conditions)
* Không có.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Studio ẩn phòng ngủ
* **Given** form thêm / sửa căn
* **When** chọn Loại căn = Studio
* **Then** ẩn ô Phòng ngủ, giá trị gửi lên `bedrooms = 0`, không báo lỗi thiếu phòng ngủ.
* **When** đổi từ Studio sang loại khác
* **Then** hiện lại nhóm Phòng ngủ, chọn sẵn `1`.

### AC2 — Nhóm nút chọn nhanh
* **Then** Phòng ngủ là nhóm nút `1 · 2 · 3 · 4 · 5+`; Phòng tắm `1 · 2 · 3 · 4+`.
* **And** chọn `5+` / `4+` → hiện ô nhập số (≥ 5 / ≥ 4), chữ ≥ 16px.
* **And** mỗi nút cao ≥ 44px, trạng thái đang chọn rõ (nền màu chính + chữ trắng, tương phản ≥ 4.5:1), dùng `role="radiogroup"` / `role="radio"` + `aria-checked`, chuyển được bằng phím mũi tên.

### AC3 — Dữ liệu cũ
* **Given** sửa căn có 6 PN → nút `5+` được chọn, ô nhập hiện `6`.
* **Given** sửa căn không phải Studio nhưng có 0 PN (dữ liệu cũ) → nhóm Phòng ngủ không chọn nút nào, bắt buộc chọn trước khi lưu.

### AC4 — Không đổi gì khác
* **Then** dữ liệu gửi lên vẫn là số (`bedrooms`, `bathrooms`), API / validate backend không đổi.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Frontend
* **Tạo `frontend/src/components/apartment/RoomCountPicker.tsx`** (~60 dòng): props `{ label, value: number | '', options: number[], maxOptionLabel: string, onChange }`.
* **`ApartmentModal.tsx`**: thay 2 ô số bằng `RoomCountPicker`; ẩn Phòng ngủ khi `propertyType === 'STUDIO'` và đặt `bedrooms = 0`; sửa điều kiện validate dòng ~122. Tách thêm 1 phần form ra component nếu cần để file **≤ 300 dòng**.
* Không đổi backend.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] `npm run build` (frontend) đạt.
* [ ] Thử tay: tạo Studio → lưu được, DB `bedrooms = 0`; tạo căn 2 PN 2 WC bằng nút; sửa căn 6 PN hiển thị đúng.
* [ ] `ApartmentModal.tsx` ≤ 300 dòng, không `console.log`, không import thừa.
* [ ] Claude rà diff của Antigravity trước khi báo cáo.
