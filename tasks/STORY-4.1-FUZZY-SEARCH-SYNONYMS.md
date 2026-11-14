# STORY-4.1: Tìm kiếm Mờ & Hiểu Từ Lóng Môi Giới (Atlas Fuzzy & Slang Synonyms)

## 1. Mô tả Story (User Story)
* **Là một:** Cộng tác viên môi giới (CTV) hoặc Quản lý kho phòng.
* **Tôi muốn:** Gõ các từ viết tắt, tiếng lóng bất động sản (*ccmn, chdv, 1n1k, full đồ, pet...*) hoặc gõ không dấu, gõ nhầm chính tả trên thanh tìm kiếm mà hệ thống vẫn trả về đúng các căn hộ phù hợp trong vòng dưới 300ms.
* **Để:** Thao tác tìm phòng cực nhanh bằng điện thoại chỉ trong vài giây khi đang trực tiếp nghe điện thoại tư vấn khách hàng.

---

## 2. Tiền điều kiện (Pre-conditions)
1. Cơ sở dữ liệu MongoDB Atlas đã có kho dữ liệu căn hộ (`apartments`) từ Epic 02 & Epic 03.
2. Collection `apartments` đã có các trường: `title`, `description`, `location.address`, `location.district`, `attributes.furnishing`, `attributes.allowPets`.
3. Token JWT đã hoạt động để xác định vai trò (`COLLABORATOR` sẽ được che số điện thoại chủ nhà theo quy chuẩn Story 1.2).

---

## 3. Tiêu chí Chấp nhận (Acceptance Criteria - Gherkin)

### AC1: Bảng Tra Từ Đồng Nghĩa & Tiếng Lóng BĐS (Synonyms Mapping)
* **Given:** Người dùng nhập từ khóa tìm kiếm có chứa tiếng lóng hoặc từ viết tắt.
* **When:** Hệ thống xử lý truy vấn tìm kiếm.
* **Then:** Tự động mở rộng và nhận diện tương đương 2 chiều giữa các cặp từ:
  * `ccmn` $\leftrightarrow$ `chung cư mini`
  * `chdv` $\leftrightarrow$ `căn hộ dịch vụ`
  * `1n1k` $\leftrightarrow$ `1 ngủ 1 khách` $\leftrightarrow$ `1 phòng ngủ`
  * `2n1k` $\leftrightarrow$ `2 ngủ 1 khách` $\leftrightarrow$ `2 phòng ngủ`
  * `full đồ` $\leftrightarrow$ `đầy đủ nội thất` $\leftrightarrow$ `attributes.furnishing: "FULL"`
  * `pet` $\leftrightarrow$ `chó mèo` $\leftrightarrow$ `thú cưng` $\leftrightarrow$ `attributes.allowPets: true`
  * `oto` $\leftrightarrow$ `ô tô` $\leftrightarrow$ `ô tô đỗ cửa` $\leftrightarrow$ `attributes.carParking: true`
  * `thang may` $\leftrightarrow$ `thang máy` $\leftrightarrow$ `attributes.elevator: true`

### AC2: Tìm Kiếm Mờ & Chịu Lỗi Chính Tả (Fuzzy Search - Levenshtein 1-2)
* **Given:** Người dùng gõ nhanh không dấu hoặc gõ nhầm ký tự.
* **When:** Thực hiện tìm kiếm trên các trường Tiêu đề, Tên đường, Quận, Mô tả.
* **Then:**
  * Gõ *"Dich Vong"* hoặc *"Dich Vong Hau"* $\rightarrow$ Tìm được căn hộ ở *"Dịch Vọng"*, *"Dịch Vọng Hậu"*.
  * Gõ nhầm *"Cau Gay"* $\rightarrow$ Vẫn tìm được căn hộ ở *"Cầu Giấy"*.
  * Gõ nhầm *"Doan Ke Thien"* $\rightarrow$ Vẫn tìm được căn hộ ở *"Doãn Kế Thiện"*.
  * Khoảng cách chỉnh sửa ký tự Levenshtein tối đa 1-2 lỗi gõ phím.

### AC3: Hiệu năng Phản hồi Siêu tốc (Latency < 300ms)
* **Given:** Hệ thống có hàng trăm hoặc hàng nghìn căn hộ trong cơ sở dữ liệu.
* **When:** Gọi API tìm kiếm `GET /api/v1/apartments/search?q=...`.
* **Then:**
  * Thời gian phản hồi của API đạt **dưới 300 mili-giây**.
  * Kết quả trả về có phân trang (`page`, `limit`), sắp xếp theo độ liên quan điểm số (Score / Relevance) cao nhất lên đầu.

### AC4: Tích hợp Giao diện Thanh Tìm Kiếm Trực quan
* **Given:** CTV mở thanh tìm kiếm trên Web App.
* **When:** CTV bắt đầu gõ từ khóa.
* **Then:**
  * Có cơ chế Debounce (300ms) để không spam request liên tục khi đang gõ phím.
  * Hiển thị các tag gợi ý từ lóng thông dụng để CTV bấm nhanh: `[ccmn]` `[1n1k]` `[full đồ]` `[nuôi pet]` `[thang máy]`.
  * Hiển thị danh sách kết quả thẻ căn hộ khớp tức thì, tuân thủ phân quyền che SĐT chủ nhà cho CTV.

---

## 4. Phạm vi Kỹ thuật (Technical Implementation Scope)

### A. Backend Architecture (`backend/src/modules/search/`):
```plaintext
backend/src/modules/search/
├── search.service.ts         # Service tìm kiếm thông minh: Atlas Search `$search` + Fallback Slang Expander & Fuzzy Regex
├── slang.dictionary.ts       # Từ điển tiếng lóng BĐS Việt Nam & quy tắc đồng nghĩa 2 chiều
├── search.controller.ts      # Controller xử lý request tìm kiếm
└── search.routes.ts          # Route GET /api/v1/apartments/search
```

### B. MongoDB Atlas Search Index Definition (File tài liệu cấu hình):
* Tạo file tài liệu [docs/ATLAS_SEARCH_INDEX.md](file:///d:/CODE/AppartmentSaleProject/docs/ATLAS_SEARCH_INDEX.md) chứa JSON Index Definition sẵn sàng để dán vào tab **Search** trên MongoDB Atlas UI nếu kích hoạt Atlas Search cấp cụm.
* Đảm bảo `search.service.ts` có cơ chế **Dual Engine**:
  1. Thử nghiệm `$search` của MongoDB Atlas nếu Search Index đã sẵn sàng.
  2. Tự động Fallback an toàn sang **Slang Expander & Diacritic-Insensitive Fuzzy Regex** để hệ thống luôn chạy mượt mà ngay cả khi chưa kích hoạt Atlas Search Index trên cụm.

### C. Frontend Integration:
* Cập nhật thanh tìm kiếm trong [frontend/src/components/apartment/ApartmentFilters.tsx](file:///d:/CODE/AppartmentSaleProject/frontend/src/components/apartment/ApartmentFilters.tsx):
  * Thêm các nút chip từ lóng gợi ý nhanh (`ccmn`, `1n1k`, `full đồ`, `pet`, `ô tô`).
  * Tích hợp thanh tìm kiếm thông minh kết nối với endpoint `/api/v1/apartments/search`.

---

## 5. Danh sách Kiểm thử & Định nghĩa Hoàn thành (Definition of Done)
- [ ] Test Kịch bản 1: Tìm kiếm `1n1k` $\rightarrow$ Trả về đúng các căn 1 phòng ngủ / 1 ngủ 1 khách.
- [ ] Test Kịch bản 2: Tìm kiếm `full đồ` $\rightarrow$ Trả về các căn hộ có nội thất `FULL` hoặc tiêu đề ghi đầy đủ đồ.
- [ ] Test Kịch bản 3: Tìm kiếm `pet` $\rightarrow$ Trả về các căn hộ cho nuôi thú cưng (`allowPets: true`).
- [ ] Test Kịch bản 4: Tìm kiếm gõ sai *"Cau Gay"* hoặc *"Dich Vong"* $\rightarrow$ Trả về đúng căn hộ ở Cầu Giấy / Dịch Vọng.
- [ ] Kiểm tra thời gian phản hồi API tìm kiếm đạt dưới 300ms.
- [ ] Kiểm tra phân quyền: CTV thấy SĐT chủ nhà dạng che `0912***678`.
- [ ] Tuân thủ Ponytail: Mã nguồn gọn gàng, file < 250 dòng, zero-bloat dependencies.
- [ ] Tuân thủ [WORKING_RULES.md](file:///d:/CODE/AppartmentSaleProject/WORKING_RULES.md): Không tự ý commit git khi chưa được phép.

