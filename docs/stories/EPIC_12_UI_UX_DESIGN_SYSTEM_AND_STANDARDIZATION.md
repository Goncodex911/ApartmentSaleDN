# EPIC-12: Chuẩn Hóa Giao Diện & Xây Dựng Design System Mobile-First (UI/UX Modernization & Design System)

## Mục tiêu
Thiết lập một **Hệ thống Thiết kế Chuẩn hóa (Design System)** và nâng cấp toàn diện giao diện người dùng của RoomMaster (ApartmentSaleDN) theo triết lý **Mobile-First**. 
Lấy cảm hứng từ các tiêu chuẩn trải nghiệm hàng đầu thế giới (Airbnb, Zillow) kết hợp với hành vi đặc thù của môi giới bất động sản Việt Nam (Batdongsan, Chợ Tốt Nhà), biến ứng dụng thành một sản phẩm công nghệ mượt mà, công thái học, trực quan và tối ưu cho thao tác một tay ngoài trời.

---

## Bối cảnh & Nghiên cứu Đối sánh (Benchmark Analysis)

### 1. Phân tích Các Ứng dụng Bất động sản Hàng đầu
Qua rà soát và đối sánh các ứng dụng bất động sản và lưu trú hàng đầu:

* **Airbnb (Tiêu chuẩn Vàng về Trải nghiệm Hình ảnh & Bản đồ):**
  * **Thẻ căn hộ trực quan (Visual-first Cards):** Cho phép vuốt xem ảnh (Swipe Carousel) trực tiếp ngay trên danh sách mà không cần bấm mở chi tiết.
  * **Bản đồ liên kết 2 chiều (Map-Card Symbiosis):** Khi lướt thẻ căn hộ, bản đồ tự trượt theo; bấm ghim giá trên bản đồ thì thẻ căn hộ tương ứng tự trồi lên.
  * **Bảng trượt công thái học (Draggable Bottom Sheet):** Hỗ trợ nhiều điểm dừng (Snap points: hé mở $\rightarrow$ nửa màn hình $\rightarrow$ toàn màn hình) kèm thanh kéo (drag handle) mượt mà.
  * **Nút nổi chuyển đổi (Floating Pill Button):** Nút tròn gạt `[🗺️ Bản đồ / 📋 Danh sách]` luôn ghim trong tầm ngón tay cái.

* **Zillow & Redfin (Tiêu chuẩn Vàng về Mật độ Dữ liệu & So sánh):**
  * **Huy hiệu thông số chuẩn hóa (Spec Pills):** `2 PN · 1 WC · 45 m² · 8.5 tr/tháng` được xếp thẳng hàng với độ tương phản cao, dễ quét mắt trong 0.5 giây.
  * **Huy hiệu số lượng ảnh (`📷 12 · 🎥 1`):** Nằm gọn góc ảnh đại diện để môi giới biết bài đăng có đủ tài liệu gửi khách hay không.

* **Batdongsan.com.vn & Chợ Tốt Nhà (Thói quen Môi giới Thực chiến tại Việt Nam):**
  * **Thanh tác vụ dính đáy (Sticky Conversion Bar):** Các nút hành động chính (`[Gọi điện]`, `[Nhắn Zalo]`, `[Sao chép tin]`) luôn ghim cố định ở đáy ngón tay cái, bấm 1 chạm là tương tác ngay.
  * **Nhãn vị trí đặc thù địa phương:** Người thuê Đà Nẵng đặc biệt quan tâm khoảng cách ra biển (`Biển 300m`), hồ bơi, cho nuôi thú cưng (`Pet friendly`) và khu vực người nước ngoài (`Khu An Thượng`).

---

### 2. Hiện trạng & Điểm nghẽn Giao diện Cần Chuẩn hóa của RoomMaster
Rà soát mã nguồn frontend hiện tại (`frontend/src/`):
1. **Thiếu hệ thống Design Tokens nhất quán:** Bảng màu đang bị phân mảnh giữa tím (`indigo-600`), navy (`#0f2a45`), vàng gold (`#d4a94f`), xanh lá (`emerald-500`) và xám (`slate-500/700`). Các nút bấm, khoảng đệm (`padding`, `gap`, `radius`) được viết tự do thay vì dùng chung bộ UI Primitives.
2. **Bảng trượt (`BottomSheet.tsx`) quá đơn sơ:** Hiện chỉ là một khung `div` cố định 11 dòng, thiếu thanh kéo `drag-handle`, chưa có hiệu ứng vuốt ngón tay kéo xuống để đóng (swipe-to-dismiss) và thiếu các điểm dừng linh hoạt (snap points).
3. **Thẻ căn hộ (`ApartmentCard.tsx`) cố định 1 dạng:** Hiện chỉ có dạng danh sách ảnh nhỏ bên trái, thiếu chế độ thẻ lớn (ảnh 16:9 lướt ngang nhiều ảnh) vốn là tiêu chuẩn giúp CTV xem nhanh nội thất trước khi gửi khách.
4. **Trình chiếu ảnh/video còn thô sơ:** Chưa hỗ trợ cử chỉ vuốt ngang toàn màn hình (fullscreen swipe) và thu phóng 2 ngón tay (pinch-to-zoom) để soi kỹ chi tiết phòng.
5. **Độ tương phản khi dùng ngoài trời:** CTV thường vừa đi xe máy vừa xem điện thoại dưới trời nắng gắt Đà Nẵng, các dòng chữ xám nhạt (`text-slate-400/500`) trên nền trắng dễ bị lóa, cần nâng cấp độ tương phản đạt chuẩn **WCAG 2.1 AA ($\ge 4.5:1$)**.

---

## Danh mục các User Stories

| Story | Tên User Story | Trọng tâm kỹ thuật | Độ ưu tiên |
| :--- | :--- | :--- | :---: |
| **Story 12.1** | Bộ Design Tokens & Thư viện Thành phần Cơ sở (Design Tokens & UI Primitives) | Bảng màu nhận diện, Typography scale, Button/Badge/Input Components | P0 |
| **Story 12.2** | Nâng cấp Thẻ Căn Hộ Đa Chế Độ & Lướt Ảnh Trực Tiếp (Adaptive Cards & Swipe) | Chế độ Grid 16:9 & List gọn, Touch Carousel, Badge số ảnh/video | P0 |
| **Story 12.3** | Bảng Trượt Công Thái Học & Thao Tác Vuốt Đóng (Draggable Bottom Sheet) | Drag Handle, Touch Swipe-to-dismiss, Snap Points 50% / 90% | P0 |
| **Story 12.4** | Trình Chiếu Ảnh/Video Toàn Màn Hình Hiện Đại (Modern Media Lightbox) | Fullscreen Swiper, Pinch-to-zoom, Thumbnail Bar, Video Player | P1 |
| **Story 12.5** | Trạng Thái Chờ Shimmer & Giao Diện Trống Tiêu Chuẩn (Skeletons & Empty States) | Shimmer Pulse Cards, Responsive Empty State Graphics & Actions | P1 |
| **Story 12.6** | Thanh Tác Vụ Dính Đáy & Tối Ưu Hiển Thị Ngoài Trời (Outdoor High-Contrast) | Sticky Action Bar, WCAG 2.1 AA Contrast, Large Thumb Targets $\ge 48px$ | P1 |

---

### User Story 12.1: Bộ Design Tokens & Thư viện Thành phần Cơ sở (Design Tokens & Core UI Primitives)
* **Là một:** Nhà phát triển Frontend và Người dùng hệ thống.
* **Tôi muốn:** Toàn bộ giao diện hệ thống tuân theo một bộ quy chuẩn thiết kế duy nhất (Design Tokens) với các thành phần giao diện dùng chung (`Button`, `Badge`, `Input`, `Select`, `Card`).
* **Để:** Ứng dụng có diện mạo chuyên nghiệp, nhất quán 100% từ trang Quản lý đến trang Khách thuê, dễ bảo trì và không còn tình trạng mỗi modal một kiểu dáng.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Chuẩn hóa Bảng Màu Nhận diện (Semantic Color Palette trong `tailwind.config.js`):**
     * `brand.navy` (`#0f2a45`): Màu nhận diện thương hiệu chính cho Header, tiêu đề lớn, text cấp 1.
     * `brand.accent` (`#4f46e5` - Indigo): Màu hành động tương tác chính (Primary Actions, Active Tabs, Focused Rings).
     * `brand.gold` (`#d4a94f`): Màu điểm nhấn cao cấp (VIP listings, Căn hộ hot, Huy hiệu đối tác).
     * `surface.*`: Nền phân cấp rõ ràng (`surface-0` = `#ffffff`, `surface-1` = `#f8fafc`, `surface-2` = `#f1f5f9`).
     * `status.*`: Trạng thái đồng nhất (Emerald cho `AVAILABLE`, Amber cho `UPCOMING`, Sky cho `DEPOSITED`, Slate cho `RENTED`).
  2. **Bộ UI Primitives dùng chung (`frontend/src/components/ui/`):**
     * `Button.tsx`: Các biến thể chuẩn `variant="primary | secondary | outline | ghost | danger"`, kích thước `size="sm | md | lg"` (chiều cao chuẩn $\ge 44px$ trên mobile).
     * `Badge.tsx`: Huy hiệu đồng bộ với 2 kiểu dáng: `solid` (nền đậm) và `soft` (nền nhạt viền mảnh chữ đậm).
     * `Input.tsx`, `Select.tsx`, `Textarea.tsx`: Đồng nhất chiều cao, bo góc `rounded-xl`, viền `border-slate-200`, hiệu ứng focus màu tím `ring-2 ring-indigo-500/20`, cỡ chữ bắt buộc $16px$ trên di động để chống auto-zoom trên iOS.
  3. **Thước đo Khoảng cách & Bo góc (Spacing & Radius Scale):**
     * Chuẩn hóa bo góc: Thẻ bài đăng `rounded-2xl` (16px), Nút & Input `rounded-xl` (12px), Chip lọc `rounded-full` (9999px).

---

### User Story 12.2: Nâng cấp Thẻ Căn Hộ Đa Chế Độ & Lướt Ảnh Trực Tiếp (Adaptive Listing Cards & Inline Photo Swipe)
* **Là một:** CTV đang lướt duyệt bảng hàng trên điện thoại.
* **Tôi muốn:** Có thể vuốt xem qua 3-4 ảnh của căn hộ ngay trên danh sách mà không cần bấm mở chi tiết, và có nút chuyển đổi giữa dạng "Thẻ lớn xem ảnh" và "Danh sách xem nhanh".
* **Để:** Đánh giá nhanh nội thất của căn hộ trong 1 giây, tiết kiệm thời gian mở ra đóng vào từng căn.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Nút Gạt Chế Độ Hiển Thị (View Mode Switcher):**
     * Trên thanh công cụ danh sách: Có nút icon gạt đổi giữa:
       * `[⊞ Thẻ ảnh lớn]` (Visual Card - Lấy cảm hứng từ Airbnb).
       * `[☰ Danh sách gọn]` (Compact List - Giao diện hiện tại tối ưu mật độ).
     * Lưu trạng thái lựa chọn của người dùng vào `localStorage`.
  2. **Thẻ Ảnh Lớn (Visual Card Layout):**
     * Khung ảnh tỉ lệ vàng `16:9` hoặc `4:3` chiếm trọn chiều ngang thẻ.
     * **Vuốt ảnh trực tiếp (Inline Swipe Carousel):** Cho phép vuốt ngang (touch swipe) để duyệt 5 ảnh tiêu biểu kèm chấm tròn chỉ số trang (`carousel dots`).
     * **Huy hiệu số lượng ảnh/video:** Góc dưới ảnh hiển thị pill mờ đen: `📷 8 · 🎥 1`.
     * **Thông số nổi bật (Spec Line):** Giá tiền hiển thị to đậm màu navy (`12.000.000 đ/tháng` hoặc `$500/mo`), bên cạnh là các pill nhỏ: `2 PN · 1 WC · 55 m² · 🌊 Biển 200m`.
  3. **Nút Hành Động 1-Chạm Nổi:**
     * Nút `[Copy tin Zalo]` và `[Tạo link khách]` được bố trí trực tiếp ở góc thẻ, bấm là sao chép hoặc chia sẻ ngay kèm rung xúc giác nhẹ (Haptics).

---

### User Story 12.3: Bảng Trượt Công Thái Học & Thao Tác Vuốt Đóng (Modern Draggable Bottom Sheet & Snap Points)
* **Là một:** Người dùng di động đang mở bộ lọc hoặc xem nhanh thông tin căn hộ.
* **Tôi muốn:** Khung hiển thị trượt êm ái từ đáy màn hình lên, có thanh kéo trực quan và có thể vuốt ngón tay xuống để đóng lại tự nhiên.
* **Để:** Thao tác mượt mà bằng ngón tay cái giống hệt như các ứng dụng gốc (Native Apps) iOS và Android.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Thanh Kéo Cảm Ứng (Drag Handle / Grabber):**
     * Đỉnh bảng trượt có thanh kéo bo tròn `w-10 h-1.5 bg-slate-300 rounded-full mx-auto my-2`.
     * Vùng chạm bắt sự kiện kéo rộng $\ge 32px$ để ngón tay dễ vuốt.
  2. **Cử chỉ Vuốt Xuống để Đóng (Swipe-Down-to-Dismiss):**
     * Hỗ trợ cử chỉ kéo vuốt xuống (Touch Pan Down): Khi người dùng vuốt xuống vượt quá $30\%$ chiều cao bảng hoặc vuốt nhanh với vận tốc cao (Velocity Flick), bảng tự động trượt xuống và đóng lại.
     * Nếu thả tay ra khi chưa đủ ngưỡng, bảng trượt nảy nhẹ trở lại vị trí cũ bằng hiệu ứng đàn hồi tự nhiên (`spring transition`).
  3. **Hỗ trợ Điểm Dừng Đa Nấc (Multi-Snap Points):**
     * Nấc 1 (50% màn hình): Phù hợp cho bộ lọc nhanh hoặc thẻ xem nhanh vị trí.
     * Nấc 2 (90% màn hình): Mở rộng toàn diện để nhập liệu form dài hoặc đọc chi tiết căn.
  4. **Hiệu ứng Nền & Vùng An Toàn:**
     * Lớp nền phủ mờ (`bg-black/40 backdrop-blur-sm`) chuyển động mượt mà theo độ mở của bảng.
     * Tự động xử lý phần đệm đáy theo `env(safe-area-inset-bottom)` để nội dung không bị che khuất bởi thanh Home của iPhone.

---

### User Story 12.4: Trình Chiếu Ảnh/Video Toàn Màn Hình Hiện Đại (Modern Media Lightbox & Pinch-to-Zoom)
* **Là một:** CTV hoặc Khách thuê đang muốn xem thật kỹ chất lượng nội thất của căn hộ.
* **Tôi muốn:** Chạm vào ảnh để mở trình chiếu toàn màn hình nền đen, có thể vuốt chuyển ảnh qua lại mượt mà và dùng 2 ngón tay phóng to để soi rõ đồ đạc.
* **Để:** Kiểm tra độ mới của điều hòa, sofa, máy giặt hoặc view ban công mà không bị mờ hay giới hạn góc nhìn.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Trình Chiếu Toàn Màn Hình (Immersive Black Lightbox):**
     * Nền đen sâu (`bg-black/95`), ẩn toàn bộ thanh điều hướng để tập trung $100\%$ vào hình ảnh.
     * Header trong suốt có nút đóng `[X]`, số thứ tự ảnh `(3/12)` và nút tải ảnh nhanh.
  2. **Cử chỉ Cảm Ứng Đa Điểm (Gestures):**
     * **Vuốt ngang (Horizontal Swipe):** Lướt mượt chuyển giữa các ảnh và video với hiệu ứng trượt tự nhiên.
     * **Phóng to 2 ngón tay (Pinch-to-zoom):** Cho phép phóng to tối đa $3\times$ để soi chi tiết nội thất, hỗ trợ Double-tap để phóng to nhanh $2\times$ và Double-tap lần nữa để thu về ban đầu.
  3. **Thanh Xem Nhanh Đáy (Thumbnail Filmstrip):**
     * Dải ảnh thu nhỏ cuộn ngang ở sát mép dưới màn hình giúp người dùng bấm nhảy nhanh đến ảnh phòng ngủ, bếp hay ban công tùy ý.
  4. **Tích hợp Video Mượt mà:**
     * Đối với video: Tự động nhận diện, hiển thị nút Play to bản ở giữa, khi phát tự động tương thích với trình phát video native của điện thoại.

---

### User Story 12.5: Trạng Thái Chờ Shimmer & Giao Diện Trống Tiêu Chuẩn (Standardized Shimmer Skeletons & Empty States)
* **Là một:** Người dùng đang sử dụng ứng dụng trong điều kiện mạng di động 4G chập chờn hoặc khi tìm kiếm không có kết quả.
* **Tôi muốn:** Thấy các khung xương sáng mờ (Shimmer Skeleton) nhấp nháy đúng hình dáng của thẻ căn hộ và thấy thông báo hướng dẫn cụ thể khi danh sách rỗng.
* **Để:** Giảm cảm giác phải chờ đợi, hiểu rõ trạng thái hệ thống và biết cách điều chỉnh bộ lọc để tìm được phòng.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Khung Xương Shimmer Mô Phỏng Đúng Thẻ (Card Shimmer Pulse):**
     * Loại bỏ hoàn toàn các spinner vòng xoay đơn điệu khi tải danh sách bảng hàng.
     * Thay thế bằng 3-5 thẻ Skeleton giả lập: Khung ảnh nhấp nháy nhẹ (`animate-pulse bg-slate-200`), 2 dòng tiêu đề giả, dòng giá và cụm tag.
     * Thời gian hiển thị skeleton chuyển đổi sang dữ liệu thật mượt mà không bị giật layout (No Layout Shift - CLS $\le 0.05$).
  2. **Giao Diện Trống Tiêu Chuẩn (Illustrated Empty States):**
     * Khi tìm kiếm hoặc lọc không có kết quả:
       * Hiển thị icon minh họa trang nhã (ví dụ: Biểu tượng kính lúp kết hợp ngôi nhà).
       * Tiêu đề rõ ràng: *"Không tìm thấy căn hộ phù hợp với bộ lọc hiện tại"*.
       * Dòng gợi ý: *"Hãy thử giảm bớt yêu cầu tiện ích hoặc mở rộng tầm giá/bán kính tìm kiếm"*.
       * Nút hành động nổi bật: `[🔄 Xóa tất cả bộ lọc]`, bấm vào lập tức đặt lại bộ lọc về mặc định và tải lại danh sách.

---

### User Story 12.6: Thanh Tác Vụ Dính Đáy & Tối Ưu Hiển Thị Ngoài Trời (Outdoor High-Contrast & Sticky Action Bar)
* **Là một:** CTV đang vừa đứng ngoài trời nắng vừa xem điện thoại hoặc đang gấp rút gửi thông tin cho khách.
* **Tôi muốn:** Mọi văn bản, thông số giá và nút bấm có độ tương phản cao, không bị lóa mờ dưới ánh nắng, cùng thanh hành động luôn nằm cố định dưới ngón tay cái.
* **Để:** Đọc thông tin rõ ràng trong 0.5 giây và bấm chia sẻ/gọi điện chính xác mà không bị bấm nhầm.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Độ Tương Phản Chuẩn WCAG 2.1 AA Ngoài Trời:**
     * Toàn bộ văn bản thông số chính (Giá, Số PN, Khoảng cách biển, Trạng thái phòng) đạt tỷ lệ tương phản tối thiểu $4.5:1$ so với nền.
     * Chữ phụ (metadata, ngày đăng) nâng cấp từ xám nhạt (`text-slate-400`) lên xám đậm (`text-slate-600`), đảm bảo đọc rõ dưới ánh sáng ban ngày.
     * Các huy hiệu trạng thái (`AVAILABLE`, `UPCOMING`, `DEPOSITED`) sử dụng chữ đậm trên nền màu nhạt có viền rõ ràng (`border`).
  2. **Thanh Tác Vụ Dính Đáy Trên Trang Chi Tiết (Sticky Action Bar):**
     * Trên màn hình chi tiết căn hộ (`ApartmentDetailModal`) và trang công khai gửi khách (`/p/:slug`):
     * Thanh đáy ghim cố định với hiệu ứng kính mờ (`bg-white/95 backdrop-blur-md border-t border-slate-200`):
       * Nút `[📤 Gửi Zalo / Khách]` (Primary to bản, chiếm 60% chiều rộng).
       * Nút `[📞 Gọi chủ nhà]` hoặc `[📋 Copy tin]` (Secondary/Outline, chiếm 40% còn lại).
     * Chiều cao vùng chạm tối thiểu $48px$, đệm đáy an toàn `pb-safe` tránh chạm vào thanh Home của iPhone.
