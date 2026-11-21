# STORY 17.1: Bộ Phân Phối Bài Đăng 1-Chạm Lên Zalo & WhatsApp (One-Click Multi-Channel Smart Share & Deep-Link Dispatcher)

**Bối cảnh:** `docs/stories/EPIC_17_MULTI_CHANNEL_AUTO_POSTING_AND_PRECISION_MAPS.md` (Story 17.1).  
Cộng tác viên (CTV) và Quản lý thường xuyên phải chia sẻ căn hộ lên mạng xã hội, trong đó **Zalo** là kênh chốt khách số 1 của người Việt và **WhatsApp** là kênh số 1 cho người nước ngoài (expat/digital nomad) tại Đà Nẵng. Việc copy-paste thủ công bài viết và từng tấm ảnh mất quá nhiều thời gian (3–5 phút/bài), trong khi việc dùng bot spam tài khoản cá nhân có nguy cơ cao bị Zalo khóa vĩnh viễn. Story này triển khai giải pháp **1-Chạm Bán Tự Động Siêu Tốc (Cấp độ 1)**: an toàn 100%, chi phí 0đ, hoàn thành việc soạn bài, tải ảnh và kích hoạt mở app chỉ trong 3 giây.

---

## 1. Mô tả Story (User Story)
* **Là một:** Cộng tác viên (CTV) hoặc Quản lý đang tìm thấy một căn hộ đẹp muốn gửi ngay lên Zalo hoặc WhatsApp.
* **Tôi muốn:** Bấm một nút duy nhất để hệ thống tự chuẩn bị nội dung bài viết, tự tải ảnh phòng đẹp nhất và tự kích hoạt mở ứng dụng Zalo/WhatsApp tương ứng.
* **Để:** Tôi có thể đăng bài hoặc gửi vào các nhóm chat môi giới trong 3 giây mà không phải thao tác copy-paste thủ công rườm rà, đồng thời không lo ngại rủi ro tài khoản cá nhân bị quét khóa do dùng tool bot lậu.

---

## 2. Tiền điều kiện (Pre-conditions)
* Căn hộ ở trạng thái khả dụng (`AVAILABLE` hoặc `UPDATING`). Không hỗ trợ căn `RENTED`.
* Người dùng đã đăng nhập (để lấy thông tin định danh CTV: Tên, SĐT, mã CTV, Zalo Phone, link Landing Page `/p/:slug?ctv=...`).
* Thiết bị có kết nối mạng để tải ảnh Cloudinary (độ phân giải 1600px tối ưu theo Story 10.3).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Menu Chia Sẻ Đa Kênh Nhanh Trên ApartmentCard & DetailModal
* **Given** CTV đang xem danh sách căn hộ trên [ApartmentCard.tsx](file:///d:/CODE/AppartmentSaleProject/frontend/src/components/apartment/ApartmentCard.tsx) hoặc đang mở [ApartmentDetailModal.tsx](file:///d:/CODE/AppartmentSaleProject/frontend/src/components/apartment/ApartmentDetailModal.tsx)
* **When** CTV nhấn vào nút chia sẻ nhanh hoặc menu dropdown đa kênh
* **Then** hệ thống hiển thị rõ ràng 2 tùy chọn kênh chuyên biệt với nhận diện thương hiệu chuẩn:
  - `[💬 Đăng Zalo]` (Nút màu xanh Zalo `#0068ff`, icon Zalo).
  - `[📱 Đăng WhatsApp]` (Nút màu xanh lá WhatsApp `#25d366`, icon WhatsApp).
* **And** trên mobile (màn hình hẹp), các nút có touch target tối thiểu 44px $\times$ 44px, hiển thị gọn gàng, không che khuất các thông tin giá và vị trí.

### AC2 — Luồng 1-Chạm Đăng Tin Zalo (Zalo 1-Tap Workflow)
* **Given** CTV bấm nút `[💬 Đăng Zalo]`
* **When** hành động được kích hoạt
* **Then** hệ thống thực hiện đồng thời quy trình 4 bước ngầm:
  1. **Tạo nội dung bài viết Zalo:** Gọi bộ sinh văn bản tiếng Việt tối ưu cho Zalo (Tiêu đề bắt mắt, Giá nổi bật, Khu vực, Tiện ích chính, Link xem phòng riêng `/p/:slug?ctv=MÃ_CTV`).
  2. **Ghi vào Clipboard:** Tự động sao chép toàn bộ văn bản trên vào bộ nhớ tạm (Clipboard) của điện thoại hoặc máy tính.
  3. **Chuẩn bị ảnh:** Tự động chọn 4 ảnh đẹp nhất của căn (bỏ video và ảnh trong `hiddenImages`), tải về máy hoặc chuẩn bị sẵn trong bộ nhớ chia sẻ.
  4. **Kích hoạt Deep-link Zalo:**
     - Trên thiết bị di động (iOS/Android): Kích hoạt mở ứng dụng Zalo qua URL scheme `zalo://` (hoặc fallback mở `https://zalo.me/share`).
     - Trên máy tính: Mở tab mới dẫn tới `https://chat.zalo.me/` hoặc sao chép sẵn sàng để người dùng dán vào Zalo PC.
* **And** hiển thị thông báo Toast nổi: *"Đã sao chép bài viết & tải ảnh! Mở Zalo dán bài để đăng."*.

### AC3 — Luồng 1-Chạm Chia Sẻ WhatsApp (WhatsApp 1-Tap Workflow)
* **Given** CTV bấm nút `[📱 Đăng WhatsApp]`
* **When** hành động được kích hoạt
* **Then** hệ thống thực hiện quy trình:
  1. Tự động chuyển đổi thông tin căn hộ sang nội dung tiếng Anh chuẩn Expat (Story 17.3), định dạng theo cú pháp Markdown của WhatsApp: in đậm `*bold*`, in nghiêng `_italic_`, gạch đầu dòng bullet points.
  2. Mã hóa URL (encodeURIComponent) toàn bộ văn bản.
  3. Mở deep-link WhatsApp: `https://wa.me/?text={encoded_content}`.
* **And** ứng dụng WhatsApp trên điện thoại hoặc WhatsApp Web trên máy tính lập tức mở ra màn hình chọn danh bạ/nhóm chat để CTV gửi ngay lập tức mà không cần copy thêm thao tác nào.

### AC4 — Xử Lý Ngoại Lệ & Quyền Trình Duyệt An Toàn
* **Given** trình duyệt chưa cấp quyền ghi Clipboard hoặc bị chặn pop-up
* **When** CTV bấm chia sẻ
* **Then** hệ thống không bao giờ crash, hiển thị modal dự phòng hiển thị sẵn nội dung văn bản để CTV bấm nút "Sao chép thủ công".

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Frontend:
* **`frontend/src/utils/shareChannel.ts` (Tạo mới):**
  - Xây dựng tiện ích điều hướng kênh:
    - `dispatchZaloShare({ apartment, user, photos })`: Quản lý việc ghi Clipboard + download 4 ảnh + kích hoạt deep-link `zalo://` / `https://zalo.me/share`.
    - `dispatchWhatsAppShare({ apartment, user, lang })`: Xây dựng URL `https://wa.me/?text=...` với nội dung tiếng Anh chuẩn Markdown.
* **`frontend/src/components/apartment/MultiChannelSharePopover.tsx` (Tạo mới):**
  - Popover/Menu chọn kênh chia sẻ nhanh (Zalo, WhatsApp, Mẫu 10 dòng mặc định).
* **`frontend/src/components/apartment/ApartmentCard.tsx`:**
  - Tích hợp nút kích hoạt `MultiChannelSharePopover` cạnh `CopyShareButton`.
* **`frontend/src/components/apartment/ApartmentDetailModal.tsx`:**
  - Bổ sung nhóm nút hành động chia sẻ nhanh Zalo & WhatsApp trên thanh công cụ cố định đáy màn hình (Bottom Action Bar).
* **`frontend/src/utils/device.ts`:**
  - Kiểm tra môi trường iOS / Android / Desktop để kích hoạt đúng URL scheme (`zalo://` vs `https://chat.zalo.me`).

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Kiểm tra trên Mobile Chrome & Safari: Bấm `[💬 Đăng Zalo]` sao chép được bài viết vào Clipboard và mở đúng ứng dụng Zalo.
* [ ] Kiểm tra ảnh: Tải 4 ảnh chất lượng cao 1600px từ Cloudinary thành công, không bị lỗi CORS.
* [ ] Kiểm tra WhatsApp: Bấm `[📱 Đăng WhatsApp]` mở thẳng WhatsApp với nội dung tiếng Anh chuẩn format `*bold*` và link dẫn về phòng.
* [ ] Build test: `npm run build` ở thư mục frontend không phát sinh bất kỳ lỗi TypeScript nào.
