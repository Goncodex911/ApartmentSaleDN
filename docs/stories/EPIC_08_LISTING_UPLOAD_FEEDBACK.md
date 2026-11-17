# EPIC-08: Chuẩn hóa Nhập tin Căn hộ theo Feedback Khách hàng (Listing Upload Revamp)

## Mục tiêu
Làm lại chức năng nhập/đăng thông tin căn hộ (form Quản lý, Nhập nhanh, tin AI) cho khớp cách khách hàng thực sự làm việc ở Đà Nẵng:
form gọn hơn, đúng bộ khu vực và tiện ích khách dùng, địa chỉ an toàn khi gửi khách. Đồng thời sửa các lỗi phát hiện khi rà soát.

**Nguồn:** Feedback khách hàng (17/11/2026) + rà soát code nhánh `feat/epic-07-danang-market`.

---

## Kết quả rà soát hiện trạng

### A. Đối chiếu từng ý feedback

| # | Feedback | Hiện trạng | Story |
|---|---|---|---|
| 1 | Bỏ tiền cọc | Form có ô "Tiền cọc"; bài gửi khách ghi "(Cọc 1 tháng)", trang khách ghi "Đặt cọc", chi tiết ghi "Cọc ...". AI tự bóc cọc | 8.2 |
| 2 | Bỏ loại hoa hồng | Form có ô chọn % / số tiền cứng | 8.2 |
| 3 | Bỏ mức hoa hồng | Form mặc định 50; tin AI tự gán 50%; thẻ và chi tiết hiện "HH 50%" | 8.2 |
| 4 | Địa chỉ cụ thể lưu link map | Chỉ có ô chữ "Địa chỉ cụ thể"; tọa độ chỉ ước lượng theo tâm quận (sai số vài km) | 8.3 |
| 5 | Bài gửi khách chỉ ghi tên đường | Bài gửi khách & trang khách chỉ ghi phường + quận, KHÔNG có tên đường | 8.3 |
| 6 | Thiếu loại căn hộ | Chỉ có số phòng ngủ + nội thất; không có loại (căn hộ / studio / nhà nguyên căn / villa...) | 8.4 |
| 7 | Khu vực theo danh sách: My An, Son Tra, Hai Chau, An Hai, Khue My, Ngu Hanh Son, Hoa Xuan | Hệ thống lưu theo quận cũ (8 khu). Danh sách khách trộn **phường** (Mỹ An, Khuê Mỹ, An Hải, Hòa Xuân) với **quận** (Sơn Trà, Hải Châu, Ngũ Hành Sơn) | 8.4 |
| 8 | Thiếu minimum rental 1, 3, 6 | Đã có ô "Thuê tối thiểu (tháng)" (Story 7.2) nhưng là ô số tự do, không phải lựa chọn 1/3/6 | 8.4 |
| 9 | Tiện ích: pool, gym, thang máy, pet friendly, parking, bathtub, river view, sea view, sauna, wifi free, cleaning | **Đã có:** pool, thang máy, pet, parking (tách ô tô / xe máy), wifi, cleaning. **Thiếu:** gym, bathtub, river view, sea view, sauna. **Thừa (khách không dùng):** ban công, PCCC, máy giặt, bao điện/nước/giặt là | 8.5 |

### B. Lỗi phát hiện thêm khi rà soát ("Tìm bug")

| Mức | Lỗi | Hậu quả |
|---|---|---|
| **Cao (bảo mật)** | API `/ingestion/quick-paste`, `/process-listing`, `/extension-import` chỉ kiểm tra đăng nhập, **không kiểm tra vai trò** | CTV (hoặc tài khoản bất kỳ) gọi thẳng API là tạo được căn vào kho, đứng tên chính CTV đó, và tiêu tốn hạn mức Gemini. Trên giao diện, form "Thêm căn" thì đã chặn đúng (chỉ Quản lý/Admin) |
| Cao | Form điền sẵn giá trị giả: diện tích 35m², Full nội thất, **có thang máy**, **PCCC đạt chuẩn**, điện 3.800đ, nước 30.000đ, dịch vụ 150.000đ, hoa hồng 50% | Quản lý không sửa thì căn bị lưu sai tiện ích và giá dịch vụ, CTV tư vấn sai cho khách |
| Trung bình | Trên điện thoại **không xóa được ảnh đã tải lên**: nút xóa chỉ hiện khi rê chuột (hover) | Quản lý dùng điện thoại tải nhầm ảnh thì không gỡ được |
| Trung bình | Form chưa theo chuẩn mobile: chữ 12px (iPhone tự phóng to khi bấm vào ô), ô nhập chỉ cao ~28px (khó bấm) | Vi phạm quy tắc Mobile-First của dự án |
| Trung bình | Khi sửa căn, **xóa trắng một ô số** (diện tích, khoảng cách biển, phí điện...) thì giá trị cũ vẫn giữ nguyên | Không gỡ được thông tin sai |
| Thấp | Ban công, máy giặt có trong bộ lọc/hiển thị nhưng form không có ô nhập | Không bao giờ đặt được bằng tay (sẽ tự hết khi làm Story 8.5) |
| Thấp | Placeholder tiêu đề còn ví dụ Hà Nội ("Doãn Kế Thiện") | Gây nhầm lẫn |
| Ghi chú | CTV **chưa có** chức năng đăng tin: mọi API tạo/sửa căn chỉ cho Quản lý/Admin | Khách đã xác nhận CTV được đăng, Quản lý duyệt → Story 8.6 |

---

### User Story 8.1: Sửa lỗi & khóa quyền luồng nhập tin
* **Là một:** Quản lý / Admin.
* **Tôi muốn:** Luồng nhập tin không lưu dữ liệu giả và chỉ người có quyền mới tạo được căn.
* **Để:** Kho căn hộ luôn đúng và an toàn.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. `/ingestion/quick-paste`, `/process-listing`, `/extension-import` chỉ cho `MANAGER`, `ADMIN` (CTV gọi → 403). Webhook có secret giữ nguyên.
  2. Form thêm căn không điền sẵn giá trị giả: ô số để trống, tiện ích mặc định không chọn, nội thất bắt buộc chọn.
  3. Xóa trắng ô khi sửa căn → giá trị bị gỡ thật (gửi `null`, backend `$unset`).
  4. Nút xóa ảnh luôn hiện trên điện thoại (không phụ thuộc hover), có `aria-label`.
  5. Form theo chuẩn mobile: chữ ô nhập ≥ 16px, ô bấm ≥ 44px, nút Lưu ghim cuối màn hình.
  6. Bỏ placeholder Hà Nội.

---

### User Story 8.2: Bỏ hẳn tiền cọc & hoa hồng
* **Là một:** Quản lý.
* **Tôi muốn:** Hệ thống không còn tiền cọc, loại hoa hồng, mức hoa hồng ở bất kỳ đâu.
* **Để:** Nhập tin nhanh hơn, đúng thực tế (cọc & hoa hồng thỏa thuận riêng, không gắn theo căn).
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. Form thêm/sửa căn không còn 3 ô trên.
  2. Bài gửi khách, trang khách xem, thẻ danh sách ("HH 50%"), chi tiết căn không còn hiển thị cọc và hoa hồng.
  3. AI bóc tin không trả cọc; tin AI không tự gán hoa hồng 50%; API không nhận/không trả 2 trường này.
  4. Dữ liệu cũ trong DB **không bị xóa** (không chạy lệnh phá hủy) — chỉ thôi dùng trong code.

---

### User Story 8.3: Địa chỉ 2 lớp — Link bản đồ (nội bộ) & Tên đường (gửi khách)
* **Là một:** Quản lý / CTV.
* **Tôi muốn:** Lưu link Google Maps của căn và một tên đường riêng để gửi khách.
* **Để:** Bấm 1 lần là mở đường đi dẫn khách xem phòng; khách chỉ biết tên đường, không biết số nhà.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. Form có ô **Link Google Maps** (không bắt buộc), ô **Tên đường \*** (bắt buộc) và ô **Số nhà / kiệt (nội bộ)**.
  2. Dán link có tọa độ (`@16.05,108.24` hoặc `?q=16.05,108.24`) → tự lấy tọa độ chính xác (tìm theo bán kính đúng hơn).
     Link rút gọn `maps.app.goo.gl` → backend tự mở link để lấy tọa độ (chỉ chấp nhận tên miền Google Maps, chống SSRF).
  3. Chi tiết căn (Quản lý, CTV) có nút **"Mở bản đồ"**. Trang khách và bài gửi khách **không bao giờ** có link map / số nhà.
  4. Bài gửi khách & trang khách ghi: `Tên đường, Khu vực` (VD "Bà Huyện Thanh Quan, Mỹ An").
  5. Tin AI: tự tách tên đường khỏi số nhà ("K12/3 Bà Huyện Thanh Quan" → "Bà Huyện Thanh Quan").
  6. Căn cũ chưa có tên đường: tự tách từ địa chỉ hiện có khi hiển thị (không cần chạy script).

---

### User Story 8.4: Loại căn hộ, Khu vực & Thuê tối thiểu
* **Là một:** Quản lý / CTV.
* **Tôi muốn:** Chọn loại căn, khu vực theo danh sách khách dùng, thời gian thuê tối thiểu.
* **Để:** Lọc và gửi khách theo đúng ngôn ngữ thị trường.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Loại căn** (bắt buộc, chọn 1): Căn hộ, Studio, Duplex, Penthouse, Nhà nguyên căn, Villa.
  2. **Khu vực** (bắt buộc, chọn 1, hiển thị có dấu): Mỹ An, Sơn Trà, Hải Châu, An Hải, Khuê Mỹ, Ngũ Hành Sơn, Hòa Xuân, **Khác**.
     - Lưu trường mới `area`; trường `district` (quận) **tự suy ra** để tìm theo quận & dữ liệu cũ vẫn chạy:
       Mỹ An / Khuê Mỹ / Ngũ Hành Sơn → quận Ngũ Hành Sơn; An Hải / Sơn Trà → quận Sơn Trà; Hải Châu → Hải Châu; Hòa Xuân → Cẩm Lệ.
     - "Ngũ Hành Sơn" = phần còn lại của quận ngoài Mỹ An, Khuê Mỹ (tương tự "Sơn Trà" = phần còn lại ngoài An Hải).
     - Chọn **Khác** → hiện thêm ô chọn quận (Thanh Khê, Liên Chiểu, Cẩm Lệ, Hòa Vang, Hội An...).
     - Bộ lọc có chip Khu vực; tìm "mỹ an" khớp khu vực Mỹ An; tìm "ngũ hành sơn" ra cả Mỹ An, Khuê Mỹ (theo quận).
     - AI bóc tin tự chọn khu vực; căn cũ được gán khu vực bằng script chạy thử trước (chỉ THÊM trường, không sửa/xóa trường cũ).
  3. **Thuê tối thiểu**: chọn 1 / 3 / 6 / 12 tháng. AI làm tròn lên mốc gần nhất (2 tháng → 3; 9 tháng → 12; trên 12 → 12).
  4. Thẻ, chi tiết, bài gửi khách hiển thị loại căn + khu vực + thuê tối thiểu.

---

### User Story 8.5: Bổ sung tiện ích (giữ tiện ích cũ, thêm mới, hiển thị tiếng Anh)
* **Là một:** Quản lý / CTV.
* **Tôi muốn:** Chọn đủ các tiện ích khách nước ngoài hay hỏi, tên hiển thị bằng tiếng Anh.
* **Để:** Nhập bằng vài chạm và lọc đúng thứ khách hỏi.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Giữ nguyên** tiện ích đang có, **thêm** 5 tiện ích mới: Gym, Bathtub, River view, Sea view, Sauna.
  2. Tên tiện ích hiển thị **tiếng Anh** ở form, bộ lọc, thẻ, chi tiết, trang khách, bài gửi khách:
     Pool, Gym, Elevator, Pet friendly, Parking (car / motorbike), Bathtub, River view, Sea view, Sauna, Free wifi, Cleaning,
     Balcony, Fire safety, Washing machine, Electricity/Water included, Laundry.
  3. Form: các tiện ích là chip bấm chọn nhiều (thay ô tick nhỏ), nhóm 11 mục khách dùng nhiều lên đầu.
  4. Bộ lọc thêm chip Gym, Sea view, River view (cạnh Pool, Gần biển). "Gần biển (<1km)" giữ riêng — khác "Sea view" (nhìn ra biển).
  5. Tìm câu tự nhiên & AI bóc tin hiểu: "gym", "phòng tập", "bồn tắm/bathtub", "view sông/river view", "view biển/sea view", "xông hơi/sauna".
  6. Không cần chuyển dữ liệu cũ (chỉ thêm trường mới, mặc định không có).

---

### User Story 8.6: CTV đăng tin — Quản lý duyệt mới lưu vào kho
* **Là một:** CTV.
* **Tôi muốn:** Đăng căn mình tìm được lên hệ thống.
* **Để:** Quản lý duyệt rồi đưa vào bảng hàng chung.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. CTV có nút **"Đăng tin"** dùng chung form (8.1–8.5). Tin gửi lên lưu ở **hàng chờ duyệt riêng** (collection `ListingSubmission`),
     **chưa vào kho căn hộ** → không xuất hiện ở tìm kiếm, ghép khách, chia sẻ, chat AI cho tới khi được duyệt.
  2. Quản lý có mục **"Tin chờ duyệt"** (có số đếm): xem, sửa nếu cần, **Duyệt** (tạo căn vào kho, đứng tên Quản lý duyệt,
     ghi nhận CTV đăng) hoặc **Từ chối** kèm lý do.
  3. CTV xem được danh sách tin mình đã đăng + trạng thái (Chờ duyệt / Đã duyệt / Từ chối + lý do); sửa hoặc rút tin khi còn Chờ duyệt.
  4. Thông báo Telegram: Quản lý nhận khi có tin mới chờ duyệt; CTV nhận khi tin được duyệt / bị từ chối.
  5. Khi duyệt, chạy khử trùng lặp như tin Telegram: căn đã có trong kho → gộp làm nguồn phụ thay vì tạo căn trùng.
  6. Giới hạn chống spam: tối đa 20 tin chờ duyệt / CTV.

---

## Quyết định của khách (17/11/2026)
1. CTV **được** đăng tin, **phải có Quản lý duyệt** mới lưu vào kho → làm Story 8.6.
2. **Bỏ hẳn** hoa hồng (và tiền cọc theo feedback ban đầu).
3. Loại căn: Căn hộ, Studio, Duplex, Penthouse, Nhà nguyên căn, Villa.
4. Khu vực hiển thị **có dấu**, có mục **Khác**; "Ngũ Hành Sơn" là phần còn lại của quận.
5. Thuê tối thiểu: **1 / 3 / 6 / 12** tháng.
6. Tiện ích cũ **giữ nguyên**, chỉ thêm mới.
7. Tên tiện ích hiển thị **tiếng Anh**.

## Thứ tự thực hiện
8.1 (sửa lỗi & bảo mật) → 8.2 → 8.3 → 8.4 → 8.5 → 8.6.
8.6 làm cuối vì dùng lại form đã hoàn thiện ở 8.1–8.5.
