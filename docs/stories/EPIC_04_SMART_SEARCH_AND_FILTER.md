# EPIC-04: Tìm kiếm Siêu tốc & Bộ lọc Thực tiễn (Smart Search & Faceted Filter)

## Mục tiêu
Tạo ra công cụ tìm kiếm chuẩn xác, linh hoạt, chịu lỗi tốt, hiểu được ngôn ngữ/từ lóng môi giới và cho phép CTV tìm ra căn hộ phù hợp trong vòng dưới 10 giây khi đang nghe điện thoại với khách hàng.

---

### User Story 4.1: Tìm kiếm mờ & Hiểu từ lóng môi giới (Atlas Fuzzy & Synonyms)
* **Là một:** CTV đang tìm phòng cho khách.
* **Tôi muốn:** Gõ các từ viết tắt, tiếng lóng hoặc gõ sai chính tả/không dấu trên thanh tìm kiếm mà vẫn trả về kết quả chính xác.
* **Để:** Thao tác cực nhanh mà không cần gõ câu chữ chuẩn mực.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. Cấu hình **Synonym Mapping** trong Atlas Search:
     * `ccmn` $\leftrightarrow$ `chung cư mini`
     * `chdv` $\leftrightarrow$ `căn hộ dịch vụ`
     * `1n1k` $\leftrightarrow$ `1 ngủ 1 khách` $\leftrightarrow$ `1 phòng ngủ`
     * `full đồ` $\leftrightarrow$ `đầy đủ nội thất`
     * `pet` $\leftrightarrow$ `chó mèo` $\leftrightarrow$ `thú cưng`
  2. **Fuzzy Search (Khoảng cách Levenshtein 1-2):** Gõ *"Dich Vong"* vẫn tìm được *"Dịch Vọng"*, gõ nhầm *"Cau Gay"* vẫn tìm được *"Cầu Giấy"*.
  3. Thời gian phản hồi API tìm kiếm < 300ms.

---

### User Story 4.2: Tìm kiếm theo Bán kính & Điểm mốc (Geospatial Radius Search)
* **Là một:** CTV.
* **Tôi muốn:** Tìm các căn phòng trong bán kính X km quanh trường đại học hoặc tòa nhà văn phòng của khách (Ví dụ: *"Quanh ĐH Quốc Gia bán kính 2km"*).
* **Để:** Đáp ứng chính xác nhu cầu đi lại hàng ngày của khách thuê.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. Tích hợp MongoDB Atlas `2dsphere` index trên trường `location.coordinates`.
  2. Cho phép người dùng gõ tên địa danh (sử dụng gợi ý địa điểm Geocoding) và chọn bán kính (1km, 2km, 3km, 5km).
  3. Trả về khoảng cách chính xác từ điểm mốc đến từng căn hộ trên kết quả tìm kiếm.

---

### User Story 4.3: Thanh lọc nhanh 1-chạm (1-Tap Faceted Filter)
* **Là một:** CTV sử dụng điện thoại.
* **Tôi muốn:** Có các tag lọc nhanh để bấm chọn tức thì thay vì phải mở nhiều dropdown phức tạp.
* **Để:** Lọc kết quả ngay lập tức bằng một ngón tay.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. Các tag nhanh hiển thị dạng cuộn ngang trên mobile:
     * Khoảng giá: `[< 5 triệu]` `[5 - 8 triệu]` `[8 - 12 triệu]` `[> 12 triệu]`
     * Loại phòng: `[Studio]` `[1PN / 1N1K]` `[2PN]` `[Duplex]`
     * Tiện ích hot: `[Thang máy]` `[Nuôi Pet]` `[Ô tô đỗ cửa]` `[Ban công thoáng]` `[PCCC đạt chuẩn]`
  2. Kết quả cập nhật tức thì (Instant Filter - không cần bấm nút "Áp dụng").

---

### User Story 4.4: Tìm kiếm bằng câu tự nhiên (AI Natural Language Search)
* **Là một:** CTV.
* **Tôi muốn:** Gõ hoặc dán nguyên đoạn tin nhắn của khách vào thanh tìm kiếm (Ví dụ: *"Khách cần tìm 1 ngủ 1 khách mạn Cầu Giấy tầm 7tr quay đầu có thang máy"*).
* **Để:** Hệ thống tự động phân tích và kích hoạt đúng các bộ lọc tương ứng.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. AI trích xuất các tiêu chí: `district: Cầu Giấy`, `type: 1N1K`, `price_max: 7000000`, `amenity: thang_may`.
  2. Tự động áp dụng vào query tìm kiếm và trả về danh sách căn phù hợp.

