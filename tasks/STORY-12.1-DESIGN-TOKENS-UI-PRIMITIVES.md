# STORY 12.1: Bộ Design Tokens & thành phần giao diện dùng chung (Epic 12)

**Bối cảnh:** `docs/stories/EPIC_12_UI_UX_DESIGN_SYSTEM_AND_STANDARDIZATION.md` Story 12.1.

Hiện trạng (đếm trong `frontend/src`, ngày 19/11/2026):
- **Màu đã có:**
  - `tailwind.config.js` đã có `brand.navy`, `brand.navy-soft`, `brand.gold`, `brand.gold-light` và bảng `primary` (indigo).
  - Nhưng code vẫn viết tay `indigo-*` 108 chỗ, `brand-navy` 17 chỗ.
- **Bo góc viết tự do:** `rounded-lg` 42 chỗ, `rounded-xl` 131 chỗ, `rounded-2xl` 28 chỗ.
- **Chưa có thư mục `components/ui/`:** mỗi modal tự viết nút và ô nhập.
- **Màu trạng thái lệch nhau:**

  | Nơi hiển thị | Sắp trống | Đã cọc |
  |---|---|---|
  | Thẻ căn (`STATUS_DISPLAY`) | cam | xanh da trời |
  | Bản đồ | cam | — |
  | `StatusBadge` (chi tiết căn) | xanh da trời ❌ | cam ❌ |

  Epic chốt: Trống = xanh lá, Sắp trống = cam, Đã cọc = xanh da trời, Đã thuê = xám.

## User Story
Là **người dùng và người phát triển**, tôi muốn toàn bộ app dùng một bộ màu, cỡ chữ, bo góc và các thành phần chung (`Button`, `Badge`, `Input`, `Select`, `Textarea`, `Card`),
để giao diện nhất quán từ trang Quản lý tới trang khách, và sửa một chỗ là đổi được cả app.

## Tiền điều kiện
- Không cần cấu hình, không thư viện mới. Dùng Tailwind và `lucide-react` có sẵn.

## Phạm vi đã chốt (cần bạn xác nhận)
- **Chuyển đổi dần, không sửa toàn bộ app trong 1 story.** Story này tạo token và thành phần dùng chung, rồi áp dụng cho các màn dùng nhiều nhất:
  Bảng hàng, thẻ căn, chi tiết căn, form Thêm/Sửa căn, Bộ lọc, Khách hàng.
  Các màn còn lại (Duyệt tin, Hồ sơ, Đăng nhập…) đổi dần khi có story chạm tới.
  Sửa cả 200+ chỗ một lúc có rủi ro hỏng giao diện rất cao.
- **Không dùng emoji làm biểu tượng** (theo checklist `ui-ux-pro-max`). Các chỗ Epic ghi 📷 🎥 🌊 📤 📞 📋 🔄 sẽ dùng icon `lucide-react` tương ứng.

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Bảng màu theo vai trò (`tailwind.config.js`)**
- `brand.navy` `#0f2a45`: header, tiêu đề lớn, chữ cấp 1.
- `brand.accent` `#4f46e5` (indigo): nút chính, tab đang chọn, viền focus. Giữ bảng `primary` cũ làm tên phụ để code cũ không vỡ.
- `brand.gold` `#d4a94f`: điểm nhấn cao cấp, **chỉ dùng trên nền navy**. Vàng trên nền trắng không đủ tương phản (giữ quy tắc đã ghi trong config).
- `surface.0/1/2` = `#ffffff` / `#f8fafc` / `#f1f5f9`.
- `status.available/upcoming/deposited/rented`: mỗi trạng thái có 3 sắc độ (nền nhạt, viền, chữ đậm), chữ trên nền đạt tương phản ≥ 4.5:1.
- `utils/statusStyle.ts` là **nguồn duy nhất** cho nhãn và màu trạng thái. Thẻ căn, `StatusBadge`, bản đồ và bộ lọc đều đọc từ đây.
  Sửa luôn chỗ `StatusBadge` đang hiện ngược màu Sắp trống / Đã cọc.

**AC2 — Thành phần dùng chung `frontend/src/components/ui/`**
- **`Button`:**
  - `variant`: `primary | secondary | outline | ghost | danger`.
  - `size`: `sm | md | lg` (cao 36 / 44 / 48px; trên điện thoại cỡ `sm` vẫn có vùng bấm 44px).
  - Có `loading` (hiện vòng quay, tự khoá nút) và `icon`.
  - Nhấn thì co nhẹ ngay lúc chạm (100ms); tắt hiệu ứng khi người dùng bật "giảm chuyển động".
- **`Badge`:** `tone` theo màu (navy / accent / gold / status / neutral) và `variant`: `solid | soft` (soft = nền nhạt, viền mảnh, chữ đậm).
- **`Input`, `Select`, `Textarea`:**
  - Cao 44px, `rounded-xl`, viền `slate-200`, focus `ring-2 ring-brand-accent/20`.
  - Chữ 16px trên điện thoại để iPhone không tự phóng to.
  - Nhận `label`, `error` (chữ đỏ ngay dưới ô, có `aria-invalid` / `aria-describedby`) và `hint`.
- **`Card`:** nền trắng, `rounded-2xl`, viền `slate-200`, đệm chuẩn.
- Mỗi thành phần là 1 file nhỏ (< 80 dòng). Không có class / context thừa; nhận `className` để mở rộng.

**AC3 — Bo góc & khoảng cách**
- Bo góc: thẻ căn và hộp thoại `rounded-2xl`; nút và ô nhập `rounded-xl`; chip lọc `rounded-full`.
- Khoảng cách theo bước 4px (Tailwind mặc định). Các màn đã chuyển đổi không còn `rounded-lg` lẻ.

**AC4 — Áp dụng cho các màn chính**
- Bảng hàng, thẻ căn, chi tiết căn, form căn, Bộ lọc, Khách hàng dùng `Button` / `Input` / `Badge` / `Card`.
- So ảnh chụp trước / sau ở khung 390px: không vỡ bố cục, không tràn ngang.

## Phạm vi kỹ thuật
| File | Thay đổi |
|---|---|
| `frontend/tailwind.config.js` | Thêm `brand.accent`, `surface.*`, `status.*`; giữ màu cũ |
| `frontend/src/components/ui/Button.tsx`, `Badge.tsx`, `Input.tsx`, `Select.tsx`, `Textarea.tsx`, `Card.tsx` (mới) | Thành phần dùng chung |
| `frontend/src/utils/statusStyle.ts` (mới) | Nhãn + lớp màu cho 4 trạng thái |
| `components/apartment/ApartmentCard.tsx`, `StatusBadge.tsx`, `map/ApartmentMap.tsx`, `FilterSheet.tsx` | Dùng `statusStyle`; sửa màu ngược |
| `components/apartment/formFields.tsx` | `inputClass` / `Field` chuyển sang dùng `Input` (form căn đổi theo) |
| `pages/ApartmentsPage.tsx`, `ApartmentDetailModal.tsx`, `ApartmentModal.tsx`, `pages/LeadsPage.tsx`, `components/leads/*` | Thay nút / ô nhập viết tay bằng thành phần dùng chung |

## Rủi ro
- Đổi giao diện trên nhiều màn cùng lúc dễ lệch bố cục. Cách giảm rủi ro: chụp ảnh 390px trước và sau cho từng màn, đối chiếu từng cặp.

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] Build không lỗi.
- [ ] Puppeteer 390px trên bản local, các màn đã chuyển đổi:
  - Không tràn ngang; ô nhập ≥ 16px; nút ≥ 44px.
  - Màu trạng thái giống nhau ở thẻ căn, `StatusBadge` và bản đồ.
- [ ] Đo tương phản các cặp chữ / nền của `status.*` và `Button` ≥ 4.5:1 (script tính theo công thức WCAG).
- [ ] Ảnh trước / sau cho bạn xem.
- [ ] Báo cáo, đề xuất commit `feat(ui): design tokens and shared UI primitives (Story 12.1)` chờ duyệt.
