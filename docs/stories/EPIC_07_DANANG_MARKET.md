# EPIC-07: Chuyển đổi sang Thị trường Đà Nẵng (Da Nang Market)

## Mục tiêu
Đưa hệ thống (vốn viết cho Hà Nội) về đúng thị trường Đà Nẵng: dữ liệu địa lý, AI bóc tin & tìm kiếm, các thông tin đặc thù khách nước ngoài hay hỏi.
Đồng thời sửa các lỗi nền tảng của nhập tin & tìm kiếm phát hiện khi chạy thử tin thật.

**Trạng thái:** Đã hoàn thành 7.0–7.3 (nhánh `feat/epic-07-danang-market`; 7.0–7.2 đã merge qua PR #12). Story chi tiết trong `tasks/`.

---

### User Story 7.0: Sửa lỗi nhập tin & tìm kiếm — `tasks/STORY-7.0-SEARCH-INGEST-BUGFIX.md`
Cờ "Cần kiểm tra" tách khỏi trạng thái; nhận diện quận theo nguyên từ; tìm câu tự nhiên giữ từ khóa còn lại; từ khóa kết hợp AND.

### User Story 7.1: Chuyển sang Đà Nẵng — `tasks/STORY-7.1-DANANG-MIGRATION.md`
Khu vực, phường → quận, 16 điểm mốc, prompt AI Đà Nẵng & tiếng Anh, gắn tọa độ khi nhập tin, khoảng giá mới.

### User Story 7.2: Trường đặc thù Đà Nẵng — `tasks/STORY-7.2-DANANG-MARKET-FIELDS.md`
Khoảng cách biển, hồ bơi, giá USD, thuê tối thiểu, dịch vụ bao gồm, chỗ để xe máy; bộ lọc Gần biển / Hồ bơi.

### Bổ sung: Tự thử lại khi Gemini quá tải
Lỗi 429/503/timeout → thử lại 2 lần (2s, 6s) để tin Telegram/Zalo không bị mất.

### User Story 7.3: Bài gửi khách & Trang xem phòng tiếng Anh — `tasks/STORY-7.3-ENGLISH-SHARE-AND-PUBLIC-PAGE.md`
CTV chọn "Tiếng Việt | English" khi gửi khách; bài copy & link (?lang=en) tiếng Anh; trang khách song ngữ có nút VI / EN.
