# STORY 12.5: Khung chờ đúng hình thẻ & màn hình trống chuẩn (Epic 12)

**Bối cảnh:** `docs/stories/EPIC_12_UI_UX_DESIGN_SYSTEM_AND_STANDARDIZATION.md` Story 12.5. Làm sau Story 12.2 (khung chờ phải giống cả thẻ ảnh lớn lẫn danh sách gọn).

Hiện tại:
- **Bảng hàng:**
  - Khi tải: 4 khối xám nhấp nháy cao 120px, không giống hình thẻ.
  - Khi trống: chỉ có 2 dòng chữ "Không có căn phù hợp", **không có nút Xóa bộ lọc**. Bản đồ thì đã có nút này.
- **Vòng quay (spinner) khi tải nội dung:** còn ở `MatchShareModal`, `CompareSheet`, `TourPlanSheet`, `PendingUsersModal`.
  Vòng quay nhỏ trong nút bấm (đang lưu…) thì giữ nguyên.
- **Khách hàng, Tin đăng:** đã có màn trống nhưng mỗi trang một kiểu.

## User Story
Là **người dùng trên 4G chập chờn**, tôi muốn thấy khung chờ đúng hình thẻ căn trong lúc tải, và khi không có kết quả thì biết nên làm gì tiếp,
để bớt cảm giác chờ và tìm được phòng nhanh hơn.

## Tiền điều kiện
- Story 12.1 và 12.2 đã xong. Không cần cấu hình, không thư viện mới.

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Khung chờ đúng hình thẻ**
- Given Bảng hàng đang tải
- Then hiện 4 thẻ giả đúng hình chế độ đang chọn:
  - Thẻ ảnh lớn: khung ảnh 4:3, 2 dòng tiêu đề, dòng giá, cụm nhãn.
  - Danh sách gọn: ảnh vuông 96px và 3 dòng chữ.
- Hiệu ứng ánh sáng lướt qua nhẹ (shimmer). Bật "giảm chuyển động" thì đứng yên.
- Khung chờ có cùng kích thước với thẻ thật nên không giật bố cục khi dữ liệu về (CLS ≤ 0,05).
- `aria-busy="true"` và nhãn ẩn "Đang tải bảng hàng" cho trình đọc màn hình.
- Tải lại khi đã có danh sách (kéo để làm mới, sự kiện real-time): giữ danh sách cũ, không nhấp nháy về khung chờ.

**AC2 — Màn hình trống chuẩn (thành phần `EmptyState` dùng chung)**
- Gồm: icon minh hoạ (`lucide`: kính lúp + ngôi nhà, không dùng emoji), tiêu đề, dòng gợi ý, 1 nút hành động chính.
- **Bảng hàng có bộ lọc / từ khoá:**
  - Tiêu đề: "Không tìm thấy căn hộ phù hợp với bộ lọc hiện tại".
  - Gợi ý: "Hãy thử giảm bớt tiện ích hoặc mở rộng tầm giá / bán kính tìm kiếm".
  - Nút **Xóa tất cả bộ lọc** (icon `RotateCcw`): xoá cả bộ lọc lẫn từ khoá và tải lại ngay.
- **Bảng hàng trống thật (kho chưa có căn):** Quản lý thấy nút "Thêm căn", CTV thấy nút "Đăng tin".
- **Khách hàng, Tin đăng, Căn phù hợp (11.1):** dùng cùng `EmptyState`, giữ nội dung chữ hiện tại.

**AC3 — Bỏ vòng quay khi tải nội dung**
- `MatchShareModal`, `CompareSheet`, `TourPlanSheet`, `PendingUsersModal` hiện khung chờ đúng hình nội dung thay cho vòng quay.
- `TourPlanSheet` giữ dòng chữ "Đang lấy vị trí…" vì lấy GPS có thể mất vài giây.

## Phạm vi kỹ thuật
| File | Thay đổi |
|---|---|
| `frontend/src/components/ui/Skeleton.tsx` (mới) | Khối shimmer cơ bản + `ApartmentCardSkeleton` cho 2 chế độ |
| `frontend/src/components/ui/EmptyState.tsx` (mới) | Icon, tiêu đề, gợi ý, nút hành động |
| `frontend/src/index.css` | Hiệu ứng `shimmer`, tôn trọng `prefers-reduced-motion` |
| `pages/ApartmentsPage.tsx`, `hooks/useApartmentSearch.ts` | Khung chờ theo chế độ; trạng thái "đang làm mới" khác "đang tải lần đầu"; màn trống + Xóa tất cả bộ lọc |
| `pages/LeadsPage.tsx`, `pages/SubmissionsPage.tsx`, `leads/LeadMatchesSection.tsx` | Dùng `EmptyState` |
| `leads/MatchShareModal.tsx`, `tour/CompareSheet.tsx`, `tour/TourPlanSheet.tsx`, `layout/PendingUsersModal.tsx` | Khung chờ thay vòng quay |

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] Puppeteer 390px, mạng giả lập "4G chậm":
  - Khung chờ đúng hình 2 chế độ.
  - Đo CLS bằng `PerformanceObserver` ≤ 0,05.
  - Kéo làm mới không nhấp nháy.
- [ ] Lọc không ra kết quả → màn trống + nút Xóa tất cả bộ lọc → bấm thì danh sách hiện lại, chip lọc biến mất.
- [ ] Không còn vòng quay khi tải nội dung ở 4 hộp thoại trên.
- [ ] Build không lỗi. Báo cáo, đề xuất commit `feat(ui): card-shaped skeletons and standard empty states (Story 12.5)` chờ duyệt.
