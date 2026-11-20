# EPIC-17: Tự Động Hóa Đăng Tin Đa Kênh (Zalo, WhatsApp) & Chuẩn Hóa Định Vị Bản Đồ Google Tuyệt Đối (Multi-Channel Auto-Posting & Precision Google Maps Standardization)

## Mục tiêu
Giải quyết dứt điểm 2 bài toán lớn trong hoạt động kinh doanh và vận hành hàng ngày của Cộng tác viên (CTV) và Quản lý:
1. **Tự động hóa & Tăng tốc độ đăng tin đa kênh:** Giúp môi giới phân phối bài đăng căn hộ lên **Zalo** (kênh chốt khách số 1 của người Việt) và **WhatsApp** (kênh chốt khách nước ngoài, expat, digital nomad tại Đà Nẵng) với tốc độ cao, bài viết chuyên nghiệp, hình ảnh đóng watermark tự động, hạn chế tối đa nguy cơ bị khóa tài khoản do spam.
2. **Chuẩn hóa định vị Google Maps 100%:** Đảm bảo **mỗi căn hộ nằm đúng vị trí chính xác trên bản đồ** (đến từng mét/nóc nhà), triệt tiêu hoàn toàn hiện tượng lệch vị trí, link lỗi hoặc hàng chục căn bị dồn cục vào tâm quận (approximate centroid stacking).

---

## Bối cảnh & Phân Tích Kỹ Thuật Chuyên Sâu

### 1. Vấn đề 1: Tự động đăng bài lên Zalo & WhatsApp (Có cách nào & Làm như thế nào?)

#### A. Đối với Zalo:
* **Thực tế kỹ thuật & Chính sách của Zalo:**
  * Zalo **không cung cấp Open API chính thức** cho tài khoản Zalo cá nhân đăng bài lên Nhật ký (Timeline) hoặc tự động bắn tin vào các nhóm chat cá nhân. Zalo kiểm soát spam cực kỳ gắt gao (quét IP, tần suất gửi tin, nội dung lặp lại).
  * Zalo Official Account (Zalo OA): Có API chính thức (Zalo Open API), nhưng OA chỉ phù hợp cho thương hiệu công ty gửi broadcast, không đại diện cho thương hiệu cá nhân của từng CTV, và chi phí gửi tin ZNS/Broadcast tốn phí hàng tháng.
* **Giải pháp tối ưu kết hợp 2 cấp độ:**
  * **Cấp độ 1 — Bán tự động 1-Chạm Siêu Tốc (100% An toàn, 0 đồng, Khuyên dùng số 1):**
    * Khi CTV bấm nút `[🚀 Đăng Zalo]`: Hệ thống tự động:
      1. Tạo nội dung bài viết chuẩn SEO Zalo (tiêu đề giật tít, giá nổi bật, icon, tiện ích, link xem phòng `/p/:slug`).
      2. Tự động sao chép văn bản vào Clipboard.
      3. Tự động tải bộ 4–6 ảnh đẹp nhất đã đóng dấu Watermark (Mã CTV + Tên) vào thư viện ảnh máy.
      4. Mở thẳng ứng dụng Zalo (Deep-link Scheme `zalo://` hoặc `https://zalo.me/share`).
      5. CTV chỉ cần chạm "Dán" và chọn Đăng Nhật ký hoặc Gửi vào Nhóm Zalo Bất Động Sản (toàn bộ thao tác chỉ mất 3 giây, hoàn toàn do người dùng thực hiện nên Zalo không bao giờ khóa nick).
  * **Cấp độ 2 — Tự động hóa hoàn toàn có kiểm soát (Automation Engine):**
    * Dành cho Quản lý / CTV dùng máy tính: Xây dựng tiện ích mở rộng Chrome Extension kết nối với phiên Zalo Web (`chat.zalo.me`).
    * CTV lên lịch hẹn giờ (Schedule Posting: ví dụ 9h sáng, 14h chiều, 19h tối) $\rightarrow$ Extension tự động mở tab ngầm, dán bài và ảnh vào các nhóm Zalo BĐS Đà Nẵng đã tham gia.
    * **Cơ chế chống khóa nick (Anti-Ban Guard):** Bắt buộc tích hợp thuật toán **Spin Text** (hoán đổi từ đồng nghĩa ngẫu nhiên để bài đăng không trùng lặp) + **Random Delay** (giãn cách ngẫu nhiên 3–7 phút giữa các nhóm) + **Giới hạn số lượng** (tối đa 5 nhóm/lần).

#### B. Đối với WhatsApp:
* **Thực tế kỹ thuật:**
  * Khách nước ngoài, chuyên gia, expat tại khu vực An Thượng / Mỹ An (Đà Nẵng) sử dụng WhatsApp 100%.
  * WhatsApp hỗ trợ cơ chế Universal Deep-link rất mạnh mẽ (`https://wa.me/?text=...`) và Meta cung cấp WhatsApp Business Cloud API (miễn phí 1.000 cuộc hội thoại/tháng).
* **Giải pháp triển khai:**
  * **Tạo bài đăng tiếng Anh chuẩn Expat:** Chuyển đổi thông tin căn hộ sang tiếng Anh chuẩn văn phong bản địa (giá USD, khoảng cách đi bộ ra biển `Walking distance to My Khe beach ~350m`, tiện ích `Pet-friendly`, `Full kitchen`, `Rooftop pool`).
  * **1-Click WhatsApp Direct Share:** Bấm nút mở thẳng ứng dụng WhatsApp với nội dung format chuẩn Markdown của WhatsApp (`*bold*`, `_italic_`, icon) để CTV gửi ngay cho khách ngoại quốc hoặc đăng vào các WhatsApp Community Groups (*Danang Expats Housing*, *Rent in Danang*...).

---

### 2. Vấn đề 2: Chuẩn hóa Google Maps, mỗi căn nằm đúng vị trí tuyệt đối (Phải làm thế nào?)

* **Nguyên nhân cốt lõi gây lệch vị trí hiện nay:**
  1. CTV/Quản lý dán các dạng link Google Maps rút gọn trên điện thoại (`maps.app.goo.gl/...`), backend trước đây chưa theo dõi hết chuỗi redirect 301/302 dẫn đến bóc tách thất bại.
  2. Nhiều căn chỉ nhập địa chỉ text mà không dán link Maps, hệ thống buộc phải fallback về tâm quận khiến nhiều căn bị đè lên nhau.
  3. Môi giới không biết chính xác tọa độ GPS của tòa nhà khi ngồi ở văn phòng.
* **Giải pháp 4 tầng chuẩn hóa tuyệt đối:**
  * **Tầng 1 — Bộ giải mã link Google Maps đa năng (Omnichannel URL Resolver):** Hỗ trợ giải mã 100% mọi biến thể link Google Maps (link rút gọn di động, link Plus Code, link search query, link place có tọa độ `@lat,lng`). Tự động redirect lấy tọa độ chuẩn xác 6 chữ số thập phân (độ chính xác $< 0.5\text{m}$).
  * **Tầng 2 — Công cụ "Chấm vị trí trên bản đồ" (Interactive Pin-on-Map Picker):** Trên form thêm/sửa căn (`ApartmentModal.tsx`), tích hợp bản đồ mini cho phép người dùng kéo thả ghim đến đúng nóc tòa nhà, hoặc bấm nút *"Lấy tọa độ tôi đang đứng"* khi đi khảo sát thực tế.
  * **Tầng 3 — Tự động định vị theo tên đường (Address Geocoding):** Khi gõ số nhà + tên đường tại Đà Nẵng, hệ thống tự động đối soát tọa độ qua Nominatim / Google Geocoding và lưu cache.
  * **Tầng 4 — Trang Quản trị Rà soát & Căn chỉnh Vị trí Hàng loạt (`/admin/map-qa`):** Cung cấp giao diện chia đôi màn hình cho Quản lý lọc các căn đang bị cờ `approximate = true`, bấm vào căn nào thì kéo ghim về đúng vị trí chỉ trong 5 giây mà không cần mở form sửa phức tạp.

---

## Danh mục các User Stories

| Story | Tên User Story | Trọng tâm kỹ thuật | Độ ưu tiên |
| :--- | :--- | :--- | :---: |
| **Story 17.1** | Bộ Phân Phối Bài Đăng 1-Chạm Lên Zalo & WhatsApp | Web Share API, Clipboard Auto-copy, Watermark Downloader, Deep-link Dispatcher | P0 (Cốt lõi) |
| **Story 17.2** | Trình Tạo Bài Viết Zalo Thông Minh & Cơ Chế Spin Text Chống Trùng | Smart Caption Generator, Spin Text Engine, Hashtag Generator, CTA Tracking Link | P1 (Tăng tương tác) |
| **Story 17.3** | Định Dạng Bài Đăng WhatsApp Tiếng Anh & Chia Sẻ Cộng Đồng Expat | English Expat Formatter, USD Currency Converter, Walking Distance Calculator | P1 (Thị trường Tây) |
| **Story 17.4** | Bộ Ghim Vị Trí Trực Quan Trên Bản Đồ Khi Tạo/Sửa Căn Hộ | Interactive Map Picker (`ApartmentModal`), GPS Snapping, Draggable Marker | P0 (Cốt lõi) |
| **Story 17.5** | Giải Mã 100% Các Biến Thể Link Google Maps & Plus Code | Deep Redirect Tracker, Regex Engine, Plus Code Resolver, Geocoding Cache | P0 (Cốt lõi) |
| **Story 17.6** | Bảng Rà Soát & Căn Chỉnh Vị Trí Kho Hàng Cho Quản Trị Viên | Map QA Dashboard (`/admin/map-qa`), Split Screen Calibration, One-Click Save | P1 (Vận hành) |

---

### User Story 17.1: Bộ Phân Phối Bài Đăng 1-Chạm Lên Zalo & WhatsApp (One-Click Multi-Channel Smart Share & Deep-Link Dispatcher)
* **Là một:** Cộng tác viên (CTV) hoặc Quản lý đang tìm thấy một căn hộ đẹp muốn gửi ngay lên Zalo hoặc WhatsApp.
* **Tôi muốn:** Bấm một nút duy nhất để hệ thống tự chuẩn bị nội dung bài viết, tự tải ảnh có đóng watermark của tôi và tự mở app Zalo/WhatsApp.
* **Để:** Tôi đăng bài trong 3 giây mà không phải copy-paste thủ công từng ảnh hay lo sợ bị Zalo khóa tài khoản vì spam bot.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Nút Thao Tác Nhanh Trên Mọi Thẻ Căn Hộ:**
     * Trên [ApartmentCard.tsx](file:///d:/CODE/AppartmentSaleProject/frontend/src/components/apartment/ApartmentCard.tsx) và [ApartmentDetailModal.tsx](file:///d:/CODE/AppartmentSaleProject/frontend/src/components/apartment/ApartmentDetailModal.tsx), bổ sung menu chia sẻ nhanh:
       * `[💬 Đăng Zalo]` (Xanh Zalo `#0068ff`).
       * `[📱 Đăng WhatsApp]` (Xanh lá WhatsApp `#25d366`).
  2. **Quy Trình 1-Chạm Tự Động Hóa Hoàn Chỉnh:**
     * Khi bấm `[💬 Đăng Zalo]`:
       1. Tự động format bài viết theo cấu trúc tối ưu (Tiêu đề, Giá, Vị trí khu vực, Tiện ích nổi bật, Link xem phòng riêng `/p/:slug` kèm mã CTV).
       2. Tự động lưu văn bản vào Clipboard của điện thoại / máy tính.
       3. Tự động tải về máy 4 ảnh phòng đẹp nhất đã đóng Watermark (Mã CTV + Tên CTV).
       4. Kích hoạt deep-link mở ứng dụng Zalo (`zalo://` hoặc mở `https://zalo.me/share`).
       5. Hiển thị thông báo Toast nổi: *"Đã sao chép bài viết & tải 4 ảnh! Hãy mở Zalo bấm Dán để đăng bài."*.
     * Khi bấm `[📱 Đăng WhatsApp]`:
       1. Tự động chuyển nội dung bài viết sang Tiếng Anh chuẩn (format WhatsApp Markdown: `*bold*`, `_italic_`).
       2. Kích hoạt deep-link `https://wa.me/?text={encoded_content}` mở thẳng giao diện chọn người nhận hoặc nhóm chat WhatsApp.

---

### User Story 17.2: Trình Tạo Bài Viết Zalo Thông Minh & Cơ Chế Spin Text Chống Trùng (Zalo Smart Post Studio & Spin Text Engine)
* **Là một:** CTV thường xuyên đăng bài hàng ngày lên các nhóm Zalo Bất Động Sản Đà Nẵng.
* **Tôi muốn:** Cùng một căn hộ nhưng mỗi lần tôi bấm tạo bài viết, câu chữ và cách mở đầu được biến hóa đa dạng (Spin Text).
* **Để:** Zalo không đánh dấu tài khoản của tôi là spam bot (đăng nhiều bài giống nhau), đồng thời bài viết thu hút nhiều khách hàng hơn.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Tùy Chọn Phong Cách Viết Bài (Posting Tone):**
     * Cung cấp 3 phong cách bài đăng để CTV lựa chọn trong popover chia sẻ:
       * *Phong cách Chuyên nghiệp:* Trình bày rõ ràng, thông số mạch lạc, phù hợp cho nhóm nhà đầu tư.
       * *Phong cách Bắt mắt / Hot Deal:* Nhấn mạnh ưu đãi (*"Căn duy nhất giảm giá sâu..."*, *"Full nội thất chỉ xách vali vào ở"*).
       * *Phong cách Ngắn gọn:* Dành riêng cho nhóm chat nhanh, chỉ gồm 4-5 dòng cô đọng kèm link `/p/:slug`.
  2. **Thuật Toán Spin Text Chống Trùng Lặp (Spintax Engine):**
     * Hệ thống tích hợp từ điển hoán đổi từ ngữ đồng nghĩa:
       * `{Siêu phẩm | Căn hộ mới | Phòng đẹp giá tốt}`
       * `{ngay sát biển Mỹ Khê | cách biển vài bước chân | khu phố Tây}`
       * `{full nội thất cao cấp | đầy đủ đồ dùng chỉ việc ở | xách vali vào ngay}`
     * Mỗi lần bấm tạo bài viết, hệ thống tự động sinh ra một biến thể văn bản ngẫu nhiên nhưng giữ nguyên các thông số cốt lõi (Giá, SĐT liên hệ, Link).

---

### User Story 17.3: Định Dạng Bài Đăng WhatsApp Tiếng Anh & Chia Sẻ Cộng Đồng Expat (WhatsApp Expat Listing Formatter)
* **Là một:** CTV đang phụ trách nguồn khách thuê nước ngoài tại khu vực An Thượng / Mỹ An (Đà Nẵng).
* **Tôi muốn:** Căn hộ tự động có bài viết tiếng Anh được định dạng chuẩn cho WhatsApp với giá quy đổi USD và khoảng cách đi bộ ra biển.
* **Để:** Tôi có thể chào phòng ngay lập tức vào các nhóm cộng đồng Expat hoặc gửi riêng cho khách Tây mà không mất công tự dịch.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Chuyển Đổi & Format Tiếng Anh Chuẩn Quốc Tế:**
     * Tiêu đề tự động: `✨ [Studio / 1BR / 2BR] Apartment for Rent in [My An / An Thuong / Son Tra]`.
     * Giá hiển thị song song hoặc ưu tiên USD: `$550/month (~13.8M VND)`.
     * Tự động tính cự ly: `🌊 Walking distance to My Khe Beach: ~350m (4 mins walk)`.
     * Danh mục tiện ích chuẩn Expat: `🐾 Pet-friendly: Yes/No`, `🏊 Rooftop Swimming Pool`, `🍳 Fully Equipped Kitchen`, `🧺 Private Washing Machine`, `⚡ Elevator & Motorbike Parking`.
  2. **Nút Chia Sẻ Trực Tiếp Vào Nhóm Expat:**
     * Hỗ trợ nút gửi nhanh qua WhatsApp Web hoặc Mobile App, nội dung kèm link xem phòng `/p/:slug` đã được bật sẵn giao diện tiếng Anh (`?lang=en`).

---

### User Story 17.4: Bộ Ghim Vị Trí Trực Quan Trên Bản Đồ Khi Tạo/Sửa Căn Hộ (Interactive Pin-on-Map Picker & GPS Snapping)
* **Là một:** Quản lý hoặc CTV đang nạp thông tin căn hộ mới vào hệ thống.
* **Tôi muốn:** Có thể mở một bản đồ tương tác nhỏ ngay trên form nhập liệu để kéo thả ghim đến đúng nóc nhà, hoặc bấm 1 nút để lấy tọa độ nơi tôi đang đứng.
* **Để:** Căn hộ có tọa độ GPS chính xác 100% đến từng mét mà tôi không cần phải chuyển qua lại giữa Google Maps để copy link.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Khung Bản Đồ Mini Trên Form Nhập Liệu ([LocationSection.tsx](file:///d:/CODE/AppartmentSaleProject/frontend/src/components/apartment/LocationSection.tsx)):**
     * Trong phần nhập Vị trí, bổ sung tab/nút: `[📍 Chọn vị trí trên bản đồ]`.
     * Mở một khung bản đồ tương tác (chiều cao ~200–250px) với một marker có thể kéo thả (`draggable: true`).
     * Khi người dùng kéo thả ghim: Tọa độ `coordinates: [kinh độ, vĩ độ]` tự động cập nhật theo thời gian thực với độ chính xác 6 chữ số thập phân.
  2. **Nút "Lấy Vị Trí Tôi Đang Đứng" (GPS Snapping):**
     * Hữu ích khi CTV đang đi khảo sát thực tế tại căn hộ: Bấm nút `[🎯 Lấy vị trí hiện tại]` $\rightarrow$ Trình duyệt gọi GPS thiết bị $\rightarrow$ Ghim tự động nhảy đến đúng vị trí người dùng đang đứng.
  3. **Tự Động Điền Địa Chỉ Ngược (Reverse Geocoding):**
     * Khi người dùng kéo thả ghim đến một vị trí trên bản đồ: Hệ thống tự động phân giải tên đường và quận/khu vực tương ứng để điền sẵn vào ô Tên đường và Khu vực (nếu đang để trống).

---

### User Story 17.5: Giải Mã 100% Các Biến Thể Link Google Maps & Plus Code (Omnichannel Google Maps URL Resolver)
* **Là một:** Hệ thống backend tiếp nhận thông tin căn hộ từ Quản lý, CTV hoặc Bot cào tin Telegram.
* **Tôi muốn:** Bất kỳ đường link Google Maps nào được dán vào (kể cả link rút gọn từ điện thoại di động) đều được giải mã thành công ra tọa độ GPS chuẩn xác.
* **Để:** Không còn tình trạng căn hộ bị lỗi vị trí hoặc rơi về tâm quận do không đọc được link Maps.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Hỗ Trợ Mọi Định Dạng Link Google Maps:**
     * Nâng cấp [google-maps.ts](file:///d:/CODE/AppartmentSaleProject/backend/src/utils/google-maps.ts) để giải mã thành công:
       * Link rút gọn mobile: `https://maps.app.goo.gl/...` (Theo dõi chuỗi HTTP redirect 301/302 theo chiều sâu).
       * Link rút gọn desktop: `https://goo.gl/maps/...`.
       * Link place đầy đủ: `https://www.google.com/maps/place/.../@16.0544,108.2022,17z/...`.
       * Link search query: `https://www.google.com/maps/search/?api=1&query=16.0544,108.2022`.
       * Link Plus Code: `https://maps.google.com/?q=7P28+3F Đà Nẵng` (Tự động giải mã Open Location Code ra lat/lng).
  2. **Kiểm Soát Tọa Độ Hợp Lệ Tại Đà Nẵng:**
     * Tọa độ giải mã phải nằm trong phạm vi địa lý hợp lệ của Đà Nẵng và vùng lân cận:
       * Vĩ độ (Latitude): $15.90 \le \text{lat} \le 16.25$.
       * Kinh độ (Longitude): $108.05 \le \text{lng} \le 108.35$.
     * Nếu tọa độ nằm ngoài phạm vi này (ví dụ link bản đồ ở Hà Nội/Sài Gòn do dán nhầm) $\rightarrow$ Báo lỗi rõ ràng cho người dùng kiểm tra lại.

---

### User Story 17.6: Bảng Rà Soát & Căn Chỉnh Vị Trí Kho Hàng Cho Quản Trị Viên (Admin Map QA & Bulk Location Calibrator)
* **Là một:** Admin hoặc Quản lý hệ thống.
* **Tôi muốn:** Có một trang chuyên dụng kiểm tra chất lượng bản đồ (`/admin/map-qa`) để lọc toàn bộ các căn hộ chưa chuẩn vị trí và căn chỉnh trực tiếp trên bản đồ chỉ trong vài giây.
* **Để:** Làm sạch toàn bộ kho hàng, đảm bảo 100% căn hộ trên hệ thống đều nằm chính xác trên bản đồ.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Giao Diện Rà Soát Chia Đôi Màn Hình (Split-Screen Map QA):**
     * Truy cập `/admin/map-qa`:
       * Cột bên trái: Danh sách các căn đang bị cờ `approximate: true` (chưa có vị trí thật hoặc đang ở tâm quận), sắp xếp theo ngày cập nhật mới nhất.
       * Cột bên phải: Bản đồ tương tác vệ tinh / đường phố toàn màn hình.
  2. **Thao Tác Căn Chỉnh 1-Chạm Siêu Nhanh:**
     * Bấm vào một căn hộ ở danh sách bên trái: Bản đồ tự động lướt đến khu vực của căn đó và hiển thị một marker màu cam nhấp nháy.
     * Quản lý chỉ cần dùng chuột hoặc ngón tay **kéo marker về đúng vị trí nóc tòa nhà** $\rightarrow$ Nút `[💾 Lưu vị trí]` sáng lên.
     * Bấm `[Lưu vị trí]`: Hệ thống lưu tọa độ GPS mới, tự động xóa cờ `approximate` $\rightarrow$ Căn hộ tự động biến mất khỏi danh sách chờ chuẩn hóa và chuyển sang trạng thái chuẩn 100%.

---

## Kế Hoạch Triển Khai Theo Giai Đoạn (Implementation Phasing)

* **Giai đoạn 1: Chuẩn Hóa Định Vị Google Maps Tuyệt Đối (Ưu tiên P0)**
  * Triển khai **Story 17.4** (Interactive Pin-on-Map Picker trên `ApartmentModal`).
  * Triển khai **Story 17.5** (Omnichannel Google Maps URL Resolver & HTTP redirect deep tracker).
  * Triển khai **Story 17.6** (Admin Map QA Dashboard `/admin/map-qa` để căn chỉnh toàn bộ kho căn hiện tại).
* **Giai đoạn 2: Tự Động Hóa Phân Phối Bài Đăng Zalo & WhatsApp (Ưu tiên P0 - P1)**
  * Triển khai **Story 17.1** (One-Click Multi-Channel Smart Share & Deep-Link Dispatcher cho CTV).
  * Triển khai **Story 17.2** (Trình tạo mẫu bài viết Zalo + Thuật toán Spin Text chống trùng lặp).
  * Triển khai **Story 17.3** (Định dạng bài đăng WhatsApp Tiếng Anh & Chia sẻ cộng đồng Expat).

---

## Định Nghĩa Hoàn Thành Toàn Epic (Definition of Done - DoD)
* [ ] 100% các biến thể link Google Maps (kể cả link rút gọn từ điện thoại) đều được giải mã ra tọa độ chính xác $< 1\text{m}$.
* [ ] Form Thêm/Sửa căn hộ có bản đồ chấm vị trí trực quan và nút lấy GPS hiện tại hoạt động mượt mà.
* [ ] Admin có thể vào `/admin/map-qa` để chuẩn hóa vị trí các căn bị lệch mà không cần mở form sửa từng căn.
* [ ] Nút chia sẻ Zalo 1-chạm tự copy bài viết, tự tải ảnh có watermark CTV và mở app Zalo thành công trên cả iOS và Android.
* [ ] Nút chia sẻ WhatsApp tự động sinh văn bản tiếng Anh chuyên nghiệp kèm giá USD và mở WhatsApp thành công.
* [ ] Build và kiểm tra `tsc --noEmit` và `npm run build` ở cả frontend và backend thành công 0 lỗi.
