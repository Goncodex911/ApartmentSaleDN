# STORY 20.7: Lọc Theo Diện Tích m² (Area Filter)

**Bối cảnh:** `docs/stories/EPIC_20_USER_FEEDBACK_INGESTION_MAP_FORM.md` (mục E, Story 20.7). Phản hồi: "Lọc theo m2".
Đã kiểm tra trên `main` ee1fdfe:
* Dữ liệu có sẵn: `attributes.area` (Number, không bắt buộc) — `apartment.model.ts` dòng 164.
* `FilterSheet.tsx` (153 dòng) có: Khoảng giá, Khu vực, Loại căn, Phòng ngủ, Tiện ích, Trạng thái, Gần địa điểm — **chưa có diện tích**.
* `useApartmentSearch.ts`, `filterChips.ts`, `search.controller.ts` (dòng 57–60: `minPrice`, `maxPrice`, `bedrooms`), `filter.builder.ts` (khoảng giá dạng mốc `PRICE_RANGES`, nửa mở `[min, max)` — Story 14.8) — chưa có diện tích.

**Độ khó:** Trung bình (backend + frontend, ~6 file) — **Claude làm**.

---

## 1. Mô tả Story (User Story)
* **Là một:** CTV tìm căn cho khách.
* **Tôi muốn:** Lọc căn theo diện tích.
* **Để:** Đáp ứng nhanh khách cần căn rộng hoặc nhỏ.

---

## 2. Tiền điều kiện (Pre-conditions)
* Không có.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Mốc nhanh & tự nhập
* **Given** mở bộ lọc
* **Then** có mục **Diện tích** với các nút mốc `< 30 m²`, `30–50 m²`, `50–80 m²`, `> 80 m²` và ô Tối thiểu / Tối đa (số nguyên dương, chữ ≥ 16px).
* **And** chọn mốc → điền min / max tương ứng; sửa ô tay → bỏ chọn mốc.

### AC2 — Lọc đúng
* **Given** API `GET` tìm kiếm nhận `minArea`, `maxArea`
* **Then** lọc `attributes.area` theo `[minArea, maxArea)` (nửa mở, cùng quy ước khoảng giá Story 14.8 — căn đúng 50 m² thuộc `50–80`).
* **And** khi đang lọc diện tích, căn **chưa có** diện tích **không** hiện.
* **And** validate (Zod / hàm `num` hiện có): số dương ≤ 10 000; `minArea > maxArea` → 400 với thông điệp tiếng Việt.

### AC3 — Chip, URL, Bản đồ
* **Then** có chip "Diện tích 30–50 m²" (hoặc "≥ 30 m²" / "< 50 m²"), bấm X xóa được.
* **And** giữ trên URL như các bộ lọc khác (mở lại / chia sẻ link giữ bộ lọc).
* **And** áp dụng cho cả chế độ Danh sách và Bản đồ (ghim bản đồ dùng cùng `FilterBuilder`).

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend
* **`backend/src/modules/search/search.controller.ts`**: đọc `minArea`, `maxArea`.
* **`backend/src/modules/search/filter.builder.ts`**: thêm điều kiện `'attributes.area'`; comment tiếng Việt về nửa mở + loại căn thiếu diện tích.
* Kiểm tra `map-pins.service.ts` nhận cùng tham số.

### Frontend
* **`frontend/src/hooks/useApartmentSearch.ts`**: state + params `minArea`, `maxArea` (+ đồng bộ URL).
* **`frontend/src/components/apartment/FilterSheet.tsx`**: mục Diện tích (tách `AreaFilterSection.tsx` nếu file > 200 dòng).
* **`frontend/src/components/apartment/filterChips.ts`**: chip diện tích.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] `backend/tests/core-rules.test.ts` thêm ca `FilterBuilder` cho diện tích: chỉ min, chỉ max, cả hai, biên 50 m².
* [ ] `npm test`, `npm run build` backend + frontend đạt.
* [ ] Thử thật: lọc 30–50 m² ở Danh sách và Bản đồ cho cùng kết quả; chip xóa được.
* [ ] File ≤ 300 dòng, không `console.log`.
