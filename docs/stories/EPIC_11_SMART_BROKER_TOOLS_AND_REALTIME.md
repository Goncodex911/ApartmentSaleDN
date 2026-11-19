# EPIC-11: Bộ Công cụ Môi giới Nâng cao & Vận hành Kho phòng Thông minh (Smart Broker Tools & Realtime Inventory)

## Mục tiêu
Nâng cấp hệ sinh thái RoomMaster từ một bảng hàng tra cứu thông thường thành **"vũ khí chốt khách siêu tốc"** cho Cộng tác viên (CTV) và công cụ tự động hóa vận hành cho Quản lý (Manager). 
Tập trung vào 4 trụ cột nghiệp vụ then chốt: **Bản đồ tương tác trực quan**, **Tự động ghép nhu cầu khách hàng (Reverse Lead Matching)**, **Cập nhật biến động kho hàng theo thời gian thực (Real-time SSE)** và **Quản lý vòng đời hợp đồng tái thuê**.

---

## Bối cảnh & Giá trị Kinh doanh
Sau khi hệ thống đã hoàn thiện khả năng Ingestion, khử trùng tin (Epic 3), bộ lọc Slang/GPS (Epic 4), chuẩn hóa nhập tin (Epic 8) và PWA Mobile (Epic 9-10), hệ thống bước vào giai đoạn **tối ưu hóa chuyển đổi và giữ chân nguồn hàng**:
1. **Nỗi đau của CTV:**
   * Mất khách vì khi khách hỏi thì không có phòng, vài ngày sau có phòng mới về thì quên mất khách cũ để chào.
   * Dẫn khách đi xem 3-4 căn một buổi chiều thường bị lạc đường, đi vòng vèo qua lại cầu Rồng/sông Hàn làm mất thời gian và thiếu chuyên nghiệp.
   * Dắt khách đến tận cửa tòa nhà mới phát hiện căn đã bị môi giới khác cọc từ sáng do hệ thống không cập nhật tức thì.
2. **Nỗi đau của Quản lý (Manager):**
   * Sau khi căn cho thuê (`RENTED`), thông tin bị "đóng băng", không biết khi nào khách hết hạn hợp đồng để chủ động nhắc khách gia hạn hoặc mở bán lại.
   * Khó kiểm soát tình trạng "tin ảo/chủ nhà đã cho thuê" mà không báo, phụ thuộc vào việc gọi điện kiểm tra thủ công.

---

## Danh mục các User Stories

| Story | Tên User Story | Trọng tâm kỹ thuật | Độ ưu tiên |
| :--- | :--- | :--- | :---: |
| **Story 11.1** | Ghép Nhu cầu Khách hàng Tự động (Reverse Lead Matching) | Lead Model, Matching Algorithm, Notification Service | P0 |
| **Story 11.2** | Bản đồ Tương tác & Bong bóng Giá (Interactive Map & Price Pills) | Leaflet / MapLibre (OSM tiles), Marker Cluster, Location Jitter | P0 |
| **Story 11.3** | Bộ Lập Lộ trình Dẫn khách Thông minh (Showing Tour Route Planner) | Multi-select UI, Nearest Neighbor Route, Google Maps Waypoints | P1 |
| **Story 11.4** | Kho phòng Thời gian thực & Báo lỗi Cộng đồng (Real-time SSE & Health) | Server-Sent Events (SSE), Listing Flagging, Dynamic UI Badges | P0 |
| **Story 11.5** | Quản lý Vòng đời Hợp đồng & Nhắc Tái ký (Lease Renewal Tracker) | Lease Meta, Cron Job Daily Alert, Pipeline Status Flow | P1 |
| **Story 11.6** | Bảng So sánh Căn hộ & Dự tính Chi phí Thực tế (Comparison & Calculator) | Multi-property Matrix, Cost Simulation Engine, Expat UX | P2 |

---

### User Story 11.1: Ghép Nhu cầu Khách hàng Tự động (Reverse Lead Matching - "Khách Tìm Phòng")
* **Là một:** Cộng tác viên (CTV) đang nhận nhu cầu thuê từ khách nhưng kho hiện tại chưa có căn phù hợp.
* **Tôi muốn:** Lưu tiêu chí tìm phòng của khách (Khu vực, loại căn, tầm giá, tiện ích bắt buộc, ngày dọn vào) vào hệ thống.
* **Để:** Khi có căn hộ mới được nạp vào kho (qua Manager duyệt hoặc Bot cào tin), hệ thống tự động đối soát và bắn thông báo ngay cho tôi để chào khách trước khi căn bị người khác chốt.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Tạo & Quản lý Nhu cầu Khách (Lead Form):**
     * Form tạo lead tinh gọn trên mobile (< 5 trường): Tên/Biệt danh khách, SĐT (tùy chọn), Khu vực mong muốn (Mỹ An, An Thượng, Sơn Trà...), Loại phòng (Studio, 1N1K, 2PN...), Ngân sách tối đa (VND hoặc USD), Tiện ích bắt buộc (Hồ bơi, Nuôi thú cưng, Máy giặt riêng, Thang máy), Ngày dự kiến dọn vào.
     * CTV chỉ nhìn thấy và quản lý các Lead do chính mình tạo (bảo vệ nguồn khách riêng).
  2. **Thuật toán Khớp Tin Tự động (Auto-Matching Engine):**
     * Kích hoạt mỗi khi có căn hộ mới chuyển sang trạng thái `AVAILABLE`.
     * Thuật toán so khớp chấm điểm (Matching Score $\ge 80\%$):
       * Khớp khu vực / quận: Trọng số 35%.
       * Giá thuê $\le$ Ngân sách tối đa của khách: Trọng số 35%.
       * Loại phòng (Studio, 1N1K...): Trọng số 20%.
       * Tiện ích bắt buộc: Trọng số 10%.
  3. **Hệ thống Thông báo Trong Ứng dụng (In-App Notification):**
     * Khi đạt điểm khớp: Tạo thông báo gửi đến tài khoản CTV: *"🎯 Có 1 căn mới phù hợp 90% với khách [Chị Lan - 2PN An Thượng] của bạn!"*.
     * Bấm vào thông báo: Mở ngay danh sách căn vừa khớp kèm nút "Copy bài gửi khách" 1-chạm.

---

### User Story 11.2: Bản đồ Tương tác Căn hộ & Bong bóng Giá (Interactive Map & Price Pills)
* **Là một:** CTV hoặc Khách thuê đang tìm kiếm phòng theo vị trí địa lý tại Đà Nẵng.
* **Tôi muốn:** Xem toàn bộ căn hộ hiển thị trực quan trên bản đồ với các bong bóng giá (`7.5tr`, `12tr`, `$550`) và có thể gạt đổi giữa chế độ Danh sách và Bản đồ.
* **Để:** Hình dung ngay lập tức vị trí căn hộ so với bãi biển Mỹ Khê, sông Hàn hay nơi làm việc của khách mà không phải tra cứu địa chỉ thủ công.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Bản đồ mã nguồn mở tiết kiệm chi phí (Zero Map Cost):**
     * Tích hợp thư viện Leaflet / MapLibre GL với OpenStreetMap tiles (hoàn toàn miễn phí, không phát sinh chi phí Google Maps API đắt đỏ).
     * Nút chuyển đổi nhanh `[📋 Danh sách]` $\leftrightarrow$ `[🗺️ Bản đồ]` ghim nổi bật trên mobile.
  2. **Bong bóng giá trực quan & Gom cụm (Price Pills & Clustering):**
     * Marker hiển thị số tiền ngắn gọn: `8.5tr`, `14tr`, `$600` với màu sắc phân biệt theo trạng thái (Xanh = Trống, Cam = Sắp trống).
     * Khi thu nhỏ bản đồ (zoom out), tự động gom các ghim gần nhau thành cụm tròn hiển thị số lượng (vd: `[12 căn - Khu An Thượng]`).
  3. **Thẻ Xem Nhanh & Bảo Vệ Vị Trí (Privacy & Mini-Card):**
     * Chạm vào bong bóng giá: Hiện thẻ xem nhanh ở đáy màn hình gồm ảnh đại diện, tên đường, loại căn, giá thuê, nút "Xem chi tiết" và nút "Chỉ đường".
     * **Bảo vệ vị trí chính xác:** Tọa độ ghim trên bản đồ công khai được làm lệch nhẹ ngẫu nhiên (Jitter bán kính 50-80m quanh vị trí thực tế) để ngăn đối thủ và khách vãng lai tự tìm đến cắt cầu chủ nhà.

---

### User Story 11.3: Bộ Lập Lộ trình Dẫn khách Thông minh (Showing Tour Route Planner)
* **Là một:** CTV chuẩn bị dắt khách đi xem 3-4 căn trong một buổi chiều.
* **Tôi muốn:** Tích chọn các căn muốn xem và hệ thống tự động sắp xếp thứ tự đường đi ngắn nhất, sau đó mở thẳng lộ trình trên Google Maps.
* **Để:** Chuyến dẫn khách diễn ra mượt mà, chuyên nghiệp, không bị đi lòng vòng hay quay đầu qua các cây cầu, nâng cao hình ảnh uy tín trước khách hàng.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Chế độ Chọn Nhiều Căn (Multi-select Tour Mode):**
     * Cho phép bật chế độ chọn căn từ danh sách bảng hàng (giới hạn tối đa 5 căn cho 1 chuyến dẫn khách).
     * Thanh tác vụ nổi ở đáy hiện: *"Đã chọn X căn"* kèm nút `[🗺️ Tạo lộ trình xem nhà]`.
  2. **Tối ưu hóa Tuyến đường (Route Optimization):**
     * Thuật toán sắp xếp thứ tự các điểm dừng dựa trên khoảng cách địa lý (Nearest Neighbor Algorithm) theo tọa độ GPS, tránh các tuyến đường ngược chiều hoặc bắt chéo qua sông Hàn không cần thiết.
  3. **Xuất Lộ trình Sang Ứng dụng Bản đồ (Google Maps Deep-link):**
     * Tự động sinh đường link Google Maps có sẵn các điểm dừng (Waypoints):
       `https://www.google.com/maps/dir/?api=1&origin=...&destination=...&waypoints=...`
     * CTV bấm nút: Ứng dụng Google Maps trên điện thoại tự mở ra sẵn sàng điều hướng bằng xe máy.
     * Màn hình tóm tắt lịch trình hiển thị danh sách các căn theo thứ tự xem: Địa chỉ, giờ hẹn gợi ý, ghi chú mã cửa/tầng và SĐT chủ nhà (chỉ mở cho CTV có quyền).

---

### User Story 11.4: Cập Nhật Kho Phòng Thời Gian Thực & Báo Lỗi Cộng Đồng (Real-time SSE & Crowdsourced Listing Health)
* **Là một:** CTV đang tư vấn phòng cho khách ngoài đường.
* **Tôi muốn:** Nhận thông báo tức thì khi có căn vừa được cọc hoặc vừa có căn mới vào kho, đồng thời có thể bấm báo lỗi nếu phát hiện căn đã cho thuê hoặc thông tin sai.
* **Để:** Không bao giờ tư vấn căn đã bị người khác cọc từ trước, và cùng cộng đồng CTV giữ kho hàng luôn chính xác 100%.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Luồng Cập nhật Thời gian thực Siêu Nhẹ (Server-Sent Events - SSE):**
     * Backend cung cấp endpoint SSE `/api/v1/realtime/stream` duy trì kết nối nhẹ nhàng, tiêu thụ ít tài nguyên hơn nhiều so với WebSocket.
     * Phát broadcast sự kiện khi:
       * Căn hộ chuyển sang `DEPOSITED` hoặc `RENTED`.
       * Có căn hộ mới được duyệt vào kho (`AVAILABLE`).
       * Chủ nhà cập nhật giảm giá phòng.
  2. **Phản hồi Tức thì trên Giao diện Mobile (Dynamic State Sync):**
     * Thẻ căn hộ trên màn hình người dùng tự động chuyển sang màu xám mờ và đổi nhãn sang `[VỪA CỌC]` ngay trong 1 giây mà không cần F5 trình duyệt.
     * Toast thông báo góc màn hình: *"⚡ Căn 302 Monarchy vừa được đặt cọc!"*.
  3. **Cơ chế Báo Lỗi Kho Hàng từ Cộng đồng (Crowdsourced Listing Health):**
     * Nút `[⚠️ Báo lỗi]` trên thẻ chi tiết căn: CTV chọn nhanh 1 trong các lý do:
       * `Đã cho thuê / Hết phòng`
       * `Chủ tăng giá / Sai giá`
       * `Số điện thoại chủ nhà không liên lạc được`
       * `Ảnh không đúng thực tế`
     * **Cơ chế gắn cờ tự động:** Khi nhận từ 2 lượt báo lỗi trở lên từ 2 CTV khác nhau, hệ thống tự động gắn nhãn cảnh báo màu vàng `[⚠️ Chờ xác minh]` và gửi task ưu tiên cho Manager kiểm tra lại chủ nhà.

---

### User Story 11.5: Quản lý Vòng đời Hợp đồng & Nhắc Tái Ký (Lease Renewal & Inventory Lifecycle)
* **Là một:** Quản lý (Manager) và CTV đã chốt hợp đồng cho thuê căn hộ.
* **Tôi muốn:** Hệ thống ghi nhận ngày bắt đầu, thời hạn thuê và tự động đếm ngược để thông báo trước khi hết hạn hợp đồng 30 ngày.
* **Để:** Chủ động liên hệ khách cũ gia hạn hợp đồng hoặc chuẩn bị rổ hàng đưa trở lại trạng thái `UPCOMING` đúng thời điểm, đảm bảo phòng luôn có khách lấp đầy.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Ghi nhận Hợp đồng Thuê khi Đổi Trạng thái `RENTED`:**
     * Khi Manager hoặc CTV đánh dấu căn là `RENTED`, popup yêu cầu nhập bổ sung:
       * Ngày bắt đầu hợp đồng (`rentedAt`).
       * Thời hạn hợp đồng (`leaseDurationMonths`: 1, 3, 6, 12 tháng).
       * CTV chốt căn (`closedBy`).
       * Tên & SĐT khách thuê (Lưu trữ bảo mật, chỉ Manager và CTV chốt căn nhìn thấy).
  2. **Tiến trình Nhắc nhở Tự động (Scheduled Cron Job):**
     * Hằng ngày vào 08:00 sáng, hệ thống tự động rà soát các căn có hạn hợp đồng còn $\le 30$ ngày và $\le 15$ ngày.
     * Tự động gửi thông báo nhắc việc cho Manager và CTV quản lý hợp đồng đó: *"🔔 Căn 401 Monarchy sắp hết hạn thuê vào ngày DD/MM (còn 30 ngày). Hãy liên hệ khách xem nhu cầu gia hạn!"*.
  3. **Chuyển đổi Trạng thái Sắp trống (Upcoming Transition):**
     * Nếu khách báo không gia hạn: Manager bấm 1 nút chuyển trạng thái căn sang `UPCOMING` (Kèm ngày trống dự kiến) $\rightarrow$ Căn hộ lập tức xuất hiện trở lại bảng hàng để các CTV khác bắt đầu chào khách mới trước 2-3 tuần.

---

### User Story 11.6: Bảng So Sánh Căn Hộ & Dự Tính Chi Phí Thực Tế (Apartment Comparison & Cost Calculator)
* **Là một:** Khách thuê (đặc biệt là khách nước ngoài / gia đình) hoặc CTV đang tư vấn.
* **Tôi muốn:** Đặt 2-3 căn hộ lên bảng so sánh song song và kéo thanh trượt ước tính tổng chi phí sinh hoạt hàng tháng (gồm tiền thuê, điện, nước, dịch vụ).
* **Để:** Khách thấy được sự minh bạch về tài chính, dễ dàng đưa ra quyết định chốt cọc nhanh hơn gấp đôi mà không lo phát sinh chi phí ẩn.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Bảng So Sánh Song Song (Comparison Matrix View):**
     * Cho phép chọn 2 hoặc 3 căn hộ để so sánh đối đầu trên 1 màn hình (hỗ trợ cuộn ngang mượt mà trên mobile).
     * Các trường so sánh trực quan:
       * Giá thuê niêm yết (VND & USD).
       * Vị trí & Khoảng cách đi bộ ra biển / trung tâm.
       * Diện tích & Loại phòng (Studio / 1N1K / 2PN).
       * Tiện ích đối đầu (Hồ bơi, Thang máy, Ban công, Máy giặt riêng, Nuôi pet).
       * Bảng phí dịch vụ (Giá điện/kWh, Nước/người hoặc m³, Phí dọn phòng, Mạng internet).
  2. **Công cụ Tính Chi phí Sinh hoạt Thực tế (Living Cost Estimator):**
     * Tích hợp thanh trượt tương tác ngay trên trang chi tiết công khai (`/p/:slug`):
       * Số người ở (1 đến 4 người).
       * Mức độ sử dụng điều hòa: `Ít` (4-6h/ngày) / `Vừa` (8-10h/ngày) / `Nhiều` (14-18h/ngày).
     * Hệ thống tự động tính toán theo biểu phí của căn hộ:
       $$\text{Tổng chi phí ước tính} = \text{Tiền thuê} + (\text{Số kWh dự kiến} \times \text{Đơn giá điện}) + (\text{Số người} \times \text{Đơn giá nước}) + \text{Phí dịch vụ cố định}$$
     * Kết quả hiển thị rõ ràng theo cả VND và USD (ví dụ: `Tổng dự kiến: ~10.450.000 đ/tháng ($410/mo)`), giúp khách nước ngoài an tâm tuyệt đối khi xuống tiền.
