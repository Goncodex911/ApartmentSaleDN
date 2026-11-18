# STORY 10.1: Sửa lỗi hiển thị trên iPhone — thanh trạng thái, phóng to, đóng thông báo (Epic 10)

**Bối cảnh:** `docs/stories/EPIC_10_MOBILE_FEEDBACK_POLISH.md` mục A, B, C, D.

## User Story
Là **CTV / Quản lý dùng iPhone**, tôi muốn mọi màn hình nằm gọn dưới thanh trạng thái, vừa khít chiều ngang và đóng được mọi khung,
để bấm được nút Sửa / Xóa / Đóng và không bị phóng to lệch màn hình.

## Tiền điều kiện
- Epic 9 đã deploy (PWA, `viewport-fit=cover`, `apple-mobile-web-app-status-bar-style = black-translucent`).

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Không còn bị thanh trạng thái che**
- Given app mở từ màn hình chính iPhone (và Safari thường)
- Then thanh trên, chi tiết căn (nút Đóng / Sửa / Xóa), form Thêm / Sửa căn, Đăng tin, Nhập nhanh, khung thông báo, thanh "ngoại tuyến / bản mới"
  đều nằm **dưới** đồng hồ / pin / tai thỏ.
- Cách làm: đổi `apple-mobile-web-app-status-bar-style` sang **`default`** (iOS tự đặt nội dung bên dưới thanh trạng thái),
  đồng thời các lớp toàn màn hình vẫn đệm `env(safe-area-inset-top)` để an toàn với máy xoay ngang / Android.

**AC2 — Không bị phóng to, không tràn ngang**
- Mọi ô nhập / ô chọn / textarea trên điện thoại có chữ **≥ 16px** (Nhập nhanh hiện là 12px — nguyên nhân chính).
- Ở 390px, mọi màn (Bảng hàng, chi tiết, form, Nhập nhanh, Khách hàng, Tin đăng, Hồ sơ, Bộ lọc, Đăng nhập) **không tràn ngang**.

**AC3 — Đóng được khung thông báo**
- Khung thông báo có nút **X** (44px); chạm ra ngoài hoặc bấm Esc → đóng; trên điện thoại dạng bảng trượt từ trên, nằm dưới thanh trạng thái.

**AC4 — Khung link xem phòng đóng được**
- Ở chi tiết căn, bấm **Tạo link / Lượt xem** mở khung link; bấm lại nút hoặc nút **X** trong khung → đóng; nút Đóng chi tiết căn luôn bấm được.

## Phạm vi kỹ thuật
| File | Thay đổi |
|---|---|
| `frontend/index.html` | `apple-mobile-web-app-status-bar-style` = `default` |
| `frontend/src/index.css` | Lớp `pt-safe` (= `env(safe-area-inset-top)`) dùng chung |
| `ApartmentDetailModal.tsx`, `ApartmentModal.tsx`, `QuickPasteModal.tsx`, `PendingUsersModal.tsx`, `ProfileModal.tsx`, `LeadDetailModal.tsx` | Phần đầu lớp toàn màn hình dùng `pt-safe` |
| `components/layout/NotificationBell.tsx` | Nút X, chạm ra ngoài / Esc để đóng, vị trí dưới thanh trên |
| `components/apartment/ShareLinkButton.tsx` | Bấm lại để đóng khung + nút X |
| `QuickPasteModal.tsx` và mọi ô còn chữ < 16px | `text-base sm:text-sm` |

Không đổi backend.

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] Script Puppeteer 390px quét **mọi màn / hộp thoại**: không ô nhập nào chữ < 16px, không màn nào tràn ngang, nút ≥ 44px.
- [ ] Giả lập vùng an toàn trên 47px (iPhone có tai thỏ): nút Đóng / Sửa / Xóa / X thông báo nằm dưới 47px và bấm được.
- [ ] Khung thông báo: X, chạm ra ngoài, Esc đều đóng. Khung link: bấm lại / X đều đóng.
- [ ] Sau deploy: kiểm tra lại trên iPhone thật đúng 5 ảnh phản hồi.
- [ ] Báo cáo, đề xuất commit `fix(mobile): iOS status bar overlap, input zoom and closable panels (Story 10.1)` chờ duyệt.
