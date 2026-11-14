# STORY-4.4: Tìm kiếm bằng Câu Tự nhiên (AI Natural Language Search)

## 1. Mô tả Story (User Story)
* **Là một:** Cộng tác viên môi giới (CTV) hoặc Quản lý kho hàng.
* **Tôi muốn:** Gõ hoặc dán nguyên văn đoạn tin nhắn yêu cầu của khách thuê từ Zalo/Messenger vào ô tìm kiếm (Ví dụ: *"Khách cần tìm 1 ngủ 1 khách mạn Cầu Giấy tầm 7tr quay đầu có thang máy cho nuôi mèo"*).
* **Để:** Hệ thống tự động phân tích ngữ nghĩa tiếng Việt, trích xuất chuẩn xác các tiêu chí lọc (quận, loại phòng, khoảng giá, tiện ích) và hiển thị ngay danh sách căn hộ phù hợp nhất mà không cần tôi phải tự tay bấm chọn từng bộ lọc.

---

## 2. Tiền điều kiện (Pre-conditions)
1. Đã hoàn thiện các bộ lọc cơ bản, tìm kiếm mờ, bán kính điểm mốc và lọc nhanh 1-chạm (Stories 4.1, 4.2, 4.3).
2. Backend đã có kết nối với Google Gemini AI (hoặc fallback NLP Heuristic Engine bản địa không cần API key).
3. Đã có API tìm kiếm `GET /api/v1/apartments/search`.

---

## 3. Tiêu chí Chấp nhận (Acceptance Criteria - Gherkin)

### AC1: Trích xuất Thực thể Tiếng Việt Tự nhiên (NLP Entity Extraction)
* **Given:** CTV dán một câu tin nhắn tìm phòng tự do của khách vào ô tìm kiếm.
* **When:** Hệ thống tiến hành bóc tách ngữ nghĩa.
* **Then:** Trích xuất chính xác thành cấu trúc dữ liệu JSON gồm các trường:
  * `district`: Tên quận chuẩn hóa (Cầu Giấy, Đống Đa, Nam Từ Liêm, Thanh Xuân, v.v.).
  * `landmark`: Điểm mốc trường học/tòa nhà nếu có (ĐH Quốc Gia, Bách Khoa, Keangnam, v.v.).
  * `roomType`: Loại phòng (`studio`, `1pn`, `2pn`, `duplex`).
  * `minPrice` & `maxPrice`: Khoảng giá số thực (Hiểu được các cách nói giá phổ biến: *"tầm 7tr quay đầu"*, *"dưới 6 củ"*, *"khoảng 8 đến 10 triệu"*, *"từ 5 - 7tr"*).
  * `amenities`: Các tiện ích yêu cầu:
    * `elevator: true` (*"thang máy", "có thang máy"*).
    * `allowPets: true` (*"nuôi pet", "nuôi chó mèo", "pet"*).
    * `carParking: true` (*"ô tô đỗ cửa", "ô tô vào được"*).
    * `balcony: true` (*"ban công", "ban công thoáng"*).
    * `furnishing: "FULL"` (*"full đồ", "đầy đủ đồ"*).

### AC2: Động cơ Kép: Gemini AI & Zero-Latency Heuristic Rule Engine
* **Given:** Tin nhắn tự nhiên được gửi lên hệ thống.
* **When:** Thực thi phân tích câu.
* **Then:**
  * **Chế độ Ưu tiên (Gemini AI):** Sử dụng Gemini 2.5 Flash để hiểu các câu văn phức tạp, đảo ngữ, hàm ý hoặc tiếng lóng địa phương.
  * **Chế độ Dự phòng (Heuristic Rule-based Fallback):** Nếu không cấu hình `GEMINI_API_KEY`, rớt mạng hoặc gặp sự cố quota, tự động chuyển đổi sang bộ bóc tách Heuristic thuần TypeScript/Regex cực nhanh (< 30ms), đảm bảo hệ thống **100% không bao giờ bị nghẽn (Zero downtime)**.

### AC3: Hiển thị Thẻ Nhận diện Trực quan & Đồng bộ Bộ Lọc (Visual Feedback)
* **Given:** Câu tìm kiếm tự nhiên được phân tích xong.
* **When:** Kết quả trả về giao diện Web App.
* **Then:**
  * Hiển thị thanh thông báo nhận diện thông minh ngay dưới ô tìm kiếm:
    `🎯 AI đã hiểu: [📍 Cầu Giấy] [🛏️ 1N1K] [💰 ≤ 7.000.000 đ] [🛗 Thang máy] [🐾 Nuôi Pet]`.
  * Tự động kích hoạt (active) các chip tương ứng trên thanh lọc nhanh `FacetedFilterBar` và `ApartmentFilters`.
  * Cho phép CTV bấm vào từng tag nhận diện để tắt/bật nếu muốn điều chỉnh yêu cầu tìm kiếm.

### AC4: Lọc Bỏ Nhiễu & Chịu Lỗi Gõ Phím (Noise & Typo Tolerance)
* **Given:** Đoạn tin nhắn chứa nhiều từ ngữ thừa (Ví dụ: *"Alo em ơi khách anh là nữ đang cần tìm gấp phòng trọ mạn Cầu Giấy tầm 5 củ đổ lại..."*).
* **When:** Hệ thống xử lý bóc tách.
* **Then:**
  * Tự động loại bỏ các từ chào hỏi, xưng hô, râu ria vô nghĩa (*"alo em ơi"*, *"khách anh"*, *"đang cần tìm gấp"*, *"là nữ"*).
  * Giữ lại đúng trọng tâm tiêu chí: `district: "Cầu Giấy"`, `maxPrice: 5000000`.

---

## 4. Phạm vi Kỹ thuật (Technical Implementation Scope)

### A. Backend Architecture (`backend/src/modules/search/`):
```plaintext
backend/src/modules/search/
├── natural-search.service.ts   # Service bóc tách NLP (Dual: Gemini 2.5 Flash + Heuristic Regex Fallback)
├── search.service.ts           # Tích hợp phương thức searchNatural(rawText, options)
├── search.controller.ts        # Endpoint POST /api/v1/apartments/search/natural hoặc GET ?natural=true
└── search.routes.ts            # Khai báo route tìm kiếm bằng câu tự nhiên
```

### B. Frontend Architecture:
```plaintext
frontend/src/
├── api/apartmentApi.ts         # Thêm phương thức searchNaturalApartments(query: string)
├── components/apartment/
│   ├── NaturalSearchBanner.tsx # Hiển thị dải badge AI đã hiểu các tiêu chí (📍 Cầu Giấy, 💰 ≤ 7tr...)
│   └── ApartmentFilters.tsx    # Nút bấm kích hoạt AI Search & icon Sparkles
└── pages/ApartmentsPage.tsx    # Nhận diện tự động câu dài và đồng bộ với FacetedFilterBar
```

---

## 5. Danh sách Kiểm thử & Định nghĩa Hoàn thành (Definition of Done)
- [ ] Test Kịch bản 1: Nhập *"Khách cần tìm 1 ngủ 1 khách mạn Cầu Giấy tầm 7tr quay đầu có thang máy"* $\rightarrow$ Trích xuất đúng `district: Cầu Giấy`, `roomType: 1pn`, `maxPrice: 7000000`, `elevator: true`.
- [ ] Test Kịch bản 2: Nhập *"Quanh ĐH Bách Khoa dưới 5 củ cho nuôi mèo"* $\rightarrow$ Trích xuất đúng `landmark: ĐH Bách Khoa`, `maxPrice: 5000000`, `allowPets: true`.
- [ ] Test Kịch bản 3: Nhập câu không dấu *"tim phong tro cau giay full do tam 6tr"* $\rightarrow$ Trích xuất đúng `district: Cầu Giấy`, `furnishing: FULL`, `maxPrice: 6000000`.
- [ ] Test Kịch bản 4: Kiểm thử cơ chế Fallback hoạt động trơn tru ngay cả khi không có kết nối internet hoặc không có Gemini API key.
- [ ] Test Kịch bản 5: UI hiển thị huy hiệu nhận diện `🎯 AI đã hiểu: ...` và kích hoạt đúng các chip trên `FacetedFilterBar`.
- [ ] Tuân thủ Ponytail: Mọi file tạo mới hoặc sửa đổi đều $\le 250$ dòng, không sử dụng thư viện NLP bên thứ ba cồng kềnh.
- [ ] Tuân thủ [WORKING_RULES.md](file:///d:/CODE/AppartmentSaleProject/WORKING_RULES.md): Không tự ý commit git khi chưa được phép.

