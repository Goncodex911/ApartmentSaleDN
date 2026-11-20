# EPIC-16: Bảng Điều Khiển Quản Trị Riêng & Giám Sát Hoạt Động Người Dùng (Admin Console & Activity Monitoring)

## Mục tiêu
Nâng khu Quản trị (Epic 13) thành một **Bảng điều khiển riêng cho Admin**, có khung giao diện, điều hướng và nhận diện tách biệt khỏi app CTV.
Bổ sung đủ công cụ để Admin **nhìn thấy và kiểm soát toàn bộ hệ thống**:
* nhật ký hoạt động đầy đủ của từng người dùng;
* hồ sơ 360° mỗi thành viên;
* quản lý phiên đăng nhập và thiết bị;
* cảnh báo hành vi bất thường;
* thùng rác khôi phục dữ liệu;
* sức khỏe hệ thống.

**Nguyên tắc bắt buộc:** giữ nguyên 100% chức năng hiện có của Admin, Quản lý và CTV. Epic này chỉ **thêm và sắp xếp lại**, không bỏ tính năng nào.

---

## Bối cảnh & Kết quả rà soát khu Quản trị (21/11/2026)

### 1. Chức năng Admin đang có — GIỮ NGUYÊN
| Khu vực | Đường dẫn | Chức năng | Nguồn |
| :--- | :--- | :--- | :---: |
| Tổng quan | `/admin` | KPI kho căn theo trạng thái / khu vực / giá, thành viên, cào tin 24h, tương tác khách | 13.1 |
| Thành viên | `/admin/users` | Lọc theo tab, tìm tên / SĐT / mã CTV, duyệt, đổi vai trò, khóa / mở, đặt lại mật khẩu, khóa quyền báo lỗi | 13.2 |
| Nhật ký truy vết | `/admin/audit-logs` | 11 hành động nhạy cảm (xem SĐT chủ, đổi trạng thái / giá, xóa căn, duyệt tin, thao tác tài khoản), lưu 180 ngày | 13.3 |
| Hiệu suất CTV | `/admin/performance` | Bảng xếp hạng theo tháng, xuất CSV | 13.4 |
| Cấu hình | `/admin/settings` | Chính sách duyệt tin cào, hotline, Zalo OA, nhóm Telegram nguồn | 13.5 |
| Kiểm duyệt báo lỗi | `/moderation` | Hàng đợi báo lỗi (dùng chung với Quản lý) | 13.6 |
| Kho căn | `/apartments` … | Mọi quyền của Quản lý: xem SĐT chủ, sửa / xóa căn, duyệt tin CTV | Epic 1–14 |

### 2. Khoảng trống phát hiện
| # | Vấn đề | Ảnh hưởng | Story |
| :-: | :--- | :--- | :-: |
| 1 | Admin dùng chung khung app CTV: menu đáy là Bảng hàng / Khách / Tin đăng. Trên điện thoại, lối vào Quản trị nằm ẩn trong menu Tài khoản; các trang Admin không có điều hướng qua lại; mỗi trang tự kiểm tra quyền | Khó dùng, dễ lạc, không biết đang ở "chế độ Admin" | 16.1 |
| 2 | Nhật ký chỉ có 11 hành động. **Không ghi:** đăng nhập / đăng nhập sai / đăng xuất, tạo căn, sửa thông tin căn (ngoài giá), nguồn phụ, gia hạn hợp đồng, nhập tin AI, CTV gửi / rút tin, báo lỗi, tạo link chia sẻ, **Admin đổi cấu hình hệ thống & nhóm Telegram** | Không truy vết được phần lớn thao tác; thay đổi cấu hình không có bằng chứng | 16.2 |
| 3 | Không có trang chi tiết từng người: lần đăng nhập cuối, lần hoạt động cuối, dòng thời gian hoạt động, số liệu cá nhân | Admin không trả lời được "người này đã làm gì" | 16.3 |
| 4 | Story 14.5 đã lưu phiên theo thiết bị nhưng Admin không xem được; chỉ có cách "khóa tài khoản" để đá ra | Không xử lý được trường hợp mất điện thoại / nghi lộ tài khoản mà không khóa người dùng | 16.4 |
| 5 | Không phát hiện được hành vi bất thường: 1 người xem hàng chục SĐT chủ trong 1 giờ (dấu hiệu cào nguồn hàng), đăng nhập sai liên tục, xóa nhiều căn | Rò rỉ nguồn hàng chỉ phát hiện khi đã muộn | 16.5 |
| 6 | Admin không tạo được tài khoản trực tiếp, không sửa được tên / SĐT thành viên | Phải nhờ người dùng tự đăng ký rồi duyệt | 16.6 |
| 7 | Xóa căn là xóa vĩnh viễn; không có danh sách căn lâu không cập nhật | Xóa nhầm là mất; kho tích tin cũ | 16.7 |
| 8 | Không theo dõi được trạng thái các gói dịch vụ cấu hình (Gemini, Cloudinary, Atlas, CARTO, Telegram), không biết gói nào sắp chạm hạn mức / quá tải, không cảnh báo khi API Key hỏng/hết hạn để thay kịp thời | Dịch vụ ngừng đột ngột (ảnh lỗi, AI dừng bóc tin, map không tải, DB treo) mà Admin không biết nguyên nhân | 16.8 |
| 9 | Không có kênh thông báo chung từ Admin tới CTV / Quản lý | Phải nhắn ngoài app | 16.9 |

### 3. Nguyên tắc thiết kế
* **Giao diện Admin riêng nhưng cùng Design System (Epic 12):** cùng tokens, font, thành phần (Button, Badge, BottomSheet, Skeleton, EmptyState). Nhận diện "chế độ Admin" bằng thanh tiêu đề và điều hướng riêng, không đổi bảng màu cả app.
* **Desktop-first cho dữ liệu dày, vẫn dùng tốt trên điện thoại:** Admin thường xem nhật ký / bảng số liệu trên máy tính nhưng cần thao tác khẩn (khóa tài khoản, đăng xuất thiết bị) trên điện thoại.
* **Checklist UI/UX (ui-ux-pro-max):** tương phản ≥ 4.5:1, vùng bấm ≥ 44px, chữ ô nhập ≥ 16px trên điện thoại, đủ trạng thái loading / lỗi / trống, không dùng emoji làm icon, bảng dữ liệu có bản xem dạng thẻ trên điện thoại.
* **Chuyển động (apple-design):** phản hồi khi nhấn ngay lập tức; bảng trượt và chuyển trang dùng lò xo không nảy; tôn trọng `prefers-reduced-motion`.
* **Quyền riêng tư:** nhật ký ghi *hành động*, không ghi nội dung nhạy cảm (mật khẩu, nội dung chat của khách, ghi chú CRM của CTV). Admin xem số liệu CRM của CTV dạng **tổng hợp**, không đọc chi tiết từng khách.
* **Dung lượng:** Atlas gói free 512MB. Nhật ký phải có hạn lưu theo mức độ và không ghi thao tác *đọc* (trừ xem SĐT chủ như hiện tại).

---

## ⚠️ Quyết định cần Project Owner chốt trước khi tạo Story chi tiết
| # | Câu hỏi | Đề xuất mặc định |
| :-: | :--- | :--- |
| Q1 | Thời gian lưu nhật ký theo mức độ | Thông thường **60 ngày**, bảo mật / quan trọng **180 ngày** (giữ như 13.3) |
| Q2 | Admin có được xem chi tiết khách trong CRM của từng CTV không? | **Không** — chỉ số liệu tổng hợp (số khách, theo giai đoạn) |
| Q3 | Thùng rác căn hộ giữ bao lâu, ai khôi phục được? | **30 ngày**; chỉ Admin khôi phục / xóa vĩnh viễn; Quản lý vẫn xóa được (vào thùng rác) |
| Q4 | Ngưỡng cảnh báo "xem SĐT chủ bất thường" | **≥ 30 lần / 1 giờ / người**, Admin chỉnh được trong Cấu hình |
| Q5 | Có thông báo cho thành viên biết hoạt động được ghi nhật ký không? | **Có** — 1 dòng trong màn hình đăng nhập / Hồ sơ (minh bạch theo Nghị định 13/2023 về bảo vệ dữ liệu cá nhân) |

---

## Danh mục các User Stories

| Story | Tên User Story | Trọng tâm kỹ thuật | Độ ưu tiên |
| :--- | :--- | :--- | :---: |
| **Story 16.1** | Khung Giao Diện Quản Trị Riêng (Admin Console Layout) | `AdminLayout`: sidebar desktop + menu đáy riêng trên điện thoại, route guard tập trung `/admin/*`, chuyển chế độ Quản trị ↔ Bảng hàng | P0 |
| **Story 16.2** | Nhật Ký Hoạt Động Toàn Diện (Full Activity Log) | Mở rộng AuditLog: nhóm / mức độ / hạn lưu theo mức độ, ghi đăng nhập & mọi thao tác ghi dữ liệu, lọc theo thời gian, xuất CSV | P0 |
| **Story 16.3** | Hồ Sơ Thành Viên 360° (User Detail & Activity Timeline) | Trang `/admin/users/:id`: thông tin, lần đăng nhập / hoạt động cuối, dòng thời gian, số liệu cá nhân, gom thao tác 13.2 | P0 |
| **Story 16.4** | Quản Lý Phiên Đăng Nhập & Thiết Bị (Session & Device Management) | Lưu thiết bị / IP / lần dùng cuối của phiên, Admin đăng xuất từng thiết bị hoặc tất cả | P1 |
| **Story 16.5** | Cảnh Báo Bảo Mật & Hành Vi Bất Thường (Security Alerts) | Quy tắc phát hiện: cào SĐT chủ, đăng nhập sai liên tục, xóa hàng loạt, Admin đăng nhập thiết bị mới; hộp cảnh báo + thông báo | P1 |
| **Story 16.6** | Admin Tạo & Sửa Tài Khoản Trực Tiếp (Admin User Provisioning) | Tạo CTV / Quản lý với mật khẩu tạm (bắt đổi), sửa tên / SĐT, ghi chú nội bộ | P1 |
| **Story 16.7** | Thùng Rác Căn Hộ & Dọn Kho Tồn (Recycle Bin & Stale Inventory) | Xóa mềm 30 ngày, khôi phục / xóa vĩnh viễn, danh sách căn lâu không cập nhật + thao tác hàng loạt | P1 |
| **Story 16.8** | Giám Sát Sức Khỏe Hệ Thống, Hạn Mức Gói Cấu Hình & Cảnh Báo Thay Key | Trạng thái từng gói cấu hình (Cloudinary, Gemini, Atlas, CARTO, Telegram), đồng hồ hạn mức & cảnh báo quá tải, phát hiện lỗi key (401/403) + nút test key | P1 |
| **Story 16.9** | Thông Báo Từ Admin Tới Thành Viên (Broadcast Announcements) | Gửi thông báo trong app + Telegram theo vai trò, ghim trên đầu Bảng hàng có hạn hiển thị | P2 |

---

### User Story 16.1: Khung Giao Diện Quản Trị Riêng (Admin Console Layout)
* **Là một:** Admin.
* **Tôi muốn:** Một khu Quản trị có khung giao diện và điều hướng riêng, vào được bằng 1 chạm từ bất kỳ đâu.
* **Để:** Biết rõ mình đang ở "chế độ Admin", chuyển giữa các trang quản trị nhanh, không lẫn với công việc CTV.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Desktop (≥ 1024px):** sidebar trái cố định gồm Tổng quan · Thành viên · Nhật ký hoạt động · Cảnh báo (kèm số chưa xem) · Kiểm duyệt · Hiệu suất CTV · Thùng rác · Sức khỏe hệ thống · Cấu hình. Mục đang mở được tô nổi. Trên đầu có nhãn "Quản trị" và nút `[Về Bảng hàng]`.
  2. **Điện thoại:** menu đáy riêng 5 mục: Tổng quan · Thành viên · Nhật ký · Cảnh báo · Thêm (bảng trượt chứa các mục còn lại). Vùng bấm ≥ 44px, có safe-area.
  3. **Vào / ra chế độ Admin:** trong app thường, Admin thấy mục "Quản trị" trên thanh trên (desktop) **và** trong menu đáy (điện thoại, thay vị trí ít dùng nhất với Admin). Trong khu Quản trị luôn có `[Về Bảng hàng]`. App nhớ chế độ dùng gần nhất.
  4. **Route guard tập trung:** mọi đường dẫn `/admin/*` đi qua 1 lớp kiểm tra quyền; tài khoản không phải Admin được chuyển về `/apartments`. Bỏ phần kiểm tra lặp ở từng trang.
  5. **Giữ đường dẫn cũ:** `/moderation` vẫn dùng được cho Quản lý; Admin mở hàng đợi trong khung Quản trị (`/admin/moderation`). Các link cũ `/admin/...` không đổi.
  6. **Trạng thái:** mỗi trang có tiêu đề rõ, skeleton khi tải, thông báo lỗi kèm `[Thử lại]`, màn hình trống có hướng dẫn.
  7. **Chuyển động:** chuyển giữa các trang quản trị không giật; bảng trượt "Thêm" dùng `BottomSheet` sẵn có; tôn trọng `prefers-reduced-motion`.
* **Ghi chú kỹ thuật:** tạo `components/admin/AdminLayout.tsx` (route lồng trong `App.tsx` thay cho AppShell của khu `/admin`), `AdminSidebar.tsx`, `AdminBottomNav.tsx`; tách phần dùng chung (thông báo, phiên) khỏi `AppShell` nếu cần. Không đổi API.

---

### User Story 16.2: Nhật Ký Hoạt Động Toàn Diện (Full Activity Log)
* **Là một:** Admin.
* **Tôi muốn:** Xem được mọi thao tác thay đổi dữ liệu và mọi lần đăng nhập của tất cả người dùng, lọc theo người, loại, mức độ và khoảng thời gian.
* **Để:** Trả lời được "ai đã làm gì, lúc nào, từ thiết bị nào" khi có tranh chấp, sai sót hoặc rò rỉ.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Giữ toàn bộ 11 hành động của Story 13.3**, ghi thêm:
     | Nhóm | Hành động mới |
     | :--- | :--- |
     | Đăng nhập | Đăng nhập thành công, đăng nhập sai (ghi SĐT đã che), đăng xuất, bị chặn vì thử quá nhiều (14.5) |
     | Kho căn | Tạo căn, sửa căn (danh sách trường đã đổi, **không** lưu giá trị SĐT chủ), thêm / gỡ nguồn phụ, gia hạn hợp đồng, nhập tin AI (dán nhanh / extension) |
     | Tin CTV & báo lỗi | CTV gửi / sửa / rút tin, gửi báo lỗi, xử lý báo lỗi (đã thuê / sửa giá) |
     | Chia sẻ | Tạo link xem phòng |
     | Quản trị | Đổi cấu hình hệ thống (giá trị cũ → mới), thêm / bật tắt / xóa nhóm Telegram, tạo / sửa tài khoản (16.6), đăng xuất thiết bị (16.4), khôi phục / xóa vĩnh viễn căn (16.7), gửi thông báo chung (16.9) |
  2. Mỗi mục có **mức độ**: Thông thường · Quan trọng · Bảo mật. Hạn lưu theo Q1, **tự xóa** bằng TTL.
  3. **Không ghi:** mật khẩu, mật khẩu tạm, nội dung chat của khách, ghi chú CRM, token. Không ghi thao tác chỉ đọc (trừ xem SĐT chủ như 13.3).
  4. **Trang Nhật ký hoạt động:** lọc theo nhóm, mức độ, người thực hiện (chọn từ danh sách), khoảng thời gian (Hôm nay · 7 ngày · 30 ngày · tùy chọn), tìm theo tên người / tên căn. Desktop dạng bảng (thời gian, người, vai trò, hành động, đối tượng, IP / thiết bị); điện thoại dạng thẻ. Bấm 1 mục mở chi tiết (trước → sau với trường đã đổi).
  5. **Xuất CSV** theo bộ lọc hiện tại (tối đa 10.000 dòng), mở được bằng Excel tiếng Việt (UTF-8 BOM như Story 13.4). Lần xuất cũng được ghi nhật ký.
  6. Ghi nhật ký **chạy nền**: lỗi ghi không làm hỏng thao tác chính (giữ cách của 13.3).
* **Ghi chú kỹ thuật:** `audit-log.model.ts` thêm `category`, `severity`, `expiresAt` (TTL `expireAfterSeconds: 0` thay cho TTL cố định theo `createdAt`), mở rộng `targetType` (SETTINGS, SHARE_LINK, REPORT, LEAD_SUMMARY…), index `{ createdAt: -1 }`, `{ userId: 1, createdAt: -1 }`, `{ category: 1, createdAt: -1 }`. Dữ liệu cũ (không có `expiresAt`) tính 180 ngày. Ghi đăng nhập trong `AuthService.login` / `logout`; đổi cấu hình trong `SystemConfigService`. Ước lượng dung lượng trong Story chi tiết (mục tiêu < 100MB với 50 thành viên).

---

### User Story 16.3: Hồ Sơ Thành Viên 360° (User Detail & Activity Timeline)
* **Là một:** Admin.
* **Tôi muốn:** Mở 1 thành viên và thấy toàn bộ thông tin, số liệu và hoạt động gần đây của người đó trên 1 trang.
* **Để:** Đánh giá, hỗ trợ hoặc xử lý vi phạm của từng người mà không phải ghép dữ liệu từ nhiều trang.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. Bấm 1 thành viên ở danh sách → trang `/admin/users/:id` (thay cho bảng thao tác hiện tại; **mọi thao tác của 13.2 vẫn có**: duyệt, đổi vai trò, khóa / mở, đặt lại mật khẩu, khóa quyền báo lỗi).
  2. **Thông tin:** tên, SĐT, mã CTV, vai trò, trạng thái, ngày tham gia, **lần đăng nhập cuối**, **lần hoạt động cuối** ("đang hoạt động" nếu trong 5 phút), số thiết bị đang đăng nhập, điểm tín nhiệm, liên kết Telegram.
  3. **Số liệu cá nhân (30 ngày / toàn thời gian):** căn đã tạo hoặc sửa (Quản lý), tin đăng gửi / được duyệt (CTV), link chia sẻ & lượt xem, số khách theo giai đoạn (tổng hợp — Q2), căn chốt, báo lỗi đúng / sai, số lần xem SĐT chủ.
  4. **Dòng thời gian hoạt động:** nhật ký 16.2 của riêng người này, mới nhất trước, nhóm theo ngày, tải thêm; lọc nhanh theo nhóm.
  5. Danh sách thành viên thêm cột / nhãn **"Hoạt động cuối"** và sắp xếp theo đó để thấy ai đã lâu không dùng app.
* **Ghi chú kỹ thuật:** `user.model.ts` thêm `lastLoginAt`, `lastActiveAt`; cập nhật `lastActiveAt` tối đa 1 lần / 5 phút / người trong `authMiddleware` (dùng bộ nhớ phiên 30 giây sẵn có, không ghi DB mỗi request). API `GET /admin/users/:id/overview` (1 lần gom số liệu bằng `Promise.all`) và `GET /admin/audit-logs?userId=` (đã có).

---

### User Story 16.4: Quản Lý Phiên Đăng Nhập & Thiết Bị (Session & Device Management)
* **Là một:** Admin.
* **Tôi muốn:** Xem từng thành viên đang đăng nhập trên những thiết bị nào và đăng xuất từng thiết bị hoặc tất cả.
* **Để:** Xử lý nhanh khi thành viên mất điện thoại hoặc nghi lộ tài khoản mà không cần khóa người đó.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. Trong Hồ sơ 360°: danh sách phiên gồm thiết bị (đọc từ trình duyệt: "iPhone · Safari", "Windows · Chrome"), IP gần nhất, thời điểm đăng nhập, lần dùng cuối.
  2. `[Đăng xuất thiết bị này]`: thiết bị đó mất phiên ở lần làm mới token kế tiếp (≤ 1 giờ) **và** ngay lập tức nếu gọi API (dùng bộ nhớ phiên như 13.2). `[Đăng xuất tất cả]`: tương đương tăng `tokenVersion` (không khóa tài khoản).
  3. Thành viên tự xem được danh sách thiết bị của mình trong Hồ sơ cá nhân và tự đăng xuất thiết bị khác.
  4. Mọi lần đăng xuất từ xa được ghi nhật ký (16.2) và gửi thông báo cho chủ tài khoản.
* **Ghi chú kỹ thuật:** mở rộng `refreshSessions` (Story 14.5) thêm `userAgent`, `ip`, `createdAt`, `lastUsedAt` (cập nhật khi xoay phiên). Thu hồi ngay: thêm `jti` của phiên vào access token và kiểm tra trong `resolveSession` qua bộ nhớ 30 giây.

---

### User Story 16.5: Cảnh Báo Bảo Mật & Hành Vi Bất Thường (Security Alerts)
* **Là một:** Admin.
* **Tôi muốn:** Được báo ngay khi có dấu hiệu bất thường thay vì tự soi nhật ký.
* **Để:** Phát hiện sớm việc cào nguồn hàng, dò mật khẩu hoặc phá dữ liệu.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Quy tắc phát hiện (bản đầu):**
     * 1 người xem SĐT chủ ≥ ngưỡng Q4 trong 1 giờ.
     * 1 SĐT đăng nhập sai ≥ 10 lần / 15 phút (bị chặn theo 14.5).
     * 1 người xóa ≥ 5 căn trong 10 phút.
     * Tài khoản Admin / Quản lý đăng nhập từ thiết bị chưa từng dùng.
  2. Mỗi cảnh báo: mức độ, người liên quan, mô tả, thời điểm, link tới Hồ sơ 360° và nhật ký liên quan. Cùng 1 quy tắc + 1 người chỉ tạo 1 cảnh báo / giờ (không spam).
  3. Trang **Cảnh báo** trong khu Quản trị: lọc Chưa xử lý / Đã xử lý; `[Đánh dấu đã xem]`, `[Khóa tài khoản]`, `[Đăng xuất tất cả thiết bị]` ngay trên cảnh báo.
  4. Cảnh báo mức Bảo mật gửi thông báo trong app + Telegram cho Admin; Tổng quan hiện số cảnh báo chưa xử lý.
  5. Admin chỉnh ngưỡng trong Cấu hình (thay đổi được ghi nhật ký theo 16.2).
* **Ghi chú kỹ thuật:** model `SecurityAlert` (TTL 180 ngày); bộ đếm dùng `createCounter` (Story 14.5) — đếm trong bộ nhớ, đủ cho 1 máy chủ; phát hiện chạy ngay tại điểm ghi nhật ký (không quét định kỳ).

---

### User Story 16.6: Admin Tạo & Sửa Tài Khoản Trực Tiếp (Admin User Provisioning)
* **Là một:** Admin.
* **Tôi muốn:** Tự tạo tài khoản cho CTV / Quản lý mới và sửa thông tin cơ bản của thành viên.
* **Để:** Đưa người mới vào làm ngay, sửa sai SĐT / tên mà không cần họ tự đăng ký.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. `[Thêm thành viên]` ở trang Thành viên: nhập tên, SĐT, vai trò (CTV / Quản lý) → tạo tài khoản đang hoạt động, hiện **mật khẩu tạm 1 lần** (giống reset 13.2), người nhận bắt buộc đổi ở lần đăng nhập đầu (13.9).
  2. Sửa tên, SĐT (kiểm tra trùng), email của thành viên; đổi SĐT thì đăng xuất mọi thiết bị của người đó.
  3. **Ghi chú nội bộ** về thành viên (chỉ Admin thấy), có người viết và thời gian.
  4. Giữ luồng tự đăng ký + duyệt Quản lý (13.2); không tạo / sửa tài khoản ADMIN qua giao diện.
  5. Mọi thao tác ghi nhật ký (16.2), không lưu mật khẩu tạm.
* **Ghi chú kỹ thuật:** `POST /admin/users`, `PATCH /admin/users/:id`; tái dùng `generateUniqueCtvCode`, logic mật khẩu tạm của `UserService.resetPassword`.

---

### User Story 16.7: Thùng Rác Căn Hộ & Dọn Kho Tồn (Recycle Bin & Stale Inventory)
* **Là một:** Admin.
* **Tôi muốn:** Khôi phục được căn bị xóa nhầm và dọn các căn lâu không cập nhật.
* **Để:** Không mất dữ liệu vì thao tác nhầm và giữ Bảng hàng sạch.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. Xóa căn (Quản lý / Admin) chuyển vào **Thùng rác** thay vì xóa hẳn: biến mất khỏi Bảng hàng, tìm kiếm, bản đồ, ghép khách, chat gợi ý, link chia sẻ (link báo "không còn hiệu lực").
  2. Trang **Thùng rác**: căn đã xóa, người xóa, thời điểm, số ngày còn lại; `[Khôi phục]` / `[Xóa vĩnh viễn]` (chỉ Admin, có xác nhận). Tự xóa vĩnh viễn sau thời hạn Q3 (dọn ảnh Cloudinary như Story 8.6).
  3. **Kho tồn:** danh sách căn đang chào nhưng **không cập nhật > 30 ngày**, lọc theo khu vực / người tạo; chọn nhiều để `[Chuyển Sắp trống]`, `[Đánh dấu cần kiểm tra]`, `[Xóa]` hàng loạt (có xác nhận, ghi nhật ký từng căn).
  4. Báo lỗi đang mở của căn bị xóa xử lý như Story 14.6; khôi phục căn không mở lại báo lỗi cũ.
* **Ghi chú kỹ thuật:** thêm `deletedAt`, `deletedBy` vào `Apartment` và một bộ lọc chung "chưa xóa" cho mọi truy vấn kho (`buildStatusFilter`, search, pins, lead matching, chat, share) — rủi ro sót truy vấn cao, Story chi tiết phải liệt kê đủ và có kiểm thử từng nơi.

---

### User Story 16.8: Giám Sát Sức Khỏe Hệ Thống, Hạn Mức Gói Cấu Hình & Cảnh Báo Thay Key (System Health, Service Quotas & Key Health Monitoring)
* **Là một:** Admin hệ thống.
* **Tôi muốn:** Có một bảng điều khiển trung tâm (`/admin/health`) theo dõi trực tiếp toàn bộ các gói dịch vụ bên ngoài đã cấu hình (Cloudinary, Gemini AI, MongoDB Atlas, Telegram Bot, Bản đồ CARTO / Nominatim): biết chính xác gói nào đang hoạt động tốt, gói nào gần chạm trần / quá tải, và gói nào bị lỗi hoặc hết hạn cần thay API Key ngay lập tức.
* **Để:** Chủ động phát hiện và ngăn chặn sự cố gián đoạn hệ thống (không tải được ảnh, AI ngừng bóc tin, bản đồ trắng xóa, DB bị khóa đầy) trước khi Quản lý và CTV gặp lỗi, đồng thời thay key kịp thời mà không cần lục tìm log máy chủ phức tạp.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Bảng Điều Khiển Ma Trận Gói Dịch Vụ Cấu Hình (Service Package Status Matrix):**
     * Theo dõi 5 dịch vụ bên ngoài cốt lõi đã nêu trong [EXTERNAL_CONFIG.md](file:///d:/CODE/AppartmentSaleProject/EXTERNAL_CONFIG.md):
       1. **Lưu trữ Ảnh/Video (Cloudinary):** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`
       2. **Trí tuệ Nhân tạo AI (Google Gemini):** `GEMINI_API_KEY`, `GEMINI_MODEL`
       3. **Cơ sở dữ liệu (MongoDB Atlas):** `MONGODB_URI`
       4. **Bot Cào Tin (Telegram Ingestion):** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_SOURCE_CHAT_IDS`
       5. **Bản đồ & Định vị (CARTO Tiles & OSM Nominatim):** `VITE_MAP_TILE_URL`, `NOMINATIM_USER_AGENT`
     * Mỗi dịch vụ hiển thị rõ 4 trạng thái trực quan bằng nhãn chữ tiếng Việt + màu sắc chuẩn (không chỉ dùng màu đơn thuần):
       * 🟢 **Bình thường (Khỏe mạnh / Active):** Kết nối thông suốt, key hợp lệ, mức dùng tài nguyên an toàn ($< 70\%$).
       * 🟡 **Gần quá tải (Cảnh báo / Warning):** Đang tiệm cận hạn mức gói miễn phí ($\ge 70\% - 80\%$) hoặc có cảnh báo rate limit ngắt quãng trong 24h qua.
       * 🔴 **Quá tải / Chạm trần (Nguy hiểm / Quota Exceeded):** Đã chạm trần gói miễn phí (Gemini dính 429 Resource Exhausted, Cloudinary hết credits, Mongo 512MB đầy), dịch vụ bị từ chối phục vụ.
       * 🔑 **Cần thay Key (Lỗi xác thực / Action Required):** Phát hiện lỗi xác thực 401/403 (`API_KEY_INVALID`, `Token Expired`, `Bad Signature`, `Permission Denied`). Nổi bật nhãn đỏ nhấp nháy: `[🔑 Cần thay Key]`.
  2. **Đồng Hồ Đo Hạn Mức Từng Gói (Quotas & Usage Meters):**
     * **MongoDB Atlas (Gói Free M0 512MB):** Thanh tiến trình (Progress Bar) hiển thị dung lượng thực tế (`db.stats()`), số MB đã dùng / 512MB, cảnh báo vàng khi $> 70\%$ (358MB), đỏ khi $> 90\%$ (460MB), số kết nối active/500 max connections, phân rã dung lượng theo 5 collection lớn nhất (apartments, audit_logs, notifications, leads, chat_messages).
     * **Cloudinary (Gói Free 25 Credits/tháng):** Thống kê số lượng media tải lên trong tháng, ước tính tỷ lệ dung lượng lưu trữ & băng thông, cảnh báo khi tiệm cận mức 20 credits ($\ge 80\%$) để Admin chủ động dọn ảnh rác hoặc nâng cấp gói.
     * **Google Gemini AI (Gói Free 15 RPM / 1.500 RPD):** Tần suất gọi API theo phút và trong 24h, đếm số lượt dính lỗi Rate Limit 429 trong ngày kèm thời điểm bị chặn gần nhất.
     * **Bản đồ CARTO (Gói Free 1 triệu tiles/tháng) & OSM Nominatim (Giới hạn 1 req/s):** Đếm số lượt yêu cầu, cảnh báo nếu gặp lỗi 403 (sai key CARTO) hoặc 429 (quá tốc độ gọi geocoding).
     * **Telegram Bot:** Trạng thái kết nối (đang chạy / tắt), lần nhận tin cuối, số tin cào theo từng nhóm nguồn trong 24h, cảnh báo khi bot bị thu hồi token hoặc bị kích khỏi nhóm chat nguồn.
  3. **Phát Hiện Lỗi Key & Hướng Dẫn Thay Key Trực Tiếp:**
     * Khi bất kỳ dịch vụ nào gặp lỗi xác thực 401/403:
       * Hệ thống hiển thị mô tả lỗi cụ thể: *"API Key của [Tên dịch vụ] không hợp lệ hoặc đã hết hạn."*
       * Cung cấp nút bấm `[📖 Xem cách lấy key mới]`: Bật bảng trượt hiển thị trích đoạn hướng dẫn từng bước từ [EXTERNAL_CONFIG.md](file:///d:/CODE/AppartmentSaleProject/EXTERNAL_CONFIG.md) (nơi đăng ký, vị trí lấy key trong dashboard dịch vụ, tên biến môi trường cần cập nhật trên Render / Netlify).
  4. **Kiểm Tra Kết Nối Tức Thì 1-Click (1-Click Connectivity & Health Ping):**
     * Bên cạnh mỗi dịch vụ có nút `[Kiểm tra lại]`, trên đầu trang có nút `[Kiểm tra kết nối tất cả]`:
       * Gửi request kiểm tra siêu nhẹ (Gemini ping 1 token test, Cloudinary ping_api, Mongo ping admin command, Telegram getMe, CARTO tile check).
       * Trả về kết quả tức thì trong 1–2 giây: Trạng thái sống/chết, độ trễ mạng (latency ms).
  5. **Cảnh Báo Khẩn Cấp Chủ Động (Proactive Emergency Alert Banner):**
     * Nếu có bất kỳ dịch vụ nào chuyển sang trạng thái 🔴 Quá tải hoặc 🔑 Cần thay Key:
       * Tự động ghim thanh thông báo màu đỏ khẩn cấp ở đầu Admin Console: *"⚠️ [Tên dịch vụ] đang gặp sự cố ([Lý do]). Vui lòng kiểm tra và thay Key ngay để tránh gián đoạn hệ thống."*
       * Bắn thông báo chuông khẩn đến tài khoản Admin.
     * Hiển thị tình trạng các tác vụ ngầm (Việc hằng ngày: nhắc tái ký hợp đồng, dọn ảnh tin CTV bị từ chối).
* **Ghi chú kỹ thuật:** Tạo endpoint `GET /api/v1/admin/health/status` và `POST /api/v1/admin/health/ping` (chỉ role ADMIN); đếm lỗi trong bộ nhớ + model nhẹ `ServiceHealthLog` có TTL 7 ngày; dung lượng qua `db.stats()` / `collStats` (có cache 5 phút để tránh tải DB).

---

### User Story 16.9: Thông Báo Từ Admin Tới Thành Viên (Broadcast Announcements)
* **Là một:** Admin.
* **Tôi muốn:** Gửi thông báo chung tới tất cả hoặc từng nhóm vai trò.
* **Để:** Phổ biến chính sách, lịch họp, căn hot mà không cần nhắn ngoài app.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. Soạn tiêu đề + nội dung (≤ 500 ký tự), chọn người nhận: Tất cả · CTV · Quản lý; tùy chọn gửi thêm qua Telegram (người đã liên kết).
  2. Thông báo hiện trong chuông (6.3) và **dải ghim trên đầu Bảng hàng** tới khi hết hạn (Admin chọn 1 / 3 / 7 ngày) hoặc người dùng bấm đóng.
  3. Danh sách thông báo đã gửi: số người nhận, số người đã xem; thu hồi được (ẩn dải ghim).
  4. Ghi nhật ký (16.2); giới hạn 10 thông báo / ngày để tránh làm phiền.
* **Ghi chú kỹ thuật:** model `Announcement` + loại thông báo `ANNOUNCEMENT`; tái dùng `NotificationService.notify` theo lô.

---

## Định nghĩa Hoàn thành của Epic (Definition of Done)
* Toàn bộ chức năng Admin / Quản lý / CTV hiện có vẫn hoạt động (chạy lại kiểm thử hồi quy Epic 13–14).
* Đạt Acceptance Criteria của các Story được Project Owner chọn làm; Q1–Q5 đã chốt.
* `tsc --noEmit` backend & frontend sạch lỗi, `npm run build` frontend thành công.
* Kiểm tra giao diện Admin ở 390px (điện thoại) và 1280px (desktop): vùng bấm ≥ 44px, không tràn ngang, đủ trạng thái loading / lỗi / trống, tương phản ≥ 4.5:1, `prefers-reduced-motion`.
* Ước lượng và kiểm tra dung lượng nhật ký sau khi bật ghi đầy đủ (mục tiêu < 100MB / 180 ngày với 50 thành viên).
