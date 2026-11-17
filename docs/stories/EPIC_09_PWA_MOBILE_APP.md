# EPIC-09: Ứng dụng Di động PWA & Trải nghiệm Mobile-First (Progressive Web App)

## Mục tiêu
Biến website RoomMaster thành một ứng dụng di động có thể cài đặt trực tiếp lên màn hình chính điện thoại của CTV và Quản lý (iOS & Android) mà không cần đưa lên App Store hay Google Play. 
Tối ưu hóa toàn diện giao diện công thái học (Ergonomics) cho thao tác 1 tay, hỗ trợ xem kho hàng ngoại tuyến (Offline) khi mất sóng trong thang máy/tầng hầm, và tích hợp sâu tính năng chia sẻ Zalo 1-chạm của hệ điều hành.

---

## Danh mục các User Stories

| Story | Tên User Story | Trọng tâm kỹ thuật | Độ ưu tiên |
| :--- | :--- | :--- | :---: |
| **Story 9.1** | Cấu hình PWA Core, Manifest & Service Worker Cache | `manifest.webmanifest`, `vite-plugin-pwa`, Workbox offline caching | P0 |
| **Story 9.2** | Thanh Hướng dẫn Cài đặt Thông minh (iOS & Android) | Smart Install Prompt: 1-click cho Android, hướng dẫn 2 bước cho Safari iOS | P0 |
| **Story 9.3** | Thanh Điều hướng Đáy Công thái học (Mobile Bottom Nav) | Sticky Bottom Bar, chuẩn ngón tay cái $\ge 44px$, iOS Safe Area Insets | P0 |
| **Story 9.4** | Tương tác Cảm ứng & Chia sẻ Hệ thống (Gestures & Web Share) | Web Share API (gửi Zalo 1-chạm), Pull-to-Refresh, Haptic Vibration | P1 |

---

### User Story 9.1: Cấu hình PWA Core, Web App Manifest & Service Worker Cache
* **Là một:** CTV hoặc Quản lý sử dụng điện thoại di động (iPhone / Android).
* **Tôi muốn:** Cài đặt website RoomMaster ra màn hình chính điện thoại, mở toàn màn hình (Standalone) không có thanh địa chỉ web, và vẫn xem được danh sách phòng ngay cả khi mất sóng 4G/Wifi.
* **Để:** Mở kho hàng cực nhanh trong 1 giây, tra cứu phòng liên tục không bị gián đoạn khi đi vào thang máy, tầng hầm hay ngõ sâu.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Web App Manifest (`manifest.webmanifest`):**
     * Tên đầy đủ: `RoomMaster - Kho Căn Hộ Cho Thuê`
     * Tên ngắn gọn (hiển thị dưới icon): `RoomMaster`
     * Khai báo bộ icons độ nét cao: `192x192px`, `512x512px` và icon maskable thích ứng viền tròn/vuông.
     * `display: "standalone"` (ẩn hoàn toàn thanh URL và thanh công cụ của trình duyệt).
     * `theme_color: "#4f46e5"`, `background_color: "#f8fafc"`, `orientation: "portrait"`.
  2. **Thẻ Meta hỗ trợ iOS Safari:**
     * Khai báo đầy đủ `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` (translucent), `apple-touch-icon`.
  3. **Bộ nhớ đệm Service Worker (Workbox qua `vite-plugin-pwa`):**
     * **CacheFirst:** Toàn bộ file tĩnh (HTML, CSS, JS, fonts, icon) tải ngay trong 0ms từ bộ nhớ máy.
     * **CacheFirst có giới hạn:** Ảnh căn hộ Cloudinary đã xem 1 lần sẽ được lưu vào máy (tối đa 50 ảnh gần nhất), tiết kiệm 70% data 4G và mở tức thì.
     * **NetworkFirst:** Danh sách căn hộ (`/api/v1/apartments`) ưu tiên lấy dữ liệu mới nhất từ server; nếu mất mạng thì tự động lấy dữ liệu bản sao lưu gần nhất.
  4. **Chế độ Ngoại tuyến (Offline Mode):**
     * Khi mất kết nối mạng hoàn toàn: Ứng dụng vẫn mở bình thường, hiển thị danh sách phòng trong cache kèm thanh thông báo nhỏ: *"📶 Đang xem dữ liệu ngoại tuyến (Offline)"*.

---

### User Story 9.2: Thanh Hướng dẫn Cài đặt Thông minh (Smart Install Prompt cho iOS & Android)
* **Là một:** CTV truy cập website lần đầu bằng trình duyệt trên điện thoại.
* **Tôi muốn:** Được hướng dẫn rõ ràng, trực quan cách cài đặt app ra màn hình chính phù hợp với hệ điều hành điện thoại tôi đang dùng.
* **Để:** Cài đặt thành công ngay trong 5 giây mà không cần tự mày mò trong cài đặt trình duyệt.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Trên Android (Chrome, Samsung Internet, Cốc Cốc):**
     * Bắt sự kiện `beforeinstallprompt`, hiển thị banner nhỏ ghim đáy màn hình: *"Cài đặt RoomMaster để mở nhanh như App"* kèm nút `[Cài đặt ngay]`.
     * Khi bấm `[Cài đặt ngay]`: Tự động gọi popup cài đặt hệ thống của Android.
  2. **Trên iOS (Safari iPhone / iPad):**
     * Nhận diện thiết bị iOS chưa chạy ở chế độ standalone.
     * Hiển thị pop-up hướng dẫn 2 bước bằng icon trực quan:
       * *Bước 1:* Chạm vào nút **Chia sẻ** (icon ô vuông có mũi tên lên ở thanh đáy Safari).
       * *Bước 2:* Cuộn xuống và chọn **"Thêm vào MH chính" (Add to Home Screen)**.
  3. **Tôn trọng người dùng:**
     * Có nút đóng `(X)`. Nếu người dùng bấm đóng hoặc đã cài đặt thành công, lưu vào `localStorage` để không hiển thị lại làm phiền trong 7 ngày.
     * Không hiển thị banner này nếu người dùng đang truy cập bằng máy tính (Desktop).

---

### User Story 9.3: Thanh Điều hướng Đáy Công thái học (Mobile Bottom Navigation Bar & Safe Area)
* **Là một:** CTV đang vừa cầm điện thoại bằng 1 tay vừa chạy xe hoặc dẫn khách.
* **Tôi muốn:** Các nút điều hướng chính nằm cố định ở sát mép dưới màn hình trong tầm với của ngón tay cái.
* **Để:** Chuyển đổi giữa các chức năng tìm phòng, lọc nhanh và hồ sơ mà không cần phải với tay lên tận đỉnh màn hình.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Thanh Menu đáy (Bottom Navigation Bar) hiển thị trên màn hình di động (< 768px):**
     * `[🏠 Bảng hàng]`: Về danh sách căn hộ.
     * `[⚡ Lọc nhanh]`: Mở nhanh thanh lọc Faceted / Bán kính.
     * `[✨ Nhập tin AI]`: Mở modal dán tin nhập nhanh bằng AI (chỉ hiện với Quản lý / Admin).
     * `[👤 Tài khoản]`: Mở modal hồ sơ CTV / Đổi SĐT Zalo.
  2. **Kích thước công thái học (Thumb-friendly target):**
     * Chiều cao thanh menu $\ge 56px$, vùng chạm của mỗi nút $\ge 44px$ tránh bấm trượt.
     * Icon rõ ràng kèm nhãn chữ nhỏ bên dưới. Mục đang chọn có màu tím nổi bật (`text-indigo-600`).
  3. **Tương thích vùng an toàn iPhone (Safe Area Insets):**
     * Tự động đệm khoảng cách đáy bằng `env(safe-area-inset-bottom)` để thanh menu không bị đè lên thanh gạt Home (Home Bar) của iPhone X trở lên.
     * Trang nội dung danh sách căn hộ tự động thêm `padding-bottom: 80px` để căn hộ cuối cùng không bị menu đáy che mất.

---

### User Story 9.4: Tương tác Cảm ứng & Chia sẻ Hệ thống (Touch Gestures & Web Share API)
* **Là một:** CTV đang thao tác trên thẻ căn hộ.
* **Tôi muốn:** Vuốt kéo màn hình để cập nhật phòng mới và bấm 1 nút để mở ngay menu chia sẻ sang Zalo/Messenger của điện thoại.
* **Để:** Tư vấn và gửi phòng cho khách ngay lập tức mà không cần copy link thủ công.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Chia sẻ 1-chạm qua Web Share API (`navigator.share`):**
     * Trên thẻ căn hộ hoặc trang chi tiết, nút "Gửi khách" sẽ kiểm tra hỗ trợ `navigator.share`:
       * Nếu được hỗ trợ (đa số trình duyệt mobile): Mở thẳng khay chia sẻ hệ thống của iOS/Android kèm tiêu đề, tóm tắt và đường link căn hộ $\rightarrow$ CTV chỉ cần chạm chọn gửi vào hội thoại Zalo/Messenger của khách.
       * Nếu không hỗ trợ: Tự động fallback về chức năng sao chép văn bản vào Clipboard.
  2. **Kéo xuống để làm mới (Pull-to-Refresh):**
     * Vuốt kéo màn hình từ đỉnh xuống sẽ hiện vòng xoay làm mới và tự động tải lại danh sách phòng mới nhất từ server.
  3. **Phản hồi xúc giác (Haptic Feedback):**
     * Khi CTV bấm chọn các tag lọc nhanh hoặc bấm sao chép/chia sẻ thành công, điện thoại rung nhẹ một nhịp ngắn (`navigator.vibrate(10)`) mang lại cảm giác chân thực như app native.
