# EPIC-03: Thu thập Tin Đa kênh & Khử Trùng lặp (Data Ingestion & De-duplication)

## Mục tiêu
Tự động hóa hoàn toàn quy trình đưa tin từ các hội nhóm Zalo, Telegram, Facebook vào hệ thống; dùng AI chuẩn hóa dữ liệu và loại bỏ hoàn toàn các tin trùng lặp hoặc tin rác.

---

### User Story 3.1: Thu thập tin nhắn từ Telegram / Chrome Extension
* **Là một:** Quản lý hệ thống.
* **Tôi muốn:** Hệ thống tự động nhận tin nhắn từ các nhóm Telegram nguồn hoặc nhận dữ liệu từ Chrome Extension (khi tôi lướt Facebook/Zalo Web).
* **Để:** Không phải ngồi đọc và copy thủ công từng bài đăng từ sáng đến tối.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Telegram Ingestion:** Module Telegram Listener lắng nghe các tin nhắn mới từ các group/channel nguồn được cấu hình.
  2. **Webhook API cho Extension:** Cung cấp 1 API endpoint bảo mật để nhận nội dung bài viết và link ảnh từ Chrome Extension khi người dùng click "Import tin".
  3. Tin nhắn thô (Raw text, hình ảnh gốc, thời gian, tên nguồn) được đưa vào hàng đợi xử lý (Job Queue).

---

### User Story 3.2: Trích xuất thông tin tự động bằng AI (LLM Parsing Engine)
* **Là một:** Hệ thống xử lý dữ liệu.
* **Tôi muốn:** Dùng mô hình ngôn ngữ (Gemini Flash) để phân tích đoạn văn bản tự do của người đăng tin thành cấu trúc JSON chuẩn.
* **Để:** Điền tự động vào các trường dữ liệu căn hộ mà không cần con người gõ lại.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. Trích xuất chính xác tối thiểu:
     * Quận, Tên đường/Ngõ.
     * Giá thuê (chuẩn hóa: *6tr5*, *6.5tr*, *6500k* $\rightarrow$ `6500000`).
     * Số phòng ngủ / Loại phòng (Studio, 1PN, 2PN, Duplex).
     * SĐT liên hệ của người đăng.
     * Các tiện ích chính (thang máy, ban công, nuôi thú cưng).
  2. Tốc độ parse dưới 1.5 giây mỗi bài.
  3. Xử lý fallback an toàn: Nếu AI không nhận diện được giá, gắn cờ `NEEDS_REVIEW` để người quản lý duyệt tay.

---

### User Story 3.3: Khử trùng lặp đa tầng (Multi-tier De-duplication)
* **Là một:** Quản lý và CTV.
* **Tôi muốn:** Khi có tin mới được đưa vào, hệ thống tự động kiểm tra xem căn hộ này đã tồn tại trong database hay chưa.
* **Để:** Bảng hàng không bị nhân bản hàng chục lần một căn phòng.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Tầng 1 (SĐT & Địa chỉ):** Khớp SĐT liên hệ và cùng địa chỉ/tên ngõ $\rightarrow$ Xác định trùng 100%, tự động gộp vào căn Master.
  2. **Tầng 2 (Perceptual Image Hash):** Tạo mã hash 64-bit cho ảnh bằng thuật toán `pHash`. Nếu bài viết mới có từ 2 bức ảnh có độ tương đồng > 85% với ảnh của một căn đã có $\rightarrow$ Đánh dấu trùng lặp ảnh.
  3. Nếu xác định trùng: Tự động bổ sung thông tin mới vào `subListings` của căn Master, không tạo căn mới độc lập.

---

### User Story 3.4: Bộ lọc tin rác & Phân loại bài đăng (Noise Filtering)
* **Là một:** Hệ thống.
* **Tôi muốn:** Tự động phát hiện và loại bỏ các bài viết "Cần tìm phòng", "Quảng cáo đồ gia dụng", "Tin lừa đảo/spam".
* **Để:** Chỉ lưu vào kho những tin thực sự là "Chính chủ/Môi giới cho thuê căn hộ".
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. Sử dụng bộ lọc từ khóa kết hợp Intent Classification của AI.
  2. Nếu phát hiện các câu như: *"Em sinh viên cần tìm phòng...", "Ai có phòng khu vực... inbox em"* $\rightarrow$ Bỏ qua, không lưu vào bảng hàng.
  3. Báo cáo tỷ lệ lọc tin rác trên Dashboard quản trị.

