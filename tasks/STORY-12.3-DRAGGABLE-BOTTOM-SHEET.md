# STORY 12.3: Bảng trượt kéo được, vuốt xuống để đóng (Epic 12)

**Bối cảnh:** `docs/stories/EPIC_12_UI_UX_DESIGN_SYSTEM_AND_STANDARDIZATION.md` Story 12.3.

Hiện tại:
- `components/layout/BottomSheet.tsx` (11 dòng) là khung cố định: không có thanh kéo, không vuốt để đóng, không có nấc dừng.
- Đang dùng ở: menu Tài khoản (`AppShell`), `LeaseFormSheet`, `MapQuickCard`, `ReviewDialogs`.
- Các bảng trượt tự viết riêng, không dùng `BottomSheet`: `FilterSheet`, `LeadDetailModal`, `LeadFormModal`, `MatchShareModal`.

## User Story
Là **người dùng điện thoại**, tôi muốn bảng trượt từ đáy lên có thanh kéo, kéo theo đúng ngón tay, vuốt xuống là đóng, và mở rộng được lên gần toàn màn hình,
để thao tác bằng ngón cái tự nhiên như ứng dụng iOS / Android.

## Tiền điều kiện
- Story 12.1 đã xong. Không cần cấu hình.
- **Cần bạn chọn cách làm:**
  - **Cách A (đề xuất, không thêm thư viện):** tự viết bằng Pointer Events + CSS `transform`, kèm hàm lò xo nhỏ (khoảng 120 dòng).
    Áp dụng các nguyên tắc của `/apple-design`: kéo bám theo ngón tay 1:1 (giữ đúng điểm chạm ban đầu), thả tay thì giữ quán tính của cú vuốt, và có thể chụp lại bảng giữa chừng khi nó đang chạy.
  - **Cách B:** dùng thư viện `vaul` (khoảng 15KB nén), có sẵn kéo / vuốt / nấc dừng nhưng thêm 1 phụ thuộc.

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Thanh kéo**
- Đỉnh bảng có thanh kéo bo tròn 40×6px màu `slate-300`.
- Vùng bắt kéo gồm thanh kéo + tiêu đề, cao ≥ 32px.

**AC2 — Kéo bám tay & vuốt xuống để đóng**
- Given bảng đang mở
- When kéo thanh kéo / tiêu đề xuống
- Then bảng đi theo ngón tay 1:1.
  - Kéo lên quá nấc cao nhất thì bảng chỉ nhích chậm lại dần (cảm giác "dây chun"), không dừng cứng.
- When thả tay:
  - Kéo xuống quá 30% chiều cao bảng **hoặc** vuốt nhanh xuống (≥ 0,5px/ms) → bảng trượt xuống và đóng.
  - Chưa đủ ngưỡng → bảng bật về nấc gần nhất theo hướng vuốt, chuyển động lò xo, không nảy quá đà.
- **Nội dung cuộn được bên trong:** kéo trong vùng nội dung chỉ để cuộn. Chỉ khi nội dung đã ở đầu mà vẫn kéo xuống thì mới chuyển sang kéo bảng.
- Bấm phím Esc hoặc chạm nền mờ vẫn đóng như hiện tại. Nút X (nếu có) vẫn giữ.

**AC3 — Nấc dừng**
- `snapPoints` mặc định `[0.5, 0.9]` (50% và 90% chiều cao màn hình); mỗi chỗ dùng có thể đặt riêng.
  - Thẻ xem nhanh bản đồ, menu Tài khoản: tự vừa nội dung, không có nấc.
  - Bộ lọc: mở ở 90%.
- Kéo thanh kéo lên → mở nấc cao hơn. Vuốt nhanh thì nhảy theo hướng vuốt.

**AC4 — Nền mờ & vùng an toàn**
- Nền `bg-black/40 backdrop-blur-sm`, độ đậm đổi theo độ mở của bảng.
- Đệm đáy tính cả `env(safe-area-inset-bottom)` và huy hiệu Netlify (`pb-badge-safe` hiện có).
- Bật "giảm chuyển động": bỏ hiệu ứng trượt / lò xo, chỉ mờ dần vào và ra.
- Trên máy tính (≥ 640px): giữ hộp thoại giữa màn hình, không kéo.
- Trợ năng: `role="dialog"`, `aria-modal`, đưa con trỏ bàn phím vào bảng khi mở, trả lại chỗ cũ khi đóng.

**AC5 — Chuyển các bảng trượt sang dùng chung**
- `FilterSheet`, `LeadDetailModal`, `LeadFormModal`, `MatchShareModal` chuyển sang dùng `BottomSheet` mới.
- Các chỗ đang dùng sẵn (`AppShell`, `LeaseFormSheet`, `MapQuickCard`, `ReviewDialogs`) tự có cử chỉ kéo / vuốt.

## Phạm vi kỹ thuật
| File | Thay đổi |
|---|---|
| `components/layout/BottomSheet.tsx` | Viết lại: thanh kéo, kéo / vuốt, nấc dừng, nền mờ theo độ mở, trợ năng. Giữ nguyên props cũ (`title`, `onClose`, `children`) và thêm `snapPoints` |
| `frontend/src/hooks/useSheetDrag.ts` (mới, Cách A) | Pointer Events + đo vận tốc + tính điểm dừng dự kiến + lò xo bằng `requestAnimationFrame` |
| `FilterSheet.tsx`, `leads/LeadDetailModal.tsx`, `leads/LeadFormModal.tsx`, `leads/MatchShareModal.tsx` | Dùng `BottomSheet` |

## Rủi ro
- **Kéo bảng trùng với cuộn nội dung** dễ gây cảm giác "kẹt". Đã xử lý ở AC2 (chỉ kéo bảng khi nội dung đã cuộn lên đầu). Cần thử trên iPhone thật.
- **Đổi 4 bảng trượt đang chạy** có thể ảnh hưởng form Khách hàng và Bộ lọc. Chạy lại toàn bộ test UI của Epic 9–11.

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] Puppeteer 390px giả lập chạm:
  - Kéo xuống 40% → đóng; kéo xuống 10% → bật về.
  - Vuốt nhanh 15% → đóng.
  - Kéo lên → nấc 90%.
  - Cuộn danh sách bên trong Bộ lọc không làm bảng trượt.
- [ ] Bật "giảm chuyển động" → không còn hiệu ứng trượt.
- [ ] Test UI cũ (bộ lọc, khách hàng, bản đồ, hợp đồng) vẫn đạt.
- [ ] Bạn thử trên iPhone thật: kéo mượt, không kẹt khi cuộn.
- [ ] Build không lỗi. Báo cáo, đề xuất commit `feat(ui): draggable bottom sheet with snap points and swipe to dismiss (Story 12.3)` chờ duyệt.
