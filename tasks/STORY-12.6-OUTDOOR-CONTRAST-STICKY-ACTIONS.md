# STORY 12.6: Tương phản cao khi dùng ngoài trời & thanh hành động ghim đáy (Epic 12)

**Bối cảnh:** `docs/stories/EPIC_12_UI_UX_DESIGN_SYSTEM_AND_STANDARDIZATION.md` Story 12.6. Làm cuối Epic, sau khi các màn đã dùng token của Story 12.1.

Hiện tại:
- **Chữ xám nhạt:**
  - `text-slate-400` dùng làm **chữ** khoảng 27 chỗ (không tính icon và chữ gợi ý trong ô nhập). Trên nền trắng chỉ đạt tương phản 2,6:1, dưới chuẩn 4,5:1.
  - `text-slate-500` (4,8:1 trên nền trắng) xuống còn khoảng 4,5:1 trên nền `slate-50`, sát ngưỡng.
- **Chi tiết căn (`ApartmentDetailModal`)** đã có thanh đáy cố định:
  - Nút chọn ngôn ngữ VI / EN.
  - 3 nút ngang nhau: Copy tin · Tải ảnh · Tạo link. Nút Tải ảnh là theo phản hồi của khách ở Epic 10.
- **Trang khách `/p/:slug`:**
  - Đã có thanh liên hệ ghim đáy (`CtvContactBar`): Gọi ngay (xanh lá) · Chat Zalo (xanh dương), nút cao khoảng 40px.
  - Nút chat AI "Hỏi ngay" đè lên phần nội dung phía trên.

## User Story
Là **CTV đứng ngoài nắng** hoặc đang vội gửi căn cho khách, tôi muốn chữ, giá và nút bấm đủ tương phản để đọc trong 0,5 giây,
và nút hành động chính luôn nằm dưới ngón cái.

## Tiền điều kiện
- Story 12.1 đã xong. Không cần cấu hình, không thư viện mới.

## Phạm vi đã chốt (cần bạn xác nhận)
- **Thanh đáy chi tiết căn (app):**
  - Hàng chính: **Gửi khách** (chiếm 60%; soạn bài 10 dòng + ảnh rồi mở bảng chia sẻ của điện thoại, như nút Copy tin hiện tại) và **Tạo link** (40%).
  - **Tải ảnh** chuyển thành nút icon cạnh nút VI / EN, **không bỏ** (khách đã yêu cầu ở Epic 10).
  - Quản lý có thêm nút icon **Gọi chủ nhà**. CTV không có, vì CTV chỉ thấy SĐT đã che.
- **Trang khách:** **Chat Zalo** là nút chính (60%), **Gọi** là nút phụ (40%). Nút "Hỏi ngay" nằm phía trên thanh, không đè nội dung.

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Tương phản WCAG 2.1 AA**
- Giá, số phòng ngủ, khoảng cách biển, trạng thái và các chữ thông tin chính: tương phản ≥ 4,5:1 so với nền.
- Chữ phụ (thời gian, ghi chú, chú thích): bỏ `text-slate-400`, tối thiểu dùng `text-slate-600`.
  - Chữ gợi ý trong ô nhập (placeholder) và icon trang trí giữ màu nhạt.
- Nhãn trạng thái: chữ đậm trên nền nhạt và có viền (`Badge soft` của Story 12.1).
- Nút tắt (`disabled`) vẫn đọc được (tương phản ≥ 3:1), không chỉ làm mờ đi.
- Kiểm bằng script: quét các màn chính ở khung 390px, tính tỉ lệ tương phản của mọi đoạn chữ hiển thị; báo những chỗ dưới ngưỡng.

**AC2 — Thanh hành động ghim đáy (chi tiết căn trong app)**
- Thanh kính mờ: `bg-white/95 backdrop-blur-md border-t border-slate-200`, ghim đáy khung chi tiết.
- Bố cục theo "Phạm vi đã chốt" ở trên.
- Mọi nút cao ≥ 48px; đệm đáy theo `env(safe-area-inset-bottom)` và huy hiệu Netlify.
- Icon `lucide` (`Send`, `Link2`, `Download`, `Phone`), không dùng emoji.

**AC3 — Thanh liên hệ trang khách (`CtvContactBar`)**
- Cùng kiểu kính mờ.
- Bố cục theo "Phạm vi đã chốt" ở trên; nút cao 48px.
- Tên tư vấn viên rõ hơn: dòng "Tư vấn viên" đổi từ `slate-400` sang `slate-600`.
- Nút chat AI không đè thanh và không che nội dung cuối trang (thêm đệm đáy cho trang).

## Phạm vi kỹ thuật
| File | Thay đổi |
|---|---|
| Các file dùng `text-slate-400` làm chữ (khoảng 27 chỗ) | Đổi sang `text-slate-600`; `text-slate-500` trên nền `slate-50` đổi sang `slate-600` |
| `components/apartment/ApartmentDetailModal.tsx` | Thanh đáy mới (tách thành `DetailActionBar.tsx` để file < 250 dòng) |
| `components/apartment/CopyShareButton.tsx`, `ShareLinkButton.tsx`, `DownloadPhotosButton.tsx` | Thêm biến thể `primary` / `icon` để đặt vào thanh |
| `components/public/CtvContactBar.tsx`, `ChatWidget.tsx`, `pages/PublicListingPage.tsx` | Thanh kính mờ, nút chính / phụ, vị trí nút chat, đệm đáy |
| Script kiểm tương phản trong thư mục thử (`scratchpad`) | Không đưa vào repo |

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] Script tương phản: 0 đoạn chữ dưới 4,5:1 ở Bảng hàng, chi tiết căn, Khách hàng, trang khách. Chữ lớn (≥ 18px đậm) cho phép ≥ 3:1.
- [ ] Puppeteer 390px:
  - Thanh đáy chi tiết căn và trang khách có nút ≥ 48px, không che nội dung cuối.
  - Nút chat không đè thanh.
  - Gửi khách / Tạo link / Tải ảnh vẫn chạy như Epic 10.
- [ ] Bạn xem thử ngoài trời trên điện thoại thật.
- [ ] Build không lỗi. Báo cáo, đề xuất commit `feat(ui): outdoor high-contrast text and sticky action bars (Story 12.6)` chờ duyệt.
