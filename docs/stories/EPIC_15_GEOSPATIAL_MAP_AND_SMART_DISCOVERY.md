# EPIC-15: Nâng Cấp Hệ Thống Bản Đồ Địa Không Gian & Trải Nghiệm Khảo Sát Bất Động Sản (Advanced Geospatial Map & Property Discovery Experience)

## Mục tiêu
Nâng cấp trải nghiệm tìm kiếm, khảo sát và dẫn khách trên Bản đồ tương tác từ mức cơ bản (Epic 11.2) lên chuẩn chuyên nghiệp tương đương Airbnb/Zillow. 
Giải quyết triệt để các vấn đề thực địa tại Đà Nẵng: **ghim chồng lấn ở tâm quận**, **thiếu nút định vị GPS khi CTV đứng ngoài đường**, **chưa hỗ trợ tìm kiếm theo khung nhìn bản đồ**, và **bổ sung bản đồ bán kính bảo mật trên trang gửi khách (`/p/:slug`)** mà vẫn đảm bảo tiêu chí **0 đồng chi phí API** (không tốn phí Google Maps API đắt đỏ) và tuân thủ nguyên tắc tối giản (Ponytail).

---

## Bối cảnh & Giá trị Thực tế
Sau khi đưa bản đồ vào vận hành (Story 11.2 - Bong bóng giá & Story 11.3 - Tour dẫn khách), phản hồi thực tế từ đội ngũ môi giới ghi nhận:
1. **Nỗi đau khi đi khảo sát thực tế:**
   * CTV đang đứng ở ngã tư Nguyễn Văn Thoại – Trần Bạch Đằng muốn biết *"Quanh đây 500m có căn nào trống xem được ngay không?"* nhưng bản đồ không có nút định vị GPS của bản thân, phải zoom/kéo thủ công mất thời gian.
   * Rất nhiều căn hộ khi tạo mới do không dán link Google Maps nên bị dồn về cùng một tọa độ duy nhất (tâm quận). Khi phóng to tối đa, hàng chục căn đè khít lên nhau thành 1 điểm không bấm riêng từng căn được.
2. **Nhu cầu chốt khách trực quan:**
   * Khi khách yêu cầu *"Tìm phòng quanh ĐH Kinh tế hoặc cầu Rồng trong bán kính 1.5km"*, CTV phải tự nhẩm khoảng cách. Bản đồ thiếu vòng tròn trực quan thể hiện bán kính mốc.
   * Khi gửi link `/p/:slug` cho khách xem, khách thường xuyên hỏi *"Căn này cách biển bao xa? Xung quanh có chợ hay quán ăn không?"*. Trang khách hiện chỉ có dòng chữ địa chỉ mà chưa có bản đồ tổng quan tiện ích xung quanh (nhưng vẫn phải bảo mật, không được làm lộ số nhà chính xác).

---

## Danh mục các User Stories

| Story | Tên User Story | Trọng tâm kỹ thuật | Độ ưu tiên |
| :--- | :--- | :--- | :---: |
| **Story 15.1** | Giao Diện Bản Đồ Tối Giản Sang Trọng & Nút Định Vị GPS Thực Địa | CartoDB Positron / Voyager Tiles, Geolocation API, Locate-Me Button, Pulse Dot | P0 |
| **Story 15.2** | Thuật Toán Tản Ghim Trùng Tọa Độ & Khử Chồng Lấn Tâm Quận | Spiderfy / Location Jittering Engine, Spiral Distribution, Single-Tap Pin Selection | P0 |
| **Story 15.3** | Tìm Kiếm Theo Khung Nhìn Bản Đồ ("Tìm Ở Khu Vực Này") | Viewport Bounding Box (`map.getBounds()`), Search-As-I-Move, Debounced Pan/Zoom | P1 |
| **Story 15.4** | Trực Quan Hóa Bán Kính Điểm Mốc & Lớp Phủ Tiện Ích Đà Nẵng | `L.circle` Radius Overlays, Đà Nẵng POIs Layer (Biển, Chợ, Trường ĐH, Bệnh viện) | P1 |
| **Story 15.5** | Bản Đồ Bán Kính Bảo Mật Cho Trang Khách Thuê Công Khai (`/p/:slug`) | Lightweight Privacy Mini-Map, 300m Fuzzing Circle, Walking Distance Highlights | P1 |
| **Story 15.6** | Bộ Định Vị Tên Đường Tự Động Miễn Phí Khi Nhập Tin | OSM Nominatim / Photon Đà Nẵng Geocoding, Caching Service, Address Coordinates | P2 |

---

### User Story 15.1: Giao Diện Bản Đồ Tối Giản Sang Trọng & Nút Định Vị GPS Thực Địa (Clean Map Styles & Field GPS Locate-Me)
* **Là một:** CTV đang đi khảo sát hoặc dẫn khách ngoài đường tại Đà Nẵng.
* **Tôi muốn:** Bản đồ có giao diện sáng, tối giản, sang trọng (tôn nổi bong bóng giá) và có một nút bấm tròn để định vị ngay vị trí GPS thực tế tôi đang đứng.
* **Để:** Thấy ngay lập tức xung quanh tôi trong bán kính vài trăm mét có những căn hộ nào đang trống để dẫn khách ghé xem ngay mà không cần tra cứu địa chỉ thủ công.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Nâng Cấp Giao Diện Bản Đồ Nền (Clean Modern Tiles):**
     * Chuyển đổi tile nền từ OSM mặc định sang tile **CartoDB Positron / Voyager** (`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`):
       * Hoàn toàn miễn phí, hợp pháp, chuẩn HTTPS, tốc độ CDN cực nhanh.
       * Màu sắc trung tính, hiện đại tương tự Airbnb/Apple Maps; giảm bớt các chi tiết rườm rà giúp các bong bóng giá (`AVAILABLE` xanh, `UPCOMING` cam) nổi bật rõ ràng trên màn hình điện thoại dưới ánh sáng ngoài trời.
  2. **Nút Định Vị GPS Công Thái Học (Locate-Me Button):**
     * Bổ sung nút tròn icon `Crosshair / Navigation` ở góc phải bên dưới các nút điều khiển zoom (vùng bấm tối thiểu $44 \times 44\text{px}$).
     * Khi bấm nút:
       * Xin quyền vị trí (`navigator.geolocation.getCurrentPosition`).
       * Hiển thị trạng thái đang xoay (spinner).
       * Khi nhận được GPS: Bản đồ thực hiện hiệu ứng lướt mượt mà (`map.flyTo([lat, lng], 16)`).
       * Đặt một điểm ghim định vị của CTV: Chấm tròn xanh có hiệu ứng xung nhịp tỏa ra (Pulsing Blue Dot) kèm vòng tròn mờ thể hiện bán kính sai số GPS (`accuracy`).
     * **Xử lý lỗi mượt mà:** Nếu người dùng từ chối cấp quyền hoặc lỗi sóng GPS $\rightarrow$ Bật Toast thông báo nhẹ nhàng: *"Không thể lấy vị trí hiện tại. Vui lòng bật định vị trên điện thoại."* (không crash app).

---

### User Story 15.2: Thuật Toán Tản Ghim Trùng Tọa Độ & Khử Chồng Lấn Tâm Quận (Spiderfy / Location Jittering Engine)
* **Là một:** CTV hoặc Quản lý đang lướt bản đồ tìm kiếm căn hộ.
* **Tôi muốn:** Khi các căn hộ có cùng tọa độ (do cùng một tòa nhà hoặc do hệ thống gán tạm về tâm quận) thì khi phóng to tối đa, các ghim tự động tản đều ra xung quanh.
* **Để:** Tôi có thể nhìn thấy đầy đủ các căn và chạm chọn từng căn dễ dàng mà không bị đè che khuất nhau.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Nhận Diện Cụm Trùng Tọa Độ Chính Xác (Colocated Pins Detection):**
     * Khi các ghim có khoảng cách địa lý $< 15\text{m}$ (trùng tòa nhà hoặc trùng tâm quận) và bản đồ ở mức phóng to cao ($\ge 16$):
       * Thay vì vẽ đè lên nhau, hệ thống tự động kích hoạt chế độ **Tản ghim xoắn ốc / vòng tròn (Spiderfy Layout)**.
  2. **Hiệu Ứng Tản Ghim Xoắn Ốc / Vòng Tròn (Pure Math - Zero Heavy Libs):**
     * Áp dụng thuật toán chia góc hình tròn thuần (không cần kéo thư viện `OverlappingMarkerSpiderfier`):
       * Nếu số căn $\le 6$: Phân bổ đều trên một vòng tròn bán kính ảo 25–35 pixel tính từ tâm gốc.
       * Nếu số căn $> 6$: Phân bổ theo hình xoắn ốc (spiral) tỏa dần ra ngoài.
       * Mỗi ghim được nối với tâm gốc bằng một đường chỉ dẫn mảnh (polyline) mờ nhẹ.
  3. **Thao Tác Chạm Chọn Từng Căn:**
     * Chạm vào bất kỳ bong bóng giá nào đã tản $\rightarrow$ Mở ngay thẻ xem nhanh `MapQuickCard` cho căn đó.
     * Chạm ra ngoài khoảng trống bản đồ $\rightarrow$ Các ghim tự động thu lại gọn gàng về vị trí gốc.

---

### User Story 15.3: Tìm Kiếm Theo Khung Nhìn Bản Đồ ("Tìm Ở Khu Vực Này" - Viewport Bounding Box)
* **Là một:** Môi giới đang lướt bản đồ để tìm giỏ hàng theo khu vực trực quan.
* **Tôi muốn:** Khi tôi kéo (pan) bản đồ sang một khu phố khác (ví dụ: kéo từ Ngũ Hành Sơn sang Sơn Trà), hệ thống cung cấp nút bấm để tìm kiếm nhanh các căn nằm gọn trong khung hình tôi đang xem.
* **Để:** Giới hạn chính xác tập căn hộ theo tầm mắt mà không cần phải gõ lại tên phường/quận vào ô tìm kiếm.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Nút Nổi "Tìm Ở Khu Vực Này" (Floating Search Trigger):**
     * Khi người dùng kéo hoặc zoom bản đồ làm thay đổi tâm bản đồ $> 500\text{m}$, ở cạnh trên bản đồ (dưới thanh tìm kiếm) xuất hiện nút nổi mềm:
       > `[🔍 Tìm ở khu vực này]` (Bo tròn, bóng đổ nhẹ, chữ xanh đậm).
  2. **Truy Vấn Theo Bounding Box (`GET /apartments/search/pins?bbox=...`):**
     * Khi bấm nút:
       * Lấy tọa độ hộp giới hạn hiện tại của bản đồ: `bounds = map.getBounds()` gồm `[minLng, minLat, maxLng, maxLat]`.
       * Gửi query lên backend: Backend sử dụng toán tử không gian MongoDB `$geoWithin: { $box: [[minLng, minLat], [maxLng, maxLat]] }` kết hợp cùng các bộ lọc giá/loại căn đang chọn.
       * Tải lại các ghim tương ứng trong khung nhìn và ẩn nút nổi đi.
  3. **Tùy Chọn Tự Động (Auto-Search Checkbox):**
     * Góc trên bản đồ cung cấp checkbox nhỏ: `[ ] Tự động tìm khi di chuyển`.
     * Nếu tích chọn: Mỗi khi ngừng di chuyển bản đồ (sự kiện `moveend` với debounce 500ms), hệ thống tự động tải lại ghim trong khung nhìn mà không cần bấm nút.

---

### User Story 15.4: Trực Quan Hóa Bán Kính Điểm Mốc & Lớp Phủ Tiện Ích Đà Nẵng (Landmark Radius Circles & Da Nang POIs Layer)
* **Là một:** CTV đang tư vấn cho khách thuê có nhu cầu sống gần một địa điểm cụ thể (ví dụ: bãi biển, trường đại học, nơi làm việc).
* **Tôi muốn:** Khi tìm kiếm theo điểm mốc, bản đồ vẽ vòng tròn bán kính trực quan quanh điểm đó, đồng thời cho phép bật/tắt các biểu tượng tiện ích nổi tiếng tại Đà Nẵng.
* **Để:** Tôi và khách nhìn thấy ngay lập tức những căn nào thực sự nằm trong cự ly đi bộ/xe máy mà khách mong muốn.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Vẽ Vòng Tròn Bán Kính Tự Động (`L.circle` Radius Overlay):**
     * Khi người dùng tìm kiếm từ khóa có điểm mốc và bán kính (ví dụ: `gần Cầu Rồng 2km` hoặc chọn mốc `ĐH Kinh Tế`):
       * Bản đồ đặt một marker đặc biệt đánh dấu tâm điểm mốc (icon cờ hoặc ngôi sao kèm tên ngắn: *Cầu Rồng*).
       * Tự động vẽ một vòng tròn bán kính mờ màu xanh indigo (`stroke: true, color: '#4f46e5', fillOpacity: 0.08, radius: radiusInMeters`).
       * Tự động điều chỉnh khung nhìn (`map.fitBounds`) bao trọn toàn bộ vòng tròn bán kính.
  2. **Lớp Phủ Tiện Ích Đà Nẵng Đặt Sẵn (Da Nang POIs Toggle):**
     * Cung cấp thanh chip lọc tiện ích nổi bật ở cạnh trên bản đồ (có thể cuộn ngang):
       * `🏖️ Bãi biển` (Mỹ Khê, Non Nước, T20, Phạm Văn Đồng).
       * `🛒 Chợ & TTTM` (Chợ Bắc Mỹ An, Chợ Cồn, Chợ Hàn, Vincom, Lotte Mart).
       * `🎓 Đại học` (Bách Khoa, Kinh Tế, Sư Phạm, Duy Tân, FPT).
       * `✈️ Sân bay & Cầu` (Sân bay Đà Nẵng, Cầu Rồng, Cầu Sông Hàn, Cầu Trần Thị Lý).
     * Khi bấm bật một nhóm: Các biểu tượng tương ứng xuất hiện trên bản đồ dưới dạng icon tròn nhỏ $28\text{px}$, bấm vào hiện popup tên địa điểm và khoảng cách tương đối.

---

### User Story 15.5: Bản Đồ Bán Kính Bảo Mật Cho Trang Khách Thuê Công Khai (`/p/:slug` Privacy Neighborhood Map)
* **Là một:** Khách thuê hoặc Người nước ngoài đang mở link xem phòng công khai do CTV gửi.
* **Tôi muốn:** Có một bản đồ trực quan ở cuối trang xem phòng thể hiện vị trí lân cận của căn hộ so với bãi biển và các trục đường lớn.
* **Để:** Nắm rõ khu vực sống mà không cần phải hỏi lại CTV, đồng thời giúp CTV chốt khách nhanh hơn.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Bản Đồ Mini Nhúng Tối Giản (Lightweight Embedded Map):**
     * Tích hợp một khung bản đồ mini ở phần cuối trang [PublicListingPage.tsx](file:///d:/CODE/AppartmentSaleProject/frontend/src/pages/PublicListingPage.tsx) (ngay trên thanh liên hệ CTV).
     * Bản đồ chỉ tải khi người dùng cuộn tới gần (Intersection Observer lazy-load), không làm chậm tốc độ tải trang ban đầu.
  2. **Cơ Chế Bảo Vệ Vị Trí Tuyệt Đối (300m Privacy Radius Circle):**
     * **TUYỆT ĐỐI KHÔNG GHIM CHÍNH XÁC VỊ TRÍ:**
       * Không cắm marker nhọn chỉ đúng số nhà của chủ nhà.
       * Tọa độ tâm bản đồ được làm lệch ngẫu nhiên có kiểm soát từ 100m – 200m (Fuzzing Offset).
       * Thay vào đó, vẽ một **Vòng tròn bán kính mờ 300m** với màu xanh dịu mát (`fillColor: '#3b82f6', fillOpacity: 0.15`).
       * Chú thích rõ ràng bên dưới:
         > *"📍 Khu vực lân cận: [Tên đường], [Khu vực/Phường]. Vị trí chính xác sẽ được hướng dẫn khi bạn hẹn giờ xem phòng cùng chuyên viên."*
  3. **Thước Đo Tiện Ích Đi Bộ (Walking Distance Highlights):**
     * Bên cạnh bản đồ, hiển thị các huy hiệu tiện ích tự động:
       * `🌊 Cách bãi biển Mỹ Khê ~450m (6 phút đi bộ)`
       * `🛒 Cách chợ Bắc Mỹ An ~300m`
       * `☕ Khu phố Tây An Thượng ~200m`
     * Giúp khách thuê (đặc biệt là khách du lịch, chuyên gia nước ngoài) đưa ra quyết định đặt lịch xem phòng ngay lập tức.

---

### User Story 15.6: Bộ Định Vị Tên Đường Tự Động Miễn Phí Khi Nhập Tin (Automated OSM Nominatim / Photon Geocoding)
* **Là một:** Quản lý hoặc CTV đang nạp thông tin căn hộ vào hệ thống bằng chế độ gõ địa chỉ trực tiếp.
* **Tôi muốn:** Hệ thống tự động phân giải tên đường và quận tại Đà Nẵng để gán tọa độ GPS tương đối chính xác cho căn hộ ngay cả khi tôi không dán link Google Maps.
* **Để:** Giảm thiểu tối đa số lượng căn hộ bị gán tạm về tâm quận (loại bỏ cờ `approximate`), giúp kho hàng hiển thị rải đều chính xác trên bản đồ.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Tích Hợp Geocoding Miễn Phí (Nominatim / Photon Đà Nẵng):**
     * Trong [apartment-location.ts](file:///d:/CODE/AppartmentSaleProject/backend/src/modules/apartments/apartment-location.ts):
       * Khi người dùng nhập `street` + `district` / `zone` mà không có `mapUrl`:
       * Hệ thống gọi ngầm Geocoding Service (OpenStreetMap Nominatim hoặc Photon API công cộng với query giới hạn khu vực Đà Nẵng: `q=<street>, <ward>, <district>, Da Nang`).
       * Nếu tìm thấy tọa độ đường/ngã ba tương ứng: Lưu tọa độ này vào `location.coordinates` và đánh dấu `approximate = false` (hoặc cờ `street_level = true`).
  2. **Bộ Nhớ Đệm Tọa Độ Đường Phố (Local Geocoding Cache):**
     * Lưu trữ cache tên đường $\rightarrow$ tọa độ vào một collection MongoDB `Geocache` hoặc memory cache.
     * Khi đã giải mã tên đường "Hoàng Kế Viêm, Ngũ Hành Sơn" một lần, các căn tiếp theo cùng tên đường sẽ lấy ngay từ cache trong $1\text{ms}$, tuyệt đối không gọi lại API bên ngoài, đảm bảo không vi phạm giới hạn tần suất (Rate Limit 1 req/s của Nominatim).

---

### ✅ Cập nhật 21/11/2026 (Project Owner)
* **Story 15.5 đổi hướng:** trang khách hiện **đúng vị trí và địa chỉ đầy đủ**, không làm lệch, không vòng 300m (chi tiết: `tasks/STORY-15.5-PUBLIC-PRIVACY-NEIGHBORHOOD-MAP.md`).
* **Thêm Story 15.7 — Chọn Vị Trí Chính Xác Khi Nhập Căn:** ghim kéo tay / GPS trong form, thêm trường Tên tòa nhà / dự án và Phường để bản đồ hiện đúng nhất (chi tiết: `tasks/STORY-15.7-EXACT-LOCATION-PIN-PICKER.md`).
* **Bản đồ nền:** CARTO nay cần API key miễn phí (≤ 1 triệu tile / tháng cho app kinh doanh) — xem `EXTERNAL_CONFIG.md` mục 8.1.

---

## Kế hoạch Thực hiện (Execution Phasing)

* **Giai đoạn 1 (Làm ngay):** 
  * Hoàn thành **Story 15.1** (Tile CartoDB Positron / Voyager tối giản + Nút định vị GPS Locate-Me của CTV ngoài thực địa).
  * Hoàn thành **Story 15.2** (Thuật toán Spiderfy tản ghim xoắn ốc khi trùng tâm quận / cùng tòa nhà).
* **Giai đoạn 2 (Tương tác nâng cao):**
  * Hoàn thành **Story 15.3** (Tìm kiếm theo khung nhìn Bounding Box "Tìm ở khu vực này").
  * Hoàn thành **Story 15.4** (Vòng tròn bán kính điểm mốc + Lớp phủ tiện ích POIs Đà Nẵng).
* **Giai đoạn 3 (Chốt khách & Tự động hóa):**
  * Hoàn thành **Story 15.5** (Bản đồ bán kính bảo mật 300m cho trang khách `/p/:slug`).
  * Hoàn thành **Story 15.6** (Geocoding tự động cho tên đường khi nhập tin).

---

## Định nghĩa Hoàn thành Toàn Epic (Definition of Done - DoD)
* [ ] Tất cả các User Stories từ 15.1 đến 15.5 có mã nguồn sạch, chạy kiểm tra `tsc --noEmit` và `npm run build` ở cả frontend và backend không có lỗi.
* [ ] 100% tuân thủ quy tắc **0 đồng chi phí API** (không kéo SDK tính phí của Google Maps).
* [ ] Thử nghiệm thực địa trên điện thoại di động: Nút định vị GPS bay chính xác đến vị trí người dùng trong vòng 2 giây.
* [ ] Kiểm tra an toàn dữ liệu: Trang khách `/p/:slug` không để lộ tọa độ chính xác của chủ nhà dưới bất kỳ hình thức nào (kể cả inspect mạng Network tab).
* [ ] Cập nhật tài liệu lộ trình [00_ROADMAP_OVERVIEW.md](file:///d:/CODE/AppartmentSaleProject/docs/stories/00_ROADMAP_OVERVIEW.md).
