# STORY 16.1: Khung Giao Diện Quản Trị Riêng (Admin Console Layout)

**Bối cảnh:** Epic 16. Hiện 5 trang Admin (`/admin`, `/admin/users`, `/admin/audit-logs`, `/admin/performance`, `/admin/settings`) nằm chung khung `AppShell` của app CTV:
* menu đáy là Bảng hàng / Khách / Tin đăng;
* trên điện thoại, lối vào Quản trị nằm ẩn trong menu Tài khoản;
* mỗi trang tự kiểm tra quyền bằng `if (user.role !== 'ADMIN') return <Navigate …/>`, lặp ở cả 5 trang.

Story này dựng khung riêng cho khu Quản trị. Đây là nền cho mọi Story 16.x sau.

---

## 1. Mô tả Story (User Story)
* **Là một:** Admin.
* **Tôi muốn:** Một khu Quản trị có khung giao diện và điều hướng riêng, vào được bằng 1 chạm từ bất kỳ đâu.
* **Để:** Biết rõ mình đang ở "chế độ Quản trị", chuyển giữa các trang quản trị nhanh, không lẫn với công việc CTV.

---

## 2. Tiền điều kiện (Pre-conditions)
* Epic 12: Design System đã có `BottomSheet`, `Skeleton`, `EmptyState`, `Button`, `Badge`.
* Epic 13: đã có 5 trang Admin và `ModerationPage`.
* Story 16.1 **không đổi API backend**.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Sidebar trên desktop
* **Given** Admin mở bất kỳ trang `/admin/*` trên màn hình ≥ 1024px
* **When** trang tải xong
* **Then**
  * Bên trái có sidebar cố định gồm: Tổng quan · Thành viên · Nhật ký hoạt động · Kiểm duyệt · Hiệu suất CTV · Cấu hình.
  * Các mục của Story sau (Cảnh báo, Thùng rác, Sức khỏe hệ thống) **chỉ hiện khi Story tương ứng đã làm**. Danh sách mục khai báo trong một mảng cấu hình duy nhất.
  * Mục đang mở được tô nổi và có `aria-current="page"`.
  * Đầu sidebar có nhãn **"Quản trị"** và nút `[Về Bảng hàng]`.

### AC2 — Menu đáy trên điện thoại
* **Given** Admin ở `/admin/*` trên màn hình < 1024px
* **Then**
  * Thay menu đáy CTV bằng menu đáy Quản trị gồm tối đa 5 mục: Tổng quan · Thành viên · Nhật ký · Kiểm duyệt · **Thêm**.
  * Mục **Thêm** mở `BottomSheet` chứa các mục còn lại và `[Về Bảng hàng]`.
  * Vùng bấm ≥ 44px, chừa vùng an toàn `env(safe-area-inset-bottom)`, mục đang mở tô nổi.

### AC3 — Vào / ra chế độ Quản trị
* **Given** Admin đang ở app thường (`/apartments`, `/leads`…)
* **Then**
  * Desktop: thanh trên có mục **"Quản trị"**.
  * Điện thoại: menu đáy có mục **"Quản trị"**, thay mục "Tin đăng" (Admin ít dùng mục này nhất; "Tin đăng" vẫn vào được từ trang Thêm của khu Quản trị).
* **And** tài khoản Quản lý / CTV **không thấy** mục này.
* **And** khi mở lại app (`/`), Admin vào **chế độ dùng gần nhất**: lưu `localStorage` key `admin-last-mode`, đọc / ghi trong `try/catch`; không đọc được thì vào `/apartments`.

### AC4 — Kiểm tra quyền tập trung
* **Given** tài khoản không phải ADMIN gõ trực tiếp `/admin/users`
* **Then** bị chuyển về `/apartments` bởi **1 lớp guard** bọc nhóm route `/admin/*`.
* **And** xoá phần `if (user.role !== 'ADMIN') return <Navigate …/>` lặp ở 5 trang Admin.
* **And** khi chưa có thông tin người dùng (đang tải hồ sơ), guard hiện skeleton, không chuyển hướng sai.

### AC5 — Giữ đường dẫn cũ
* `/moderation` vẫn hoạt động cho Quản lý, trong khung app thường.
* Admin mở Kiểm duyệt trong khung Quản trị tại `/admin/moderation`, dùng chung component `ModerationPage`.
* Mọi đường dẫn `/admin/...` cũ giữ nguyên. Link thông báo cũ trỏ `/moderation` vẫn mở được.

### AC6 — Trạng thái & chuyển động
* Mỗi trang có tiêu đề `<h1>` rõ ràng. Giữ nguyên skeleton, lỗi + `[Thử lại]` và màn trống của các trang hiện có.
* Chuyển trang trong khu Quản trị không nháy trắng: khung (sidebar / menu đáy) giữ nguyên, chỉ phần nội dung đổi.
* `BottomSheet` "Thêm" dùng component sẵn có, tôn trọng `prefers-reduced-motion`.

### AC7 — Không hồi quy
* CTV / Quản lý thấy app giống hệt trước: menu đáy, thanh trên, chuông thông báo, PWA, toast realtime.
* Trong khu Quản trị vẫn có chuông thông báo, toast realtime (Story 11.4) và menu Tài khoản.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Frontend
* **`frontend/src/components/admin/AdminLayout.tsx` (mới):** khung gồm sidebar (desktop), menu đáy (điện thoại) và vùng `<Outlet/>`. Dùng lại phần chung của `AppShell`: `NotificationBell`, `LiveToast`, `AccountMenu`. Nếu `AppShell` gộp cứng các phần này thì tách ra component nhỏ.
* **`frontend/src/components/admin/adminNav.ts` (mới):** mảng mục điều hướng `{ to, label, icon (lucide), mobile: 'bar' | 'more' }`. Các Story sau chỉ thêm 1 dòng vào đây.
* **`frontend/src/components/admin/AdminSidebar.tsx`, `AdminBottomNav.tsx` (mới).** Nếu 2 file nhỏ thì gộp vào `AdminLayout.tsx`, miễn file ≤ 250 dòng.
* **`frontend/src/components/layout/AdminRoute.tsx` (mới)** hoặc mở rộng `ProtectedRoute` với prop `roles`: guard cho nhóm `/admin/*`.
* **`frontend/src/App.tsx`:** route lồng `/admin` → `AdminRoute` → `AdminLayout`, gồm `index` (Dashboard), `users`, `audit-logs`, `performance`, `settings`, `moderation`.
* **`frontend/src/components/layout/BottomNav.tsx`, `Navbar.tsx`:** thêm mục "Quản trị" cho ADMIN. Ghi `admin-last-mode` khi vào / ra.
* **5 trang `Admin*Page.tsx`:** xoá guard lặp và import `Navigate` thừa.

### Backend
* Không đổi.

---

## 5. Kiểm thử & Định nghĩa hoàn thành (DoD)
* [ ] Đăng nhập ADMIN, kiểm tra ở 390px và 1280px: điều hướng đủ mục, mục đang mở tô nổi, `[Về Bảng hàng]` hoạt động.
* [ ] MANAGER / COLLABORATOR gõ `/admin`, `/admin/users`, `/admin/moderation` → về `/apartments`. MANAGER vẫn mở được `/moderation`.
* [ ] Tải lại trang (F5) ở `/admin/users`: không bị đá ra trong lúc đang tải hồ sơ.
* [ ] Vùng bấm ≥ 44px, không tràn ngang ở 390px, tương phản ≥ 4.5:1, không dùng emoji làm icon.
* [ ] `tsc --noEmit` frontend sạch, `npm run build` thành công, không còn import thừa.
* [ ] App CTV / Quản lý không đổi (so ảnh chụp trước / sau).
