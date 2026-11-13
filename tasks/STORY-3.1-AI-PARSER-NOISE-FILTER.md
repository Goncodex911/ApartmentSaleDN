# STORY-3.1: Bộ não AI Bóc tách Tin BĐS & Lọc Tin Rác (Gemini LLM Parsing & Noise Filter)

## 1. Mô tả Story (User Story)
* **Là một:** Hệ thống xử lý dữ liệu tự động / Quản lý kho hàng căn hộ.
* **Tôi muốn:** Dùng mô hình ngôn ngữ lớn `Google Gemini 3.5 Flash Lite` với cấu hình Structured Output (JSON Schema) để đọc hiểu văn bản tin đăng tiếng Việt tự do và phân loại ý định (Intent Classification).
* **Để:** Tự động chuyển đổi mọi bài đăng viết tắt, dùng tiếng lóng BĐS (*1N1K, ccmn, 6tr5, full đồ, điện 3.8k, cọc 1...*) thành dữ liệu JSON có cấu trúc chuẩn của hệ thống, đồng thời phát hiện và loại bỏ triệt để các tin "cần tìm phòng" hoặc tin quảng cáo rác trước khi đưa vào kho.

---

## 2. Tiền điều kiện (Pre-conditions)
1. Biến môi trường `GEMINI_API_KEY` và `GEMINI_MODEL=gemini-3.5-flash-lite` đã được cấu hình và kiểm tra kết nối thành công với máy chủ Google AI Studio.
2. Mô hình dữ liệu Căn hộ (`Apartment`) từ Epic 02 đã sẵn sàng để tiếp nhận cấu trúc dữ liệu sau khi bóc tách.

---

## 3. Tiêu chí Chấp nhận (Acceptance Criteria - Gherkin)

### AC1: Nhận diện Ý định & Lọc Tin Rác (Noise & Intent Filtering)
* **Given:** Một đoạn văn bản thô bất kỳ được đẩy vào hệ thống từ Telegram, WhatsApp, Zalo hoặc nhập tay.
* **When:** Hệ thống gửi đoạn văn bản đến Gemini để phân tích ý định bài đăng.
* **Then:**
  * Nếu bài đăng là **Tin rác / Spam**:
    * Tin "Cần tìm phòng" (VD: *"Em là sinh viên nữ cần tìm phòng quanh Cầu Giấy tầm 3tr ở ghép..."*).
    * Tin quảng cáo dịch vụ (chuyển nhà trọn gói, lắp mạng wifi, dịch vụ vệ sinh...).
    * Tin vay tiền, tuyển dụng, bán đất nền/chung cư cao cấp mua bán.
    $\rightarrow$ Hệ thống trả về `isRentalListing: false`, trạng thái `REJECTED_NOISE`, kèm `rejectReason` rõ ràng và **không lưu vào Bảng hàng**.
  * Nếu bài đăng là **Tin cho thuê căn hộ/phòng trọ** thực tế $\rightarrow$ Trả về `isRentalListing: true` và kích hoạt luồng bóc tách dữ liệu chi tiết.

### AC2: Bóc tách Thông số BĐS Tiếng Việt Chuẩn xác (Structured Output)
* **Given:** Đoạn văn bản đã được xác nhận là tin cho thuê căn hộ.
* **When:** Gemini tiến hành trích xuất dữ liệu theo định dạng JSON Schema.
* **Then:** Các trường thông tin được chuẩn hóa chính xác như sau:
  * **Tiêu đề (`title`):** Tạo tiêu đề ngắn gọn chuẩn chuyên nghiệp (VD: *"Cho thuê căn 1N1K Doãn Kế Thiện, Cầu Giấy"*).
  * **Giá thuê (`price`):** Chuẩn hóa số nguyên VNĐ:
    * *"6tr5"*, *"6.5tr"*, *"6500k"*, *"6 triệu 5"* $\rightarrow$ `6500000`.
    * *"4tr8"* $\rightarrow$ `4800000`.
  * **Tiền cọc (`deposit`):**
    * *"Cọc 1 tháng"* $\rightarrow$ Bằng mức `price`.
    * *"Cọc 2 tháng"* $\rightarrow$ Bằng `price * 2`.
    * *"Cọc 5tr"* $\rightarrow$ `5000000`.
  * **Địa chỉ & Khu vực:**
    * `address`: Tên đường, số ngõ/ngách (VD: *"Số 25 ngõ 105 Doãn Kế Thiện"*).
    * `district`: Chuẩn hóa tên Quận tại Hà Nội (*Cầu Giấy, Nam Từ Liêm, Bắc Từ Liêm, Đống Đa, Thanh Xuân, Ba Đình, Tây Hồ, Hai Bà Trưng, Hoàng Mai, Hà Đông, Long Biên...*).
  * **Thuộc tính phòng:**
    * `area`: Diện tích tính theo số nguyên m² (VD: *"35m2"* $\rightarrow$ `35`).
    * `bedrooms`: Số phòng ngủ (*Studio = 1*, *1N1K = 1*, *2N1K = 2*, *3PN = 3*).
    * `furnishing`: *"Full đồ" / "Đầy đủ nội thất"* $\rightarrow$ `'FULL'`; *"Cơ bản (nóng lạnh, điều hòa)"* $\rightarrow$ `'BASIC'`; *"Phòng trống"* $\rightarrow$ `'EMPTY'`.
  * **Tiện ích (Booleans):**
    * `elevator`: Nhận diện *"thang máy"* $\rightarrow$ `true`, *"thang bộ"* $\rightarrow$ `false`.
    * `allowPets`: Nhận diện *"cho nuôi pet / chó / mèo"* $\rightarrow$ `true`.
    * `carParking`: Nhận diện *"ô tô đỗ cửa / vào nhà"* $\rightarrow$ `true`.
    * `pcccStandard`: Nhận diện *"pccc đạt chuẩn, thang thoát hiểm, cửa chống cháy"* $\rightarrow$ `true`.
  * **Phí dịch vụ:**
    * `fees.electricity`: *"Điện 3.8k"* $\rightarrow$ `3800` (đ/kWh).
    * `fees.water`: *"Nước 30k/khối"* hoặc *"100k/người"* $\rightarrow$ `30000`.
    * `fees.service`: Phí dịch vụ chung / mạng / vệ sinh.
  * **Thông tin liên hệ chủ nhà:**
    * `ownerContact.phone`: Số điện thoại đầu mối hợp lệ (chuẩn hóa 10 chữ số).
    * `ownerContact.name`: Tên chủ nhà hoặc người liên hệ nếu có (VD: *"chị Lan"*, *"bác Hùng"*).

### AC3: Cơ chế Dự phòng & Gắn nhãn Kiểm duyệt (Safe Fallback)
* **Given:** Một tin cho thuê thực sự nhưng người đăng ghi thiếu giá (*"Giá thỏa thuận"*, *"Giá ib"*, *"Giá siêu hạt dẻ"*) hoặc thiếu địa chỉ cụ thể.
* **When:** Hệ thống trích xuất thông tin.
* **Then:**
  * Gắn trạng thái `status: "NEEDS_REVIEW"`.
  * Lưu giữ toàn bộ nội dung gốc `rawText` để Quản lý có thể xem lại và cập nhật thủ công trên giao diện.

### AC4: Tốc độ Phản hồi & API Endpoint
* **Given:** Người dùng hoặc tiến trình tự động gọi API `POST /api/v1/ingestion/parse`.
* **When:** Payload chứa `{ "rawText": "nội dung tin đăng..." }`.
* **Then:**
  * Trả về HTTP `200 OK` với dữ liệu JSON đã bóc tách.
  * Thời gian phản hồi trung bình **dưới 1.2 giây/request**.

---

## 4. Phạm vi Kỹ thuật (Technical Implementation Scope)

### A. Cấu trúc File triển khai:
```plaintext
backend/src/modules/ingestion/
├── gemini.service.ts          # Core service tích hợp Google Gemini 3.5 Flash Lite
├── ingestion.validation.ts     # Zod schema validate input đầu vào
├── ingestion.controller.ts     # Controller xử lý request parse tin
├── ingestion.routes.ts         # Khai báo route POST /api/v1/ingestion/parse
└── gemini.prompt.ts           # System prompt tối ưu tiếng lóng BĐS VN & JSON Schema
```

### B. Tích hợp Router:
* Gắn router vào [backend/src/app.ts](file:///d:/CODE/AppartmentSaleProject/backend/src/app.ts):
  `app.use('/api/v1/ingestion', ingestionRoutes);`

---

## 5. Danh sách Kiểm thử & Định nghĩa Hoàn thành (Definition of Done)
- [ ] Test kịch bản 1: Tin đầy đủ tiếng lóng (*1N1K, 6tr5, full đồ, điện 3.8k*) $\rightarrow$ Parse chính xác 100%.
- [ ] Test kịch bản 2: Tin sinh viên cần tìm phòng $\rightarrow$ Phân loại thành công `REJECTED_NOISE`.
- [ ] Test kịch bản 3: Tin spam quảng cáo / dịch vụ $\rightarrow$ Bị từ chối `REJECTED_NOISE`.
- [ ] Test kịch bản 4: Tin cho thuê ghi *"giá inbox"* $\rightarrow$ Bóc tách thành công và gắn nhãn `NEEDS_REVIEW`.
- [ ] Kiểm tra thời gian phản hồi API đạt dưới 1.2 giây.
- [ ] Tuân thủ Ponytail: Mã nguồn gọn gàng, file < 250 dòng, xử lý lỗi an toàn không crash server.
- [ ] Tuân thủ [WORKING_RULES.md](file:///d:/CODE/AppartmentSaleProject/WORKING_RULES.md): Không tự ý commit git khi chưa được phép.

