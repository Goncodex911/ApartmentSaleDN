# EPIC-06: Mini-CRM & AI Auto-Chat Giữ chân Khách (Customer Retention & Bot)

## Mục tiêu
Giúp CTV và Quản lý không bị "bỏ quên" khách hàng, tự động phản hồi ngay khi khách nhắn tin ngoài giờ làm việc và theo dõi hành trình chuyển đổi từ lúc hỏi đến lúc chốt cọc.

---

### User Story 6.1: Quản lý Phễu Khách hàng (Lead Pipeline Kanban)
* **Là một:** CTV.
* **Tôi muốn:** Có một bảng quản lý danh sách khách hàng của mình theo từng giai đoạn (Kanban board hoặc danh sách).
* **Để:** Biết hôm nay cần gọi cho ai, ai chuẩn bị đi xem phòng, ai đang phân vân.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. Các giai đoạn khách hàng trực quan:
     * `MỚI LIÊN HỆ` (Khách vừa để lại thông tin hoặc nhắn tin).
     * `ĐANG TƯ VẤN` (Đã gửi căn cho khách xem).
     * `HẸN XEM PHÒNG` (Có lịch hẹn cụ thể ngày/giờ).
     * `ĐÃ ĐẶT CỌC` (Chốt deal thành công, ghi nhận doanh số).
     * `HỦY / KHÔNG HỢP` (Khách không thuê nữa kèm lý do).
  2. Kéo-thả hoặc chuyển trạng thái khách dễ dàng.
  3. Ghi chú nhanh (Quick note) tiến trình trao đổi của từng khách.

---

### User Story 6.2: AI Auto-Chat Giữ chân Khách (AI Virtual Assistant)
* **Là một:** Quản lý hoặc CTV khi đang bận/ngoài giờ làm việc (đêm muộn).
* **Tôi muốn:** Một trợ lý ảo AI tự động trò chuyện và phản hồi khách hàng khi họ nhắn tin vào trang web hoặc kênh kết nối.
* **Để:** Giữ chân khách ngay lập tức, không để khách đi hỏi bên môi giới khác vì phải chờ đợi lâu.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. AI phản hồi tự nhiên, lịch sự trong vòng 3 - 5 giây.
  2. Khả năng hỏi và thu thập thông tin nhu cầu:
     * Khu vực mong muốn thuê?
     * Ngân sách tối đa?
     * Khi nào muốn chuyển vào ở?
     * Có nuôi thú cưng hay đi ô tô không?
  3. Tự động truy vấn kho dữ liệu MongoDB và gửi ngay 2-3 căn phòng thực tế còn trống kèm hình ảnh để khách ngắm trước.
  4. Gửi thông báo (Telegram/Zalo notification) cho CTV: *"Khách [Tên/SĐT] vừa nhắn tin cần tìm phòng khu Cầu Giấy, hãy vào hỗ trợ!"*.

---

### User Story 6.3: Ghép căn tự động khi có hàng mới về (Auto-Matching Alerts)
* **Là một:** CTV đang có 5 khách hàng chưa tìm được phòng ưng ý.
* **Tôi muốn:** Khi hệ thống cào được một căn mới phù hợp với tầm giá và khu vực của các khách này, hệ thống sẽ báo ngay cho tôi.
* **Để:** Tôi là người đầu tiên gửi căn mới đó cho khách, tăng tỷ lệ chốt cọc lên cao nhất.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. Hệ thống chạy thuật toán so khớp nhu cầu khách (`targetDistricts`, `budget`) với căn hộ mới thêm vào.
  2. Bắn thông báo đẩy (In-app Notification): *"Có căn mới 1N1K Cầu Giấy 6.8tr rất hợp với khách [Anh Nam] của bạn. Bấm để gửi ngay!"*.
  3. CTV chỉ cần bấm nút là xuất thông tin gửi thẳng cho khách.

