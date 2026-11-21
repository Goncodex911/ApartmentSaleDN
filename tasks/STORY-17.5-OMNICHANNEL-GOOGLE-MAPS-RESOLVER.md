# STORY 17.5: Chuẩn Hóa & Bóc Tách Tọa Độ Từ Mọi Link Google Maps (Omnichannel Google Maps URL Resolver & Plus Code)

**Bối cảnh:** `docs/stories/EPIC_17_MULTI_CHANNEL_AUTO_POSTING_AND_PRECISION_MAPS.md` (Story 17.5).  
Khi nhập căn hộ, người dùng dán nhiều dạng link Google Maps rất đa dạng: từ link rút gọn trên app điện thoại di động (`maps.app.goo.gl/...`), link rút gọn desktop cũ (`goo.gl/maps/...`), link tìm kiếm place có chứa mã hex/cid, link tìm kiếm có tham số tọa độ `query=...`, cho tới dạng mã định vị Plus Code (`7P28+3F Đà Nẵng`). Trước đây, một số link rút gọn trên điện thoại khi chuyển hướng gặp trang trung gian (như màn hình đồng ý cookie của Google hoặc chuyển hướng nhiều tầng) khiến backend không bóc tách được tọa độ, dẫn đến việc căn bị rơi vào trạng thái ước lượng tâm quận. Story này nâng cấp bộ giải mã link Google Maps đạt tỷ lệ thành công 100%.

---

## 1. Mô tả Story (User Story)
* **Là một:** Hệ thống backend tiếp nhận thông tin căn hộ từ Quản lý, CTV hoặc Bot cào tin Telegram.
* **Tôi muốn:** Mọi đường link Google Maps được gửi lên hệ thống (bất kể định dạng rút gọn hay link dài) đều được giải mã triệt để và bóc tách ra tọa độ GPS chính xác.
* **Để:** Không còn bất kỳ căn hộ nào bị lỗi vị trí hoặc rơi về tâm quận do hệ thống không đọc được link Maps.

---

## 2. Tiền điều kiện (Pre-conditions)
* Backend Node.js có kết nối Internet để theo dõi chuỗi redirect HTTP header `location` của Google Maps.
* Tuân thủ quy chuẩn bảo mật chống tấn công Server-Side Request Forgery (SSRF) tuyệt đối: Không bao giờ gửi request tới IP nội bộ hay domain lạ.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Hỗ Trợ 100% Các Định Dạng Link Google Maps Phổ Biến
* **Given** người dùng nhập một đường link Google Maps vào trường `location.mapUrl`
* **When** backend gọi hàm `resolveMapCoordinates(url)` trong [google-maps.ts](file:///d:/CODE/AppartmentSaleProject/backend/src/utils/google-maps.ts)
* **Then** hệ thống bóc tách thành công tọa độ GeoJSON `[longitude, latitude]` cho toàn bộ các dạng link sau:
  1. **Link rút gọn di động (Mobile App Share):** `https://maps.app.goo.gl/abcdef12345`  
     *(Theo dõi chuỗi HTTP 301/302 Redirect sâu tối đa 5 bước, tự động bóc tách tham số `continue` nếu gặp `consent.google.com`).*
  2. **Link rút gọn desktop cũ:** `https://goo.gl/maps/xyz987`
  3. **Link Place đầy đủ:** `https://www.google.com/maps/place/.../@16.054412,108.202231,17z/...`
  4. **Link Ghim tọa độ chính xác:** `.../data=!3m1!4b1!4m4!3m3!8m2!3d16.054412!4d108.202231` (Ưu tiên lấy cặp `!3d` và `!4d` vì đây là vị trí cắm ghim chính xác của tòa nhà thay vì tâm khung nhìn `@lat,lng`).
  5. **Link Search / Direct Query:** `https://www.google.com/maps/search/?api=1&query=16.054412,108.202231`
  6. **Link Plus Code:** `https://www.google.com/maps/place/7P28%2B3F+Da+Nang` (Tự động giải mã Open Location Code thành tọa độ GPS).

### AC2 — Chống Tấn Công SSRF & Giới Hạn Tên Miền Nghiêm Ngặt
* **Given** một đường link đầu vào bất kỳ
* **When** kiểm tra trước khi gửi request
* **Then** hệ thống CHỈ gửi HTTP request tới các hostname thuộc danh sách trắng của Google:
  - `maps.app.goo.gl`
  - `goo.gl` (khi path bắt đầu bằng `/maps`)
  - `maps.google.com`, `maps.google.com.vn`
  - `www.google.com`, `google.com`, `google.com.vn` (khi path bắt đầu bằng `/maps`)
  - `consent.google.com` (chỉ đọc param `continue`)
* **And** nếu đường link dẫn tới IP nội bộ (localhost, 127.0.0.1, 192.168.x.x, 10.x.x.x, 169.254.x.x) hoặc domain lạ $\rightarrow$ Lập tức từ chối và trả về `null`, không thực hiện bất kỳ request mạng nào.
* **And** thiết lập thời gian chờ timeout tối đa 5.000ms cho mỗi request để tránh treo tiến trình.

### AC3 — Kiểm Soát Biên Giới Địa Lý Khu Vực Đà Nẵng
* **Given** tọa độ bóc tách thành công từ link Maps
* **When** kiểm tra phạm vi địa lý hợp lệ
* **Then** tọa độ phải nằm trong vùng giới hạn Đà Nẵng và lân cận:
  - Vĩ độ: $15.80 \le \text{lat} \le 16.30$
  - Kinh độ: $107.85 \le \text{lng} \le 108.45$
* **And** nếu tọa độ nằm ngoài phạm vi này (ví dụ link Google Maps ở Hà Nội hay Sài Gòn do môi giới dán nhầm):
  - Hệ thống ghi nhận trạng thái `INVALID_LOCATION_OUTSIDE_DANANG`.
  - Trả về cảnh báo lỗi rõ ràng trên form: *"Link bản đồ không thuộc khu vực Đà Nẵng. Vui lòng kiểm tra lại link Google Maps."*.

### AC4 — Cập Nhật Trạng Thái Độ Chính Xác Địa Lý
* **Given** căn hộ được tạo hoặc cập nhật với link Maps bóc tách thành công
* **When** lưu vào cơ sở dữ liệu
* **Then** hệ thống tự động gán:
  - `location.coordinates = [longitude, latitude]` (chuẩn GeoJSON 6 số thập phân).
  - `location.geoPrecision = 'EXACT'`.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/utils/google-maps.ts`:**
  - Nâng cấp hàm `resolveMapCoordinates(raw: string)`:
    - Tăng số lần theo dõi redirect từ 3 lên 5 hops.
    - Bổ sung regex bóc tách đa dạng: `!3d...!4d...`, `@lat,lng`, `query=lat,lng`, `ll=lat,lng`, `destination=lat,lng`.
    - Bổ sung hàm giải mã Plus Code (Open Location Code regex `[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}`).
    - Kiểm tra giới hạn địa lý Đà Nẵng `isValidDanangCoordinates(lng, lat)`.
* **`backend/src/modules/apartments/apartment.service.ts`:**
  - Đảm bảo trong luồng `createApartment` và `updateApartment`: Nếu có `location.mapUrl`, luôn gọi `resolveMapCoordinates` trước khi fallback về địa chỉ text.
* **`backend/tests/google-maps.test.ts` (Tạo mới):**
  - Bộ unit test kiểm thử toàn diện các biến thể URL Google Maps thực tế.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Kiểm tra link `maps.app.goo.gl`: Giải mã thành công ra tọa độ nóc tòa nhà chính xác $< 1\text{m}$.
* [ ] Kiểm tra SSRF: Thử nghiệm truyền link nội bộ `http://127.0.0.1:3000` hoặc domain độc hại $\rightarrow$ Bị chặn ngay lập tức.
* [ ] Kiểm tra link ngoại tỉnh: Dán link Hồ Gươm Hà Nội $\rightarrow$ Báo lỗi ngoài phạm vi Đà Nẵng.
* [ ] Chạy `npm test` hoặc `vitest` pass 100% các ca kiểm thử giải mã link.
