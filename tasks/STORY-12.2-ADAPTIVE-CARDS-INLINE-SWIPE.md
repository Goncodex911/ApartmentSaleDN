# STORY 12.2: Thẻ căn 2 chế độ & lướt ảnh ngay trên danh sách (Epic 12)

**Bối cảnh:** `docs/stories/EPIC_12_UI_UX_DESIGN_SYSTEM_AND_STANDARDIZATION.md` Story 12.2. Làm sau Story 12.1 (dùng `Badge`, `statusStyle`).

Hiện tại:
- `ApartmentCard` chỉ có dạng danh sách: ảnh 96px bên trái, nút gửi khách thu gọn.
- Đầu trang Bảng hàng đã có nút **Lộ trình** và nút gạt **Danh sách | Bản đồ** (Story 11.2, nhớ bằng `sessionStorage`).
- Thẻ đang dùng chung cho chế độ chọn căn (lộ trình / so sánh) và nhãn real-time (VỪA CỌC, Story 11.4).
- Trang khách đã có `PhotoSlider` vuốt ảnh bằng CSS `scroll-snap`, không dùng thư viện.

## User Story
Là **CTV** đang lướt bảng hàng, tôi muốn vuốt xem 3–5 ảnh của căn ngay trên danh sách và chuyển được giữa "Thẻ ảnh lớn" với "Danh sách gọn",
để đánh giá nội thất trong 1 giây mà không phải mở từng căn.

## Tiền điều kiện
- Story 12.1 đã xong. Không cần cấu hình, không thư viện mới: vuốt ảnh dùng CSS `scroll-snap` giống `PhotoSlider`.

## Phạm vi đã chốt (cần bạn xác nhận)
- **Gộp nút gạt:** đầu trang chỉ có **1 nhóm 3 lựa chọn** `Thẻ ảnh | Danh sách | Bản đồ` (icon `LayoutGrid`, `List`, `Map`), không thêm nút thứ 4,
  để hàng đầu không chật trên màn 390px.
  Lựa chọn lưu vào `localStorage`, khác với hiện tại đang lưu `sessionStorage`.
- **Mặc định là "Thẻ ảnh"** cho người mới; ai đã chọn thì giữ theo lựa chọn cũ.

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Nút gạt 3 chế độ**
- Given đang ở Bảng hàng
- When bấm `Thẻ ảnh` / `Danh sách` / `Bản đồ`
- Then đổi cách hiển thị tức thì, giữ nguyên bộ lọc và trang đang xem. Lựa chọn còn nguyên sau khi tải lại app.
- Mỗi nút có `aria-label`, `aria-pressed`, vùng bấm ≥ 44px.

**AC2 — Thẻ ảnh lớn**
- Khung ảnh tỉ lệ 4:3, rộng hết thẻ.
  - Trên điện thoại 1 cột; máy tính bảng / máy tính 2–3 cột.
  - Khung có kích thước cố định ngay từ đầu nên không bị giật bố cục khi ảnh tải xong.
- **Vuốt ảnh ngay trên thẻ:**
  - Vuốt ngang qua tối đa 5 ảnh (bỏ ảnh có SĐT nguồn cũ, bỏ video).
  - Chấm tròn chỉ trang ở dưới ảnh.
  - Chỉ ảnh đầu tải ngay; các ảnh sau tải khi vuốt tới (`loading="lazy"`). Ảnh dùng bản Cloudinary đã thu nhỏ (`c_fill,w_640,q_auto,f_auto`) để tiết kiệm 4G.
  - Vuốt ngang không mở chi tiết căn; chạm (không vuốt) mới mở.
- **Huy hiệu số ảnh / video:** góc dưới ảnh có nhãn nền đen mờ, dùng icon `Camera` / `Video` (không dùng emoji), VD "8 · 1".
- **Dòng thông số:**
  - Giá to, đậm, màu navy (`12.000.000đ/tháng`; căn chỉ có giá USD thì `$500/tháng`).
  - Ngay dưới là các nhãn nhỏ: số phòng ngủ · số WC · diện tích · khoảng cách biển (icon `Waves`).
- Nhãn trạng thái (`Badge`), nhãn real-time "VỪA CỌC" và chế độ chọn căn (ô tích) vẫn chạy đúng trên thẻ ảnh.

**AC3 — Nút hành động 1 chạm trên thẻ**
- Góc phải dưới vùng nội dung có 2 nút:
  - **Copy tin** (`CopyShareButton` có sẵn).
  - **Tạo link khách** (`ShareLinkButton` có sẵn, dạng icon).
- Bấm thì rung nhẹ (`tapFeedback` có sẵn) và không mở chi tiết căn.
- Mỗi nút có `aria-label`, vùng bấm ≥ 44px.

**AC4 — Danh sách gọn**
- Giữ bố cục hiện tại; chỉ đổi sang token / thành phần của Story 12.1.

## Phạm vi kỹ thuật
| File | Thay đổi |
|---|---|
| `components/apartment/ApartmentCard.tsx` | Nhận `layout: 'card' \| 'list'`. Tách phần ảnh ra `CardPhotoCarousel` để file < 250 dòng |
| `components/apartment/CardPhotoCarousel.tsx` (mới) | Vuốt ảnh `scroll-snap` + chấm trang + huy hiệu số ảnh / video. Phân biệt chạm với vuốt |
| `utils/cloudinaryImage.ts` | Thêm `cardSizeUrl(url)` (ảnh thẻ cỡ 640px) |
| `pages/ApartmentsPage.tsx` | Nhóm nút gạt 3 chế độ lưu `localStorage`; lưới 1 / 2 / 3 cột cho thẻ ảnh |
| `components/apartment/ShareLinkButton.tsx` | Thêm dạng `compact` (chỉ icon) cho thẻ |

## Rủi ro
- **Tốn 4G hơn:** mỗi thẻ ảnh lớn tải 1 ảnh khoảng 640px thay vì ảnh 96px. Đã giảm bằng ảnh Cloudinary thu nhỏ và chỉ tải ảnh sau khi vuốt tới.
  Ai cần tiết kiệm dữ liệu thì chuyển sang "Danh sách gọn".
- **Cuộn trang ít thẻ hơn:** mỗi màn chỉ thấy khoảng 1,5 thẻ. Đây là đánh đổi có chủ đích; "Danh sách gọn" vẫn còn cho ai cần xem nhiều căn.

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] Puppeteer 390px (giả lập chạm):
  - Đổi 3 chế độ, tải lại vẫn giữ lựa chọn.
  - Vuốt ảnh trên thẻ: chấm trang đổi, chi tiết căn không mở; chạm thì mở chi tiết.
  - Ảnh thứ 2 chỉ tải khi vuốt tới (đếm request).
  - Không tràn ngang; độ giật bố cục (CLS) ≤ 0,05 khi tải danh sách.
- [ ] Chế độ chọn căn, nhãn "VỪA CỌC", nút Copy tin / Tạo link chạy đúng trên thẻ ảnh.
- [ ] Build không lỗi. Báo cáo, đề xuất commit `feat(ui): visual listing cards with inline photo swipe (Story 12.2)` chờ duyệt.
