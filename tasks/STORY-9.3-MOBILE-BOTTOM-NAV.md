# STORY 9.3: Menu đáy cho thao tác 1 tay & vùng an toàn iPhone (Epic 9)

**Bối cảnh:** `docs/stories/EPIC_09_PWA_MOBILE_APP.md` — Story 9.3, điều chỉnh theo quyết định của Project Owner:
- **Menu 5 nút** (thay vì 4 nút của epic) để giữ đủ Khách hàng và Tin đăng / Duyệt tin (Epic 8). "Lọc nhanh" đã có nút cạnh ô tìm kiếm → bỏ khỏi menu đáy.
- **Netlify gói Free:** huy hiệu "Powered by Netlify" là khung `iframe#nl-badge-frame` **197×64px ở góc dưới phải**, không tắt được
  và theo quy tắc dự án không ẩn bằng CSS → menu đáy đặt **phía trên** huy hiệu.

## User Story
Là **CTV vừa cầm điện thoại 1 tay vừa dẫn khách**, tôi muốn các nút chính nằm sát đáy màn hình trong tầm ngón cái,
để chuyển chức năng mà không phải với lên đỉnh màn hình.

## Tiền điều kiện
- Story 9.1 xong (`useCurrentUser`, `viewport-fit=cover` để có `env(safe-area-inset-bottom)`).
- Hiện 3 trang (Bảng hàng, Khách hàng, Tin đăng) mỗi trang tự lặp lại Navbar + tải người dùng + hộp Hồ sơ → gom vào 1 khung chung.

## Menu đáy (màn hình < 768px)
| Vị trí | Quản lý / Admin | CTV |
|---|---|---|
| 1 | Bảng hàng (`/apartments`) | Bảng hàng |
| 2 | Khách hàng (`/leads`) | Khách hàng |
| 3 (giữa, nổi bật) | **Nhập tin AI** — mở Nhập nhanh | **Đăng tin** — mở form đăng tin chờ duyệt |
| 4 | Duyệt tin (`/submissions`) + số tin chờ | Tin đăng (`/submissions`) |
| 5 | Tài khoản | Tài khoản |

"Tài khoản" mở bảng trượt đáy: tên + vai trò, mã CTV (bấm để copy), Hồ sơ, Duyệt tài khoản (Admin), Đăng xuất — cùng nội dung menu avatar hiện tại.

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Hiển thị**
- Given màn hình < 768px, đã đăng nhập
- Then có menu đáy 5 nút như bảng trên, **chỉ hiện icon** (Project Owner chốt), mỗi nút có `aria-label` + `title` đọc được tên; mục đang ở có màu `text-indigo-600` và vạch chỉ báo
- And thanh trên chỉ còn logo + chuông thông báo (các tab Bảng hàng / Khách hàng / Tin đăng và avatar chuyển xuống đáy).
- Given màn hình ≥ 768px → giữ thanh trên như hiện tại, không có menu đáy.

**AC2 — Kích thước & vùng an toàn**
- Menu cao ≥ 56px, mỗi nút rộng ≥ 64px và cao ≥ 44px.
- Menu nằm ngay **trên huy hiệu Netlify**: `bottom = 64px + env(safe-area-inset-bottom)`; không bị huy hiệu che, không đè thanh Home của iPhone.
- Nội dung trang có đệm đáy = chiều cao menu + huy hiệu + 16px → căn cuối danh sách, nút phân trang không bị che.
- Bảng trượt (Bộ lọc, Tài khoản, Từ chối tin...) và form toàn màn hình vẫn hiện trên cùng, nút Lưu không bị menu che.

**AC3 — Hành động**
- **Nhập tin AI** (Quản lý) mở hộp Nhập nhanh ở bất kỳ trang nào; nhập xong → về Bảng hàng và danh sách tự tải lại.
- **Đăng tin** (CTV) mở form đăng tin ở bất kỳ trang nào; gửi xong → sang Tin đăng.
- Số tin chờ duyệt hiện ở nút Duyệt tin (dùng lại `usePendingSubmissionCount`).

## Phạm vi kỹ thuật
| File | Thay đổi |
|---|---|
| `frontend/src/index.css` | Biến `--badge-h: 64px`, `--bottom-nav-h: 56px`; lớp `pb-bottom-safe` (đệm đáy nội dung khi có menu), giữ `pb-badge-safe` cho bảng trượt |
| `frontend/src/components/layout/AppShell.tsx` (mới) | Khung chung: Navbar + nội dung + BottomNav + hộp Hồ sơ / Tài khoản / Nhập nhanh / Đăng tin; dùng `useCurrentUser` (9.1) |
| `frontend/src/components/layout/BottomNav.tsx` (mới) | 5 nút theo vai trò, ẩn khi ≥ 768px |
| `frontend/src/components/layout/AccountSheet.tsx` (mới) | Nội dung menu tài khoản dùng chung cho avatar (desktop) và nút Tài khoản (mobile) |
| `frontend/src/components/layout/Navbar.tsx` | Trên mobile chỉ còn logo + chuông; tách nội dung menu sang `AccountSheet` |
| `ApartmentsPage.tsx`, `LeadsPage.tsx`, `SubmissionsPage.tsx` | Bỏ phần Navbar / tải người dùng / Hồ sơ lặp lại → dùng `AppShell`; Bảng hàng nhận sự kiện tải lại sau Nhập nhanh |

Không đổi backend, không thêm thư viện.

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] Puppeteer 390×844 (Quản lý & CTV): đúng 5 nút theo vai trò; đo nút ≥ 44px; không tràn ngang.
- [ ] Đo trên trang thật sau deploy: khung menu không giao với `iframe#nl-badge-frame`; căn cuối danh sách cuộn lên được trên menu.
- [ ] Bấm từng nút: chuyển trang đúng, mục đang ở tô tím; Nhập tin AI / Đăng tin mở đúng hộp từ cả 3 trang.
- [ ] 1024px: không có menu đáy, thanh trên như cũ.
- [ ] Chụp màn hình 390px: Bảng hàng, Khách hàng, Duyệt tin, bảng Tài khoản.
- [ ] Báo cáo, đề xuất commit `feat(pwa): mobile bottom navigation with safe areas (Story 9.3)` chờ duyệt.
