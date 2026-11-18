# STORY 10.5: Làm đẹp trang đăng nhập & hộp Nhập nhanh trên điện thoại (Epic 10)

**Bối cảnh:** `docs/stories/EPIC_10_MOBILE_FEEDBACK_POLISH.md` mục G. Trang đăng nhập vẫn là giao diện cũ "RoomMaster Portal" màu tím;
hộp Nhập nhanh là hộp nổi nhỏ, chữ 12px, nút bị tràn ngoài màn hình điện thoại.
Áp dụng skill `/apple-design` (chuyển động, bảng trượt, chữ) và checklist `/ui-ux-pro-max`.

## User Story
Là **CTV / Quản lý**, tôi muốn trang đăng nhập và hộp Nhập nhanh đẹp, rõ ràng, dễ bấm trên điện thoại,
để dùng app thấy chuyên nghiệp và nhập tin nhanh.

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Trang đăng nhập theo nhận diện ApartmentDN**
- Nửa trên: nền navy `#0f2a45` có logo biểu tượng "DN" (icon đã xuất ở Story 9.1), tên **ApartmentDN**, câu giới thiệu ngắn
  ("Kho căn hộ cho thuê Đà Nẵng cho CTV & Quản lý").
- Thẻ đăng nhập trắng bo góc phủ lên nền navy; tab Đăng nhập / Đăng ký; nút chính màu navy, điểm nhấn vàng `#d4a94f` (lấy từ logo).
- Giữ: ô nhập ≥ 16px, vùng bấm ≥ 44px, hiện / ẩn mật khẩu, thông báo lỗi; nằm dưới thanh trạng thái (10.1); không bị huy hiệu Netlify che nút.
- Hiệu ứng nhẹ khi đổi tab (≤ 200ms), tắt khi người dùng bật "giảm chuyển động". Không dùng emoji làm icon.

**AC2 — Hộp Nhập nhanh chuẩn điện thoại**
- Điện thoại: **toàn màn hình** như form Thêm căn — thanh đầu (Đóng + tiêu đề), ô dán tin cao gần hết màn hình, chữ 16px, **nút Phân tích & Lưu ghim đáy** (luôn thấy khi bàn phím mở).
- Máy tính: giữ hộp nổi giữa màn hình.
- Có nút **Dán** (đọc clipboard nếu trình duyệt cho phép) để CTV không phải nhấn giữ; đang phân tích → nút khóa + vòng xoay; kết quả / lỗi hiện rõ.

## Phạm vi kỹ thuật
| File | Thay đổi |
|---|---|
| `frontend/src/pages/LoginPage.tsx` | Bố cục mới (tách phần thương hiệu thành component nhỏ nếu file > 250 dòng) |
| `frontend/src/components/apartment/QuickPasteModal.tsx` | Bố cục toàn màn hình trên điện thoại, nút ghim đáy, nút Dán |
| `frontend/tailwind.config.*` | Màu `brand.navy` `#0f2a45`, `brand.gold` `#d4a94f` |

Không đổi backend, không thêm thư viện.

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] Chụp 390px & 1280px: trang đăng nhập (2 tab, có lỗi), hộp Nhập nhanh (trống, đang phân tích, lỗi).
- [ ] Đo: chữ ô nhập ≥ 16px, nút ≥ 44px, không tràn ngang; nút Phân tích luôn trong màn hình khi giả lập bàn phím (chiều cao 500px).
- [ ] Tương phản chữ ≥ 4.5:1 trên nền navy.
- [ ] Báo cáo, đề xuất commit `feat(ui): ApartmentDN login page and mobile-first quick paste (Story 10.5)` chờ duyệt.
