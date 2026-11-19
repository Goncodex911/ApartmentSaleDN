# EPIC-13: Trung Tâm Quản Trị Hệ Thống & Nâng Cấp Quyền Hạn Admin (Admin Control Center & Governance)

## Mục tiêu
Bảo toàn 100% các đặc quyền hiện có của tài khoản **Admin**, đồng thời nâng cấp toàn diện vai trò Admin từ một popup duyệt tài khoản đơn sơ thành **"Trung tâm Điều hành Toàn diện" (Admin Control Center)**. 
Trang bị cho Admin bảng điều khiển số liệu kinh doanh (KPI Dashboard), hệ thống quản trị người dùng & phân quyền chuyên sâu, nhật ký truy vết bảo vệ thông tin chủ nhà (Audit Logs), xếp hạng hiệu suất CTV và công cụ cấu hình hệ thống trực quan.

---

## Bối cảnh & Giá trị Kinh doanh

### 1. Hiện trạng của Role ADMIN trong Hệ thống
Hiện tại, tài khoản Admin đang dùng chung giao diện với Quản lý (Manager), chỉ có duy nhất một nút bấm *"Duyệt tài khoản"* nằm ẩn trong menu avatar để mở popup `PendingUsersModal`:
* **Chưa có không gian làm việc riêng:** Thiếu trang `/admin` tập trung, Admin phải tự bấm qua lại các trang thông thường để giám sát.
* **Quản trị người dùng còn sơ sài:** Chỉ xem được danh sách tài khoản đang chờ duyệt (`PENDING`). Không có cách nào để xem danh sách toàn bộ CTV/Manager đang hoạt động, không thể thăng cấp/giáng cấp role, không thể tìm kiếm thành viên hay khóa tài khoản gian lận trực tiếp trên giao diện.
* **Nguy cơ rò rỉ dữ liệu nguồn hàng:** Chưa có cơ chế ghi nhận nhật ký (Audit Log) ai đã bấm xem số điện thoại chủ nhà. Khi xảy ra tình trạng "cắt cầu", tranh chấp khách hay lộ số chủ nhà ra ngoài, Admin không có bằng chứng để truy xét.
* **Thiếu số liệu tổng quan (Blind Spots):** Admin không nắm được tổng thể kho hàng có bao nhiêu căn trống, tỷ lệ tin rác bị bot lọc bỏ, hay CTV nào đang hoạt động tích cực nhất để khen thưởng.

### 2. Nguyên tắc Bảo toàn & Kế thừa
* **Không phá vỡ tính năng cũ:** Admin vẫn giữ nguyên toàn bộ quyền năng tối cao trên kho căn hộ: xem số chủ nhà unmasked, chỉnh sửa, xóa, duyệt tin CTV đăng (`/submissions`), duyệt/khóa tài khoản chờ duyệt.
* **Tương thích ngược 100%:** Giữ nguyên cấu trúc dữ liệu `role: 'ADMIN'` và các middleware `requireRoles('ADMIN')` hiện có trong backend.

---

## Danh mục các User Stories

| Story | Tên User Story | Trọng tâm kỹ thuật | Độ ưu tiên |
| :--- | :--- | :--- | :---: |
| **Story 13.1** | Trung Tâm Điều Hành & Bảng Thống Kê Tổng Quan (Admin Dashboard KPIs) | Trang `/admin`, Thống kê kho hàng, User metrics, Ingestion metrics | P0 |
| **Story 13.2** | Quản Lý Thành Viên Toàn Diện & Phân Quyền Linh Hoạt (Full User Management) | Danh sách thành viên, Search/Filter, Đổi Role, Khóa khẩn cấp, Reset mật khẩu | P0 |
| **Story 13.3** | Nhật Ký Truy Vết & Chống Rò Rỉ Số Chủ Nhà (Audit Log & Security Oversight) | Landlord Phone Access Logs, Action Tracking, IP/Device Stamp | P0 |
| **Story 13.4** | Bảng Xếp Hạng & Báo Cáo Hiệu Suất CTV (Broker Performance Analytics) | Leaderboard, Đếm tin duyệt, Đếm lượt chia sẻ link, Tỷ lệ chốt cọc | P1 |
| **Story 13.5** | Cấu Hình Nguồn Thu Thập Tin & Tham Số Hệ Thống (Ingestion & System Config) | Quản lý Telegram Chat ID nguồn trên UI, Bật/tắt AI Auto-approve | P1 |
| **Story 13.6** | Trung Tâm Xử Lý Báo Cáo Vi Phạm & Làm Sạch Bảng Hàng (Listing Moderation) | Hàng đợi báo lỗi từ CTV (Story 11.4), 1-click gỡ/sửa tin, Điểm tín nhiệm | P1 |
| **Story 13.7** | Chuyển Số Điện Thoại & Tên Chủ Nhà Thành Tùy Chọn (Optional Landlord Contact) | Nới lỏng validation backend, Form nhập liệu linh hoạt, Quản lý nguồn liên kết | P0 |
| **Story 13.8** | Hai Lựa Chọn Nhập Vị Trí: Địa Chỉ Trực Tiếp hoặc Link Maps (Dual Location Input) | 2 chế độ nhập vị trí (Gõ địa chỉ vs Dán link Google Maps), Không ép buộc dán link | P0 |

---

### User Story 13.1: Trung Tâm Điều Hành & Bảng Thống Kê Tổng Quan (Admin Dashboard KPIs)
* **Là một:** Quản trị viên cao cấp (Admin).
* **Tôi muốn:** Có một trang Dashboard riêng (`/admin`) hiển thị bức tranh toàn cảnh về kho hàng, thành viên, dữ liệu thu thập và lượt khách truy cập.
* **Để:** Nắm bắt nhịp độ vận hành của toàn bộ hệ thống trong 5 giây mà không cần kiểm tra thủ công từng bảng.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Menu Điều Hướng Riêng Cho ADMIN:**
     * Khi tài khoản có `role === 'ADMIN'`, trên thanh Navbar (Desktop) và Menu Tài khoản (Mobile) xuất hiện thêm mục `[⚙️ Quản trị Admin]` dẫn tới `/admin`.
     * Trang `/admin` được bảo vệ bằng Route Guard: Chỉ duy nhất `role: 'ADMIN'` mới được truy cập; các role khác tự động chuyển hướng về `/apartments`.
  2. **Thẻ Chỉ Số Kinh Doanh Cốt Lõi (Executive KPI Cards):**
     * **Kho căn hộ:** Tổng số căn, phân loại theo trạng thái: `Trống (AVAILABLE)` · `Sắp trống (UPCOMING)` · `Đã cọc (DEPOSITED)` · `Đã thuê (RENTED)`.
     * **Đội ngũ môi giới:** Tổng số thành viên (`X Quản lý · Y CTV`), số tài khoản `PENDING` đang chờ duyệt (kèm badge cảnh báo đỏ nếu $> 0$).
     * **Cào tin tự động (Ingestion Health):** Số tin cào về trong 24h qua, số tin được AI trích xuất thành công, số tin rác/tin trùng bị thuật toán dHash chặn lại.
     * **Tương tác thị trường:** Tổng lượt khách xem trang công khai (`/p/:slug`), số lượng Lead mới được tạo trong tuần.
  3. **Biểu Đồ Trực Quan (Zero Heavy Libraries):**
     * Sử dụng biểu đồ thanh / tỷ lệ phần trăm bằng CSS thuần & Tailwind (không kéo thư viện biểu đồ nặng nề):
       * Phân bố căn theo phân khu Đà Nẵng: Mỹ An, An Thượng, Sơn Trà, Hải Châu, Ngũ Hành Sơn.
       * Biểu đồ tỷ lệ phân khúc giá: Dưới 5tr, 5-8tr, 8-12tr, trên 12tr.

---

### User Story 13.2: Quản Lý Thành Viên Toàn Diện & Phân Quyền Linh Hoạt (Full User Management & Role Controls)
* **Là một:** Admin hệ thống.
* **Tôi muốn:** Xem danh sách toàn bộ người dùng, tìm kiếm theo tên/SĐT/mã CTV, thay đổi vai trò (thăng cấp CTV lên Quản lý) và khóa tài khoản khi cần.
* **Để:** Chủ động quản trị nhân sự, trao quyền cho nhân viên tin cậy và ngăn chặn kịp thời các tài khoản có hành vi gian lận.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Bảng Danh Sách Người Dùng Toàn Diện (`/admin/users`):**
     * Hiển thị danh sách tất cả tài khoản với đầy đủ thông tin: Họ tên, Số điện thoại (Zalo), Mã `ctvCode`, Vai trò (`ADMIN`, `MANAGER`, `COLLABORATOR`), Trạng thái (`ACTIVE`, `PENDING`, `BLOCKED`), Ngày tham gia.
     * Bộ lọc nhanh theo Tab: `Tất cả` · `Chờ duyệt (Pending)` · `Quản lý` · `CTV` · `Bị khóa (Blocked)`.
     * Thanh tìm kiếm tức thời theo Tên, SĐT hoặc Mã CTV.
  2. **Thay Đổi Vai Trò Thành Viên (Role Assignment):**
     * Admin có thể bấm menu thao tác trên từng người dùng:
       * **Thăng cấp lên Quản lý (Promote to Manager):** Cấp quyền nạp tin, xem số chủ nhà và duyệt tin đăng CTV.
       * **Giáng cấp về CTV (Demote to Collaborator):** Thu hồi quyền xem số chủ nhà, ẩn link maps nhạy cảm.
     * **Bảo vệ an toàn:** Hệ thống không cho phép Admin tự hạ quyền chính mình hoặc khóa tài khoản Admin duy nhất còn lại để tránh mất quyền quản trị.
  3. **Khóa Tài Khoản Khẩn Cấp (Emergency Kill-Switch):**
     * Khi bấm `[Khóa tài khoản]`: Trạng thái chuyển sang `BLOCKED`.
     * **Vô hiệu hóa tức thì:** Ngắt kết nối phiên đăng nhập ngay lập tức, từ chối mọi yêu cầu API tiếp theo từ tài khoản này.
  4. **Đặt Lại Mật Khẩu Tạm Thời (Reset Password Assistance):**
     * Cung cấp nút `[Reset mật khẩu]`: Hệ thống tạo một mật khẩu tạm ngẫu nhiên hiển thị cho Admin để gửi cho thành viên khi họ quên mật khẩu.

---

### User Story 13.3: Nhật Ký Truy Vết & Chống Rò Rỉ Số Chủ Nhà (Audit Log & Security Oversight)
* **Là một:** Admin và Chủ sở hữu doanh nghiệp môi giới.
* **Tôi muốn:** Hệ thống tự động ghi lại nhật ký mỗi khi có ai đó bấm xem số điện thoại chủ nhà hoặc thực hiện các thao tác sửa/xóa/đổi giá căn hộ.
* **Để:** Bảo vệ tài sản thông tin cốt lõi của công ty (nguồn hàng chủ nhà), phát hiện kịp thời tình trạng tuồn dữ liệu và có bằng chứng rõ ràng khi xảy ra tranh chấp.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Ghi Nhận Tự Động Nhật Ký Xem Số Chủ Nhà (Landlord Phone Access Log):**
     * Mỗi khi API trả về số điện thoại chủ nhà hoặc địa chỉ Google Maps riêng tư cho người dùng (Manager/Admin):
       * Tự động tạo một bản ghi `AuditLog`: `userId`, `userName`, `userRole`, `apartmentId`, `apartmentTitle`, `action: 'UNMASK_OWNER_CONTACT'`, `ipAddress`, `timestamp`.
  2. **Ghi Nhận Các Thao Tác Trọng Yếu Khác:**
     * Đổi trạng thái căn sang `DEPOSITED` / `RENTED` / `AVAILABLE`.
     * Chỉnh sửa giá phòng hoặc xóa căn hộ khỏi bảng hàng.
     * Duyệt hoặc từ chối tin đăng CTV.
  3. **Giao Diện Tra Cứu Nhật Ký (`/admin/audit-logs`):**
     * Bảng nhật ký trực quan: Thời gian, Người thực hiện, Thao tác, Đối tượng (Căn hộ / Người dùng).
     * Bộ lọc theo loại hành động: `Xem số chủ nhà`, `Đổi trạng thái`, `Xóa căn`.
     * Giúp Admin dễ dàng trả lời câu hỏi: *"Trong tuần qua, ai đã mở xem số điện thoại chủ nhà căn 302 Monarchy?"*.

---

### User Story 13.4: Bảng Xếp Hạng & Báo Cáo Hiệu Suất CTV (Broker Performance Leaderboard)
* **Là một:** Admin điều hành mạng lưới CTV.
* **Tôi muốn:** Xem bảng xếp hạng mức độ hoạt động và hiệu suất của từng CTV (số tin đã đóng góp, số lượt chia sẻ link xem phòng, số khách đang chăm sóc).
* **Để:** Khen thưởng các CTV xuất sắc, nắm bắt mức độ tích cực của đội ngũ và thanh lọc các tài khoản không hoạt động.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Bảng Xếp Hạng Đóng Góp Nguồn Hàng:**
     * Thống kê số lượng tin đăng mà CTV đã gửi lên qua form `Submissions` và tỷ lệ được duyệt thành công.
     * Gắn huy hiệu vinh danh: `Top Contributor` cho top 3 CTV đóng góp nhiều nguồn hàng chất lượng nhất.
  2. **Thống Kê Tương Tác Bán Hàng:**
     * Đếm tổng số lượt link xem phòng được tạo qua mã `?ref=ctvCode` của CTV đó.
     * Số lượt khách thực tế đã truy cập vào các link của CTV.
     * Số lượng Lead (Khách tìm phòng) CTV đang quản lý trong phễu CRM.
  3. **Xuất Báo Cáo Nhanh (Export Summary):**
     * Nút xuất dữ liệu ra file CSV/Excel rút gọn để Admin tính toán thưởng hoa hồng tháng minh bạch.

---

### User Story 13.5: Cấu Hình Nguồn Thu Thập Tin & Tham Số Hệ Thống (Ingestion & System Config)
* **Là một:** Admin hệ thống.
* **Tôi muốn:** Quản lý danh sách các nhóm Telegram cào tin, bật/tắt chế độ duyệt tin tự động và tùy chỉnh thông điệp của công ty trực tiếp trên web mà không cần sửa code.
* **Để:** Linh hoạt điều chỉnh việc thu thập dữ liệu bất cứ lúc nào khi có nhóm chat mới hoặc khi muốn thay đổi quy trình kiểm duyệt.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Quản Lý Nhóm Telegram Nguồn (`/admin/settings`):**
     * Danh sách các Telegram Chat ID đang được Bot lắng nghe tin nhắn.
     * Admin có thể bấm `[+ Thêm nhóm]`: Nhập Chat ID và tên gợi nhớ của nhóm.
     * Có nút gạt `[Bật / Tạm dừng]` cào tin cho từng nhóm mà không cần khởi động lại server.
  2. **Quy Chế Duyệt Tin Tự Động (Automation Policy):**
     * Tùy chọn chế độ nạp tin AI:
       * `Chế độ An toàn (Mặc định)`: Mọi tin AI parse được đều đưa vào danh sách Chờ duyệt (`needsReview: true`).
       * `Chế độ Bán tự động`: Tin có độ tin cậy AI $> 90\%$ và không trùng lặp ảnh được tự động đưa thẳng lên bảng hàng `AVAILABLE`.
  3. **Cấu Hình Nhận Diện Thương Hiệu Chung:**
     * Tùy chỉnh SĐT hotline tổng đài, link Fanpage/Zalo OA chính thức của ApartmentDN hiển thị ở chân trang xem phòng công khai.

---

### User Story 13.6: Trung Tâm Xử Lý Báo Cáo Vi Phạm & Làm Sạch Bảng Hàng (Listing Moderation)
* **Là một:** Admin quản lý chất lượng kho dữ liệu.
* **Tôi muốn:** Nhận danh sách các căn hộ bị cộng đồng CTV báo lỗi (từ Story 11.4: "Đã cho thuê", "Chủ tăng giá", "Số điện thoại sai") và xử lý nhanh trong 1 chạm.
* **Để:** Giữ cho kho dữ liệu luôn sạch, chính xác và đáng tin cậy 100%, không để tin ảo tồn tại trên bảng hàng.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Hàng Đợi Căn Bị Báo Lỗi (`/admin/moderation`):**
     * Danh sách các căn nhận được $\ge 1$ lượt báo lỗi từ CTV kèm lý do chi tiết:
       * `Đã cho thuê / Hết phòng` (Hiển thị số lượng CTV cùng báo).
       * `Chủ tăng giá` (Kèm giá mới do CTV ghi chú nếu có).
       * `Không liên lạc được chủ nhà`.
       * `Ảnh không đúng thực tế`.
  2. **Thao Tác Xử Lý Nhanh (1-Click Actions):**
     * `[Chuyển Đã Thuê (RENTED)]`: Ngay lập tức ẩn căn khỏi danh sách trống, đồng thời kích hoạt bộ đếm hợp đồng.
     * `[Cập nhật Giá]`: Mở nhanh ô sửa giá và lưu ngay.
     * `[Bỏ qua Báo lỗi]`: Xác nhận thông tin vẫn đúng, gỡ cờ cảnh báo `[Cần xác minh]`.
  3. **Ghi Nhận Điểm Tín Nhiệm (Trust Score):**
     * Khi Admin xác nhận báo lỗi của CTV là đúng: Tự động cộng điểm tín nhiệm cho CTV đó.
     * Ngăn chặn việc CTV cố tình báo lỗi sai để "dìm" hàng của môi giới khác.

---

### User Story 13.7: Chuyển Số Điện Thoại & Tên Chủ Nhà Thành Tùy Chọn (Optional Landlord Contact)
* **Là một:** Quản lý (Manager) hoặc CTV đang đăng tin căn hộ mới lên hệ thống.
* **Tôi muốn:** Trường số điện thoại và tên chủ nhà (`ownerContact.phone`, `ownerContact.name`) trở thành trường **Tùy chọn (Optional)**, không còn bắt buộc phải nhập.
* **Để:** Tôi có thể nhanh chóng lưu trữ các căn hộ thuộc nguồn liên kết, căn hộ đối tác môi giới, hoặc các căn chủ nhà chỉ trao đổi qua Zalo/mạng xã hội mà không bị chặn form hoặc phải điền bừa số điện thoại ảo làm bẩn dữ liệu hệ thống.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Nới Lỏng Ràng Buộc Dữ Liệu Backend (Schema & Validation):**
     * Trong `apartment.model.ts`: Sửa trường `ownerContact.name` và `ownerContact.phone` thành optional (`required: false`).
     * Trong `apartment.validation.ts`:
       * `createApartmentSchema`: Sửa `ownerContact.name` thành `z.string().optional()`.
       * Sửa `ownerContact.phone`: Nếu để trống (`""` hoặc `undefined`) $\rightarrow$ hợp lệ; nếu có nhập $\rightarrow$ kiểm tra đúng định dạng số điện thoại Việt Nam (`vnPhone`).
     * Áp dụng tương tự cho `submissionDataSchema` (CTV gửi tin đăng duyệt).
  2. **Giao Diện Nhập Liệu Linh Hoạt (`ApartmentModal.tsx` & form CTV):**
     * Bỏ dấu sao đỏ bắt buộc (`*`) ở nhãn "Tên chủ nhà" và "Số điện thoại".
     * Thêm nhãn phụ `(Tùy chọn)` hoặc placeholder rõ ràng: *"0905... (để trống nếu là nguồn liên kết)"*.
     * Không còn thông báo lỗi chặn Submit khi người dùng để trống số điện thoại chủ nhà.
  3. **Hiển Thị Thông Tin Trong Chi Tiết Căn Hộ (`ApartmentDetailModal.tsx`):**
     * Khi căn hộ không có số điện thoại chủ nhà:
       * Thay vì để trống hoặc báo lỗi, hiển thị nhãn nhẹ: *"Chưa có SĐT chủ (Nguồn liên kết / Đang cập nhật)"*.
       * Nút "Gọi chủ nhà" chuyển sang trạng thái mờ (disabled) hoặc ẩn gọn gàng, tránh gây hiểu lầm cho Quản lý.

---

### User Story 13.8: Hai Lựa Chọn Nhập Vị Trí: Địa Chỉ Trực Tiếp hoặc Link Maps (Dual Location Input Mode)
* **Là một:** CTV hoặc Quản lý đang nạp thông tin căn hộ trên điện thoại hoặc máy tính.
* **Tôi muốn:** Có 2 sự lựa chọn nhập vị trí rõ ràng: hoặc gõ thẳng địa chỉ trên app (tên đường, số nhà/kiệt, khu vực), hoặc dán link Google Maps nếu có sẵn link.
* **Để:** Thao tác nhập vị trí nhanh chóng, không bị phụ thuộc vào việc phải mở app Google Maps tìm link rồi copy dán qua lại gây mất thời gian khi đang di chuyển ngoài đường.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Giao Diện 2 Lựa Chọn Trực Quan (Dual-Mode Switcher / Tabs):**
     * Trong phần `Vị trí` (`LocationSection.tsx`), cung cấp 2 chế độ nhập liệu bằng nút gạt trực quan (Segmented Tabs / Radio Chips):
       * `[📍 Nhập địa chỉ trực tiếp]` (Mặc định).
       * `[🔗 Dán link Google Maps]`.
  2. **Lựa Chọn 1: Nhập Địa Chỉ Trực Tiếp (Direct Address Input):**
     * Người dùng chỉ cần chọn Khu vực (Mỹ An, An Thượng, Sơn Trà...), gõ Tên đường (bắt buộc) và Số nhà/kiệt (tùy chọn).
     * **Không bắt buộc link Google Maps:** Hệ thống tự động tạo chuỗi địa chỉ đầy đủ: `[Số nhà] [Tên đường], [Phường], [Quận/Khu vực], Đà Nẵng`.
     * Tự động ước lượng tọa độ địa lý (Geocoding) dựa trên Tên đường và Khu vực có sẵn trong từ điển địa danh Đà Nẵng để ghim vị trí tương đối và tính khoảng cách ra biển.
  3. **Lựa Chọn 2: Dán Link Google Maps (Map Link Pasting):**
     * Dành cho trường hợp người dùng có sẵn link vị trí (từ Zalo, Google Maps share, hoặc tin cào):
       * Ô nhập link hỗ trợ mọi định dạng: `https://maps.app.goo.gl/...`, `https://goo.gl/maps/...`, `https://www.google.com/maps?q=lat,lng...`.
       * Nếu link chứa tọa độ trực tiếp, hệ thống tự động trích xuất `lat, lng` chính xác.
     * Người dùng vẫn có thể chọn Khu vực và gõ Tên đường hiển thị cho khách thuê.
  4. **Thống Nhất Dữ Liệu & Bảo Vệ Quyền Lợi:**
     * Cả 2 cách đều đảm bảo tuân thủ nguyên tắc 2 tầng địa chỉ: Khách thuê trên landing page công khai chỉ thấy Tên đường + Khu vực; còn địa chỉ chi tiết (số nhà) hoặc link Google Maps chỉ Quản lý và CTV có quyền mới xem được.
