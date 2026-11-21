# STORY 17.2: Trình Tạo Bài Viết Zalo Thông Minh & Cơ Chế Spin Text Chống Trùng (Zalo Smart Post Studio & Spin Text Engine)

**Bối cảnh:** `docs/stories/EPIC_17_MULTI_CHANNEL_AUTO_POSTING_AND_PRECISION_MAPS.md` (Story 17.2).  
Khi môi giới đăng bài cùng một căn hộ vào nhiều nhóm Zalo khác nhau hoặc đăng liên tiếp nhiều ngày, nếu nội dung bài viết giống nhau 100%, hệ thống tự động kiểm duyệt spam của Zalo sẽ nhận diện và đưa tài khoản vào danh sách nghi ngờ (hạn chế gửi tin vào nhóm hoặc tạm khóa tài khoản). Story này trang bị cho CTV công cụ **Spin Text (Spintax Engine)** tự động đảo ngữ thông minh và 3 phong cách viết bài khác nhau, giúp mỗi lần bấm tạo bài viết là một bản nội dung độc bản, mới mẻ, thu hút khách hàng mà vẫn giữ nguyên thông tin cốt lõi.

---

## 1. Mô tả Story (User Story)
* **Là một:** CTV thường xuyên đăng bài hàng ngày lên các nhóm Zalo Bất Động Sản Đà Nẵng.
* **Tôi muốn:** Cùng một căn hộ nhưng mỗi lần tôi bấm tạo bài viết, câu chữ, cấu trúc mở đầu và lời kêu gọi hành động được biến hóa đa dạng (Spin Text).
* **Để:** Zalo không đánh dấu tài khoản của tôi là spam bot (vì đăng trùng nội dung hàng loạt), đồng thời bài đăng của tôi trông tự nhiên, cá tính và thu hút nhiều khách thuê hơn.

---

## 2. Tiền điều kiện (Pre-conditions)
* Căn hộ có đầy đủ thông tin cơ bản: Tiêu đề, Giá thuê, Khu vực, Số phòng ngủ/Loại phòng, Tiện ích chính.
* Người dùng đã cấu hình SĐT/Zalo Phone và mã định danh CTV.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Đa Dạng Phong Cách Viết Bài (Posting Tone)
* **Given** CTV mở trình tạo bài viết Zalo
* **When** CTV lựa chọn 1 trong 3 phong cách (Posting Tone)
* **Then** hệ thống định dạng bài viết tương ứng:
  1. **Phong cách Bắt Mắt / Hot Deal (Mặc định):**
     - Mở đầu bằng icon giật tít, nhấn mạnh tính khan hiếm/ưu đãi: *"🔥 {SIÊU PHẨM GIẢM GIÁ SÂU | CĂN HỘ MỚI TINH VỪA TRỐNG | HÀNG HIẾM SÁT BIỂN}..."*
     - Nêu bật lợi thế nổi trội (Full nội thất, xách vali vào ở, view biển, ban công rộng).
     - Kết thúc bằng lời hối thúc liên hệ ngay.
  2. **Phong cách Chuyên Nghiệp (Professional & Mạch Lạc):**
     - Trình bày thông số rõ ràng, gạch đầu dòng khoa học: Loại căn, Diện tích, Giá niêm yết, Chi phí điện/nước/dịch vụ, Điều kiện hợp đồng.
     - Phù hợp gửi cho khách làm việc văn phòng, nhóm đầu tư, người cần thông tin nhanh gọn.
  3. **Phong cách Ngắn Gọn (Quick Chat Micro-Post):**
     - Chỉ gồm 4–5 dòng ngắn nhất có thể:
       `[Loại phòng] - [Tên đường, Khu vực]`  
       `💰 Giá: [Giá thuê] / tháng`  
       `✨ [2 tiện ích nổi bật nhất]`  
       `📞 Zalo/Call: [SĐT CTV] · Xem ảnh & video chi tiết: [Link]`

### AC2 — Thuật Toán Spin Text Chống Trùng Lặp (Spintax Engine)
* **Given** CTV bấm nút `[🔄 Đổi biến thể]` hoặc mỗi lần bấm nút chia sẻ Zalo
* **When** thuật toán Spintax Engine phân giải cấu trúc `{A | B | C}`
* **Then** hệ thống chọn ngẫu nhiên một nhánh từ vựng đồng nghĩa nhưng đảm bảo giữ nguyên 100% các dữ liệu chuẩn xác:
  - **Khối mở đầu:**  
    `{Siêu phẩm | Căn hộ cực đẹp | Phòng mới tinh | Hàng tuyển}`
  - **Khối vị trí:**  
    `{ngay sát biển Mỹ Khê | cách bãi tắm vài phút đi bộ | khu phố Tây An Thượng an ninh | vị trí trung tâm sầm uất}`
  - **Khối nội thất:**  
    `{full nội thất cao cấp chỉ việc xách vali vào | đầy đủ trang thiết bị hiện đại | tiện nghi chuẩn căn hộ dịch vụ cao cấp}`
  - **Khối kêu gọi hành động (Call To Action):**  
    `{Nhắn Zalo em để xem video thực tế 24/7 | Gọi ngay hotline bên dưới để giữ phòng | Inbox em gửi vị trí chính xác và chốt giá tốt}`
* **And** các thông số bắt buộc: Giá tiền, SĐT liên hệ, Tên CTV và link `/p/:slug?ctv=...` **không bao giờ bị thay đổi hay sai lệch**.

### AC3 — Trình Sinh Hashtag Địa Phương Thông Minh
* **Given** bài đăng được sinh ra
* **When** tạo phần chân bài viết
* **Then** hệ thống tự động gắn từ 3–5 hashtag chuẩn SEO địa phương dựa theo khu vực của căn hộ:
  - Căn ở Ngũ Hành Sơn: `#ChothuecanhoDanang #CanhoMyAn #CanhoAnThuong #DanangApartment`
  - Căn ở Sơn Trà: `#CanhoSonTra #ChothuephongDanang #Canhoganbien`
  - Căn ở Hải Châu: `#CanhoHaiChau #CanhotrungtamDanang`

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Frontend:
* **`frontend/src/utils/spintax.ts` (Tạo mới):**
  - Hàm `resolveSpintax(template: string): string`: Xử lý phân giải các cụm ngoặc nhọn lồng nhau `{option1 | option2 | option3}`.
  - Từ điển Spintax tiếng Việt chuyên ngành BĐS Đà Nẵng:
    - Danh sách mở đầu (Headings).
    - Danh sách mô tả vị trí theo `zone` (My An, An Thuong, Son Tra, Hai Chau...).
    - Danh sách cụm từ tiện ích.
    - Danh sách CTA.
* **`frontend/src/utils/zaloPostGenerator.ts` (Tạo mới):**
  - `generateZaloPost(apartment, ctv, options: { tone: 'deal' | 'professional' | 'short' })`: Hàm sinh bài hoàn chỉnh.
* **`frontend/src/components/apartment/ZaloPostStudioModal.tsx` (Tạo mới):**
  - Giao diện xem trước bài viết Zalo trực quan:
    - Tab chuyển đổi 3 phong cách (Hot Deal, Chuyên nghiệp, Ngắn gọn).
    - Nút `[🔄 Đổi bản khác (Spin)]`.
    - Ô chỉnh sửa trực tiếp nếu CTV muốn gõ thêm lời nhắn riêng.
    - Nút `[📋 Sao chép & Mở Zalo]`.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Kiểm tra phân giải Spintax: Chạy 100 lần ngẫu nhiên không có lỗi cú pháp, không còn sót ký tự `{` hoặc `|` hoặc `}` trong văn bản đầu ra.
* [ ] Kiểm tra tính toàn vẹn: Giá thuê, SĐT CTV và link landing page luôn chính xác 100%.
* [ ] Kiểm tra 3 phong cách: Cả 3 phong cách đều sinh ra bài viết đúng format đã đặc tả.
* [ ] Kiểm tra tương thích: Hoạt động trơn tru trên cả trình duyệt máy tính và điện thoại.
