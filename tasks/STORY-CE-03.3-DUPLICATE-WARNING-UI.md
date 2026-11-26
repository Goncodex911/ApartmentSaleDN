# STORY CE-03.3: Cảnh Báo Trùng Rõ Ràng & Không Bị Lệch Kết Quả (Duplicate Warning UI)

**Bối cảnh:** `docs/stories/coverEpic.md` (CE-03, AC3 — phát hiện B, E).
Đã kiểm tra `frontend/src/components/apartment/ApartmentModal.tsx`:
* Dòng 69–97: kiểm tra trùng ngầm cho CTV dùng `setTimeout` 600 ms, **không có `AbortController`**. Khi mạng chậm, kết quả của lần gõ trước có thể về sau và ghi đè lần gõ mới, hiện cảnh báo của địa chỉ cũ. Khi đang chờ, banner cũ cũng không được xóa.
* Dòng 285–295: banner CTV chỉ ghi tiêu đề, giá, khu vực, rồi câu chung "tại địa chỉ này". Không có **lý do** và **tên đường**, nên CTV không biết vì sao bị báo trùng. `summarizeDuplicate(match, false)` không trả `street`.
* Dòng 177–182: `handleConfirmCreate` gọi `setPendingPayload(null)` **trước khi** `await executeSave`. Nếu lưu lỗi thì hộp thoại đã đóng và dữ liệu chờ đã mất, nên bấm Lưu lại sẽ hỏi trùng lần nữa.
* `DuplicateConfirmDialog.tsx` (Quản lý) **đã** hiện `reason` và `address`, không cần đổi lớn.

---

## 1. Mô tả Story (User Story)
* **Là một:** CTV / Quản lý đang nhập căn.
* **Tôi muốn:** Cảnh báo trùng luôn đúng với dữ liệu đang gõ và ghi rõ trùng vì sao, ở đường nào.
* **Để:** Tự quyết định nhanh mà không phải hỏi lại Quản lý.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story CE-03.2 đã xong (có `reason` chi tiết).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Hủy yêu cầu cũ
* **Given** CTV đang gõ địa chỉ / giá
* **When** dữ liệu đổi trước khi lần kiểm tra trước trả về
* **Then** yêu cầu cũ bị hủy (`AbortController`, truyền `signal` cho axios), kết quả cũ không ghi đè.
* **And** ngay khi dữ liệu đổi, banner cũ bị ẩn (`setSoftWarning(null)`) cho tới khi có kết quả mới.

### AC2 — Banner minh bạch
* **Then** banner CTV hiện: *"Có thể trùng: <tiêu đề> · <giá>/tháng · đường <tên đường> — <lý do>"*.
* **And** CTV chỉ thấy **tên đường** (không thấy số nhà, SĐT, người tạo). Backend `summarizeDuplicate(…, false)` trả thêm `street`.
* **And** bỏ emoji "⚠️" trong chữ (đã có icon `AlertTriangle`), tương phản chữ ≥ 4.5:1.

### AC3 — Giữ dữ liệu khi lưu lỗi
* **Given** Quản lý bấm "Vẫn tạo căn mới" trong hộp thoại trùng
* **When** lưu thất bại
* **Then** `pendingPayload` vẫn giữ, lỗi hiện trên form, bấm lại sẽ lưu tiếp **không** hỏi trùng lần nữa.
* **And** chỉ xóa `pendingPayload` khi lưu thành công.

### AC4 — Quản lý thấy cùng lý do
* **Then** `DuplicateConfirmDialog` hiện `reason` chi tiết mới (đã có chỗ hiện, chỉ cần dữ liệu từ CE-03.2).

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend
* **`backend/src/modules/dedup/similar-apartment.ts`:** `summarizeDuplicate`, nhánh không đặc quyền, thêm `street: apartment.location.street`.

### Frontend
* **`frontend/src/api/apartmentApi.ts`:** `checkDuplicate(payload, signal?: AbortSignal)`; kiểu `matchedApartment` thêm `street?`, `reason?`.
* **`frontend/src/components/apartment/ApartmentModal.tsx`:**
  - Trong effect: tạo `AbortController`, gọi `setSoftWarning(null)` đầu effect, cleanup gọi `clearTimeout` và `controller.abort()`. Bỏ qua lỗi hủy (`axios.isCancel` / `err.name === 'CanceledError'`).
  - `handleConfirmCreate`: đóng hộp thoại, rồi lưu. Chỉ gọi `setPendingPayload(null)` khi lưu thành công. Cách gọn nhất: `executeSave` trả `boolean`. Nếu file vượt 300 dòng thì tách banner thành `DuplicateSoftWarning.tsx`.
* Áp dụng checklist `/ui-ux-pro-max` cho banner (tương phản, không emoji làm icon, chữ đọc được trên điện thoại).

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] DevTools bật Slow 3G, gõ `Mỹ An 2` rồi sửa thành `Mỹ An 22` → chỉ hiện kết quả của `Mỹ An 22`, Network thấy yêu cầu cũ bị `canceled`.
* [ ] Banner CTV có tên đường và lý do, không lộ số nhà / SĐT (xem response trong Network).
* [ ] Giả lập lưu lỗi sau "Vẫn tạo căn mới" → bấm Lưu lại tạo được căn, không hiện lại hộp thoại trùng.
* [ ] Frontend `npm run build` và `npm test` đạt; backend `tsc --noEmit` đạt.
