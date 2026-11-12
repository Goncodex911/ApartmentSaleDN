# EPIC-05: Tính năng 1-Click Share (Thay thế Cap Màn hình)

## Mục tiêu
Giải quyết dứt điểm thói quen thủ công của CTV (phải chụp màn hình, vẽ tay che số điện thoại chủ, tải từng ảnh về máy). Chỉ với 1 hoặc 2 thao tác chạm, CTV có thể xuất trọn bộ thông tin chuyên nghiệp mang thương hiệu cá nhân để gửi cho khách.

---

### User Story 5.1: Copy Văn bản Mẫu Gửi Khách (1-Click Text Template)
* **Là một:** CTV.
* **Tôi muốn:** Bấm một nút "Copy tin gửi khách" trên bất kỳ căn hộ nào.
* **Để:** Dán ngay lập tức vào Zalo/Messenger của khách một bài tư vấn hoàn chỉnh, đẹp mắt mà không để lộ số chủ nhà.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. Nút bấm copy văn bản vào Clipboard trong vòng 1 chạm.
  2. Định dạng bài viết tự động điền các thông tin hấp dẫn kèm emoji:
     * *🏢 [QUẬN CẦU GIẤY] - CĂN 1N1K BAN CÔNG SIÊU THOÁNG*
     * *💵 Giá thuê: 7.200.000 VNĐ/tháng (Cọc 1 tháng)*
     * *🛋 Nội thất: Full đồ (Giường, tủ, điều hòa, tủ lạnh, bếp riêng)*
     * *🚗 Tiện ích: Thang máy, giờ giấc tự do, ô tô đỗ cửa*
     * *📞 Liên hệ xem phòng trực tiếp: [Tên CTV] - [SĐT Zalo CTV]*
  3. Tuyệt đối **không xuất hiện** số điện thoại hoặc ghi chú riêng của chủ nhà trong nội dung copy.

---

### User Story 5.2: Tải trọn bộ ảnh & Tự động chèn Watermark CTV
* **Là một:** CTV.
* **Tôi muốn:** Tải toàn bộ ảnh căn hộ về máy trong 1 file zip hoặc tải nhanh, ảnh tự động được gắn số điện thoại của tôi ở góc.
* **Để:** Khi gửi ảnh cho khách, khách không lấy ảnh đem hỏi môi giới khác hoặc chủ nhà khác.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. Nút "Tải toàn bộ ảnh" hoạt động mượt mà cả trên trình duyệt điện thoại và máy tính.
  2. Backend hỗ trợ tùy chọn tự động dán mờ (Watermark) số điện thoại của chính CTV đăng nhập vào góc dưới ảnh (sử dụng thư viện `sharp`).
  3. Lọc bỏ các ảnh có dán số điện thoại của nguồn gốc cũ.

---

### User Story 5.3: Sinh Landing Page xem phòng tức thì (Smart Shareable Link)
* **Là một:** CTV.
* **Tôi muốn:** Tạo ra một đường link rút gọn cho căn hộ (Ví dụ: `canho24h.vn/p/studio-full-do-hoang-quoc-viet?ref=HAI_CTV`).
* **Để:** Gửi cho khách mở xem trực tiếp trên điện thoại với giao diện sang trọng, chuyên nghiệp.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. Khách hàng mở link không cần đăng nhập tài khoản.
  2. Giao diện trang xem phòng chuẩn Mobile:
     * Trình xem ảnh dạng slide/vuốt mượt mà.
     * Hiển thị giá, các khoản phí dịch vụ rõ ràng, bản đồ vị trí chung.
     * Nổi bật ở chân màn hình (Bottom Bar) là thông tin CTV: **Tên CTV, Ảnh đại diện, Nút "Gọi ngay" (tel:), Nút "Chat Zalo" (zalo.me/sdt)**.
  3. Hoàn toàn ẩn danh thông tin chủ nhà và thông tin các nguồn thu thập.
  4. Đếm số lượt truy cập (View counter) để CTV biết khách đã mở xem link hay chưa.

