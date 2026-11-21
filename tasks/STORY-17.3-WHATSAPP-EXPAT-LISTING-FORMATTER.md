# STORY 17.3: Định Dạng Bài Đăng WhatsApp Tiếng Anh & Chia Sẻ Cộng Đồng Expat (WhatsApp Expat Listing Formatter)

**Bối cảnh:** `docs/stories/EPIC_17_MULTI_CHANNEL_AUTO_POSTING_AND_PRECISION_MAPS.md` (Story 17.3).  
Khu vực bãi biển Mỹ Khê, An Thượng, Mỹ An (Đà Nẵng) là nơi tập trung hàng nghìn chuyên gia nước ngoài, digital nomad và khách du lịch dài hạn. Nhóm khách hàng này giao tiếp và tìm nhà thuê gần như 100% qua **WhatsApp** và các cộng đồng expat (*Danang Expats Housing*, *Rent in Danang*...). Các môi giới thường mất nhiều thời gian dịch thủ công sang tiếng Anh, quy đổi tỷ giá USD, tra cứu khoảng cách ra bãi biển và định dạng bài viết. Story này tự động hóa toàn bộ việc tạo bài đăng tiếng Anh chuẩn văn phong quốc tế và gửi trực tiếp qua WhatsApp.

---

## 1. Mô tả Story (User Story)
* **Là một:** CTV đang phụ trách nguồn khách thuê nước ngoài tại khu vực An Thượng / Mỹ An (Đà Nẵng).
* **Tôi muốn:** Căn hộ tự động có bài viết tiếng Anh được định dạng chuẩn cú pháp WhatsApp Markdown với giá quy đổi USD, khoảng cách đi bộ ra biển và danh mục tiện ích chuẩn expat.
* **Để:** Tôi có thể chào phòng ngay lập tức vào các nhóm cộng đồng Expat hoặc gửi riêng cho khách nước ngoài mà không mất công tự dịch bài hay tự tính toán khoảng cách.

---

## 2. Tiền điều kiện (Pre-conditions)
* Căn hộ có tọa độ GPS hợp lệ (để tính toán cự ly tới bãi tắm Mỹ Khê gần nhất).
* Tỷ giá quy đổi VND $\leftrightarrow$ USD khả dụng (tỷ giá cố định cấu hình hoặc từ cấu hình hệ thống: mặc định $1\text{ USD} \approx 25.000\text{ VND}$).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Chuyển Đổi & Format Tiếng Anh Chuẩn Quốc Tế
* **Given** CTV chọn định dạng bài đăng WhatsApp
* **When** hệ thống tạo nội dung tiếng Anh
* **Then** bài viết tuân thủ cấu trúc chuẩn quốc tế:
  1. **Tiêu đề nổi bật:**
     `🏡 *[MODERN STUDIO / 1-BEDROOM / 2-BEDROOM APARTMENT FOR RENT]*`
     `📍 *Location:* [Tên đường không dấu], [Khu vực - My An / An Thuong / Son Tra], Da Nang`
  2. **Giá thuê song ngữ USD & VND:**
     `💵 *Price:* *$[USD]/month* (~[VND Triệu] million VND/month)`
     *(Nếu căn có lưu sẵn giá USD thì ưu tiên hiển thị giá USD gốc, nếu không thì quy đổi tự động làm tròn đến hàng đơn vị $5).*
  3. **Cự ly đi bộ ra biển (Walking Distance):**
     - Nếu căn cách biển $\le 1.5\text{km}$:
       `🌊 *Beach Proximity:* ~[Khoảng cách]m to My Khe Beach (about [Số phút] mins walk)`
     - Nếu căn ở trung tâm (Hải Châu / Cẩm Lệ):
       `🏙️ *Location Highlight:* In the heart of Da Nang city center, close to Han River`
  4. **Danh mục tiện ích chuẩn Expat (Highlights):**
     `✨ *Highlights & Amenities:*`
     - `🍳 Fully equipped private kitchen with microwave & fridge`
     - `🧺 In-unit / Private washing machine`
     - `🏊 Rooftop swimming pool & gym access` (nếu có)
     - `🐾 Pet-friendly: Yes / No`
     - `⚡ Elevator, secure motorbike parking, 24/7 camera security`
     - `📶 High-speed fiber Wi-Fi included`
  5. **Thông tin liên hệ & Link tham quan:**
     `👉 *Full photos, video tour & exact location:* [Link /p/:slug?lang=en&ctv=MÃ_CTV]`  
     `📲 *Contact via WhatsApp / Zalo:* [SĐT quốc tế +84...] ([Tên CTV])`

### AC2 — Định Dạng Cú Pháp WhatsApp Markdown Chuẩn
* **Given** nội dung bài viết được sinh ra
* **When** gửi qua link `https://wa.me/?text=...`
* **Then** hệ thống sử dụng đúng các ký tự đặc biệt của WhatsApp:
  - In đậm: `*chữ in đậm*`
  - In nghiêng: `_chữ in nghiêng_`
  - Gạch đầu dòng: `•` hoặc `-`
  - Xuống dòng chuẩn: `%0A` trong URL mã hóa để bài đăng không bị dính cục chữ vào nhau khi mở app WhatsApp.

### AC3 — Nút Gửi Nhanh Vào Nhóm / Khách Hàng WhatsApp
* **Given** CTV bấm `[📱 Gửi WhatsApp]`
* **When** deep-link được kích hoạt
* **Then** hệ thống mở ứng dụng WhatsApp (trên Mobile) hoặc WhatsApp Web (trên Desktop).
* **And** trên điện thoại: Tự động đưa nội dung vào khung chat để người dùng chỉ cần chọn người nhận và bấm Gửi (Send).

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Frontend:
* **`frontend/src/utils/whatsappFormatter.ts` (Tạo mới):**
  - Hàm `buildWhatsAppExpatPost(apartment, ctv, options)`:
    - Tính khoảng cách biển dựa trên hàm `getDistanceFromLatLonInKm` từ [distance.ts](file:///d:/CODE/AppartmentSaleProject/frontend/src/utils/distance.ts).
    - Tọa độ bãi tắm Mỹ Khê chuẩn: `[108.2435, 16.0600]`.
    - Quy đổi giá thuê VND sang USD theo tỷ giá cấu hình.
    - Dịch tự động danh mục tiện ích [amenities.ts](file:///d:/CODE/AppartmentSaleProject/frontend/src/utils/amenities.ts) sang thuật ngữ expat chuẩn.
* **`frontend/src/utils/distance.ts`:**
  - Bổ sung hàm tính khoảng cách đi bộ `getWalkingDistanceToBeach(coordinates)`.
* **`frontend/src/components/apartment/WhatsAppPreviewModal.tsx` (Tạo mới):**
  - Modal xem trước giao diện chat WhatsApp mô phỏng trước khi gửi:
    - Hiển thị bản nháp chuẩn Markdown WhatsApp (khung chat màu xanh nền WhatsApp).
    - Nút `[Gửi qua WhatsApp ngay]`.
    - Nút `[Copy text]`.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Kiểm tra khoảng cách biển: Căn ở đường Hoàng Kế Viêm (cách biển ~300m) hiển thị đúng: `~300m to My Khe Beach (about 4 mins walk)`.
* [ ] Kiểm tra giá USD: Căn 10.000.000đ hiển thị đúng: `$400/month (~10.0 million VND/month)`.
* [ ] Kiểm tra WhatsApp link: Bấm nút mở đúng WhatsApp Web / App với đầy đủ nội dung có định dạng in đậm, xuống dòng đẹp mắt.
* [ ] Đảm bảo link kèm theo mở ra trang tiếng Anh: URL chứa tham số `?lang=en`.
