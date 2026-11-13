# STORY-3.2: Khử Trùng lặp Đa tầng (Multi-tier Deduplication & Image pHash)

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý kho hàng và Cộng tác viên môi giới (CTV).
* **Tôi muốn:** Khi một tin đăng căn hộ mới được đưa vào hệ thống từ bất kỳ nguồn nào (Telegram, WhatsApp, Zalo, Facebook), hệ thống tự động kiểm tra xem căn hộ này đã tồn tại trong cơ sở dữ liệu hay chưa qua 2 tầng kiểm tra: Tầng 1 (Định danh SĐT + Địa chỉ) và Tầng 2 (Nhận thức ảnh pHash).
* **Để:** Bảng hàng luôn sạch sẽ, không bị nhân bản hàng chục lần cùng một căn hộ từ nhiều nguồn khác nhau, đồng thời gom các mức giá khác nhau từ các môi giới về một Căn hộ Gốc (Master).

---

## 2. Tiền điều kiện (Pre-conditions)
1. **Story 2.3** (Mô hình Master - Sub Listings) đã hoàn thành, model `Apartment` đã có trường `subListings`.
2. **Story 3.1** (Gemini AI Parser) đã hoàn thành, có khả năng bóc tách đầy đủ SĐT, Địa chỉ, Giá và mảng URLs hình ảnh.
3. Collection `Apartment` trong MongoDB Atlas hỗ trợ lưu trữ mã hash ảnh để tra cứu nhanh.

---

## 3. Tiêu chí Chấp nhận (Acceptance Criteria - Gherkin)

### AC1: Khử trùng lặp Tầng 1 - So khớp Định danh (Deterministic Matching)
* **Given:** Một tin căn hộ mới được bóc tách có số điện thoại `ownerContact.phone` và địa chỉ `location.address`.
* **When:** Hệ thống tìm kiếm các căn hộ trong DB:
  * Khớp số điện thoại (so sánh trên cả `ownerContact.phone` của Master và `subListings.ownerContact.phone`).
  * Chuẩn hóa chuỗi địa chỉ (loại bỏ dấu tiếng Việt, chuyển chữ thường, so khớp tên đường/ngõ chính: ví dụ *"Doãn Kế Thiện"* == *"doan ke thien"*).
* **Then:**
  * Nếu cùng Quận VÀ trùng số điện thoại VÀ trùng tên đường/ngõ $\rightarrow$ Xác định **Trùng lặp 100% (Match Type: `DETERMINISTIC`)**.
  * Bỏ qua bước kiểm tra ảnh ở Tầng 2 để tiết kiệm tài nguyên xử lý.

### AC2: Khử trùng lặp Tầng 2 - So khớp Thị giác Ảnh (Perceptual Image Hash - pHash)
* **Given:** Tin đăng mới có SĐT khác nhau (môi giới khác nhau đăng lại cùng một phòng của chủ nhà) nhưng có chứa hình ảnh căn hộ.
* **When:** Hệ thống tính toán mã băm nhận thức 64-bit (`pHash` hoặc `dHash`) cho từng ảnh của bài viết mới và so sánh với kho mã hash của các căn hộ hiện có trong cùng Quận/Khu vực.
* **Then:**
  * Tính khoảng cách Hamming (Hamming Distance) giữa 2 chuỗi hash 64-bit.
  * Hai ảnh được coi là giống nhau nếu khoảng cách Hamming $\le 8$ (tương đương độ tương đồng $\ge 87.5\%$).
  * Nếu tin mới có **ít nhất 2 ảnh trùng khớp** với ảnh của một căn hộ trong hệ thống (hoặc $\ge 1$ ảnh nếu tin chỉ có 1 ảnh duy nhất) $\rightarrow$ Xác định **Trùng lặp thị giác (Match Type: `IMAGE_PHASH`)**.

### AC3: Tự động Gộp vào Căn Gốc (Master - Sub Aggregation)
* **Given:** Hệ thống phát hiện tin mới trùng lặp với một `Master Apartment` đã có trong hệ thống (qua Tầng 1 hoặc Tầng 2).
* **When:** Tiến hành lưu trữ kết quả.
* **Then:**
  * **Không tạo thêm căn hộ độc lập mới** trong collection `apartments`.
  * Tự động thêm một phần tử mới vào mảng `subListings` của căn Master:
    * `sourceType`: Nguồn bài viết (`TELEGRAM`, `WHATSAPP`, `ZALO`, `FACEBOOK`, `MANUAL`).
    * `sourceName`: Tên nhóm hoặc tên người đăng tin.
    * `sourceUrl`: Đường link bài đăng gốc (nếu có).
    * `price`: Mức giá mà nguồn này báo.
    * `ownerContact`: Thông tin liên hệ ghi nhận tại nguồn này.
    * `images`: Danh sách ảnh từ nguồn này.
    * `rawContent`: Nội dung gốc của bài đăng.
    * `postedAt`: Thời điểm bài viết được đăng.
  * Cập nhật thời điểm `updatedAt` của căn Master để đưa lên vị trí có hoạt động mới nhất.
  * Trả về kết quả: `{ isDuplicate: true, masterId: "...", matchType: "DETERMINISTIC" | "IMAGE_PHASH" }`.

### AC4: Tạo Căn Hộ Mới khi Không Trùng Lặp
* **Given:** Tin đăng mới không trùng khớp với bất kỳ căn hộ nào qua cả 2 tầng kiểm tra.
* **When:** Hệ thống hoàn tất kiểm tra.
* **Then:**
  * Tạo mới một bản ghi `Apartment` Master trong cơ sở dữ liệu.
  * Lưu trữ các mã hash ảnh tương ứng để phục vụ việc so khớp cho các bài đăng tiếp theo.
  * Căn hộ mới xuất hiện ngay trên Bảng hàng.
  * Trả về kết quả: `{ isDuplicate: false, apartmentId: "..." }`.

---

## 4. Phạm vi Kỹ thuật (Technical Implementation Scope)

### A. Cấu trúc Module Triển khai (`backend/src/modules/dedup/`):
```plaintext
backend/src/modules/dedup/
├── phash.util.ts         # Thuật toán tính perceptual hash 64-bit siêu nhẹ (Ponytail - zero bloat)
├── dedup.service.ts      # Service xử lý so khớp Tầng 1 (Định danh) & Tầng 2 (pHash)
└── dedup.types.ts        # Type definitions cho kết quả so khớp
```

### B. Cập nhật Model & Schema:
* Cập nhật [backend/src/modules/apartments/apartment.model.ts](file:///d:/CODE/AppartmentSaleProject/backend/src/modules/apartments/apartment.model.ts):
  * Bổ sung trường `imageHashes?: string[]` để lưu mảng mã hash 64-bit của các ảnh trong căn hộ, giúp tra cứu nhanh trong DB.

### C. Pipeline Controller & Route:
* Cập nhật [backend/src/modules/ingestion/ingestion.controller.ts](file:///d:/CODE/AppartmentSaleProject/backend/src/modules/ingestion/ingestion.controller.ts):
  * Thêm endpoint `POST /api/v1/ingestion/process-listing`: Pipeline hoàn chỉnh (Nhận text thô $\rightarrow$ Gemini parse $\rightarrow$ Lọc rác $\rightarrow$ Dedup đa tầng $\rightarrow$ Gộp Sub hoặc Tạo Master).

---

## 5. Danh sách Kiểm thử & Định nghĩa Hoàn thành (Definition of Done)
- [ ] Test Kịch bản 1: Cùng số điện thoại + cùng tên đường Doãn Kế Thiện $\rightarrow$ Phát hiện trùng tầng 1 `DETERMINISTIC`.
- [ ] Test Kịch bản 2: Khác số điện thoại nhưng 2 ảnh có cùng mã hash (hoặc ảnh nén nhẹ/crop) $\rightarrow$ Phát hiện trùng tầng 2 `IMAGE_PHASH`.
- [ ] Test Kịch bản 3: Khi trùng, kiểm tra mảng `subListings` của căn Master có được bổ sung chính xác nguồn, giá, và thời gian.
- [ ] Test Kịch bản 4: Tin hoàn toàn mới $\rightarrow$ Tạo mới căn Master thành công.
- [ ] Tuân thủ Ponytail: Mã nguồn gọn gàng, file < 250 dòng, thuật toán tính hash tối ưu không tốn CPU.
- [ ] Tuân thủ [WORKING_RULES.md](file:///d:/CODE/AppartmentSaleProject/WORKING_RULES.md): Không tự ý commit git khi chưa được phép.

