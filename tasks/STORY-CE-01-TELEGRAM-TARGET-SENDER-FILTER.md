# TASK: STORY CE-01 — Hệ Thống Cào & Đồng Bộ Căn Hộ Theo Tài Khoản Mục Tiêu Trong Nhóm Telegram (Self-Service Userbot Scraper & Real-Time Listener)

**Tài liệu tham chiếu chuẩn:** [coverEpic.md](file:///d:/CODE/AppartmentSaleProject/docs/stories/coverEpic.md) (User Story CE-01)  
**Hướng dẫn cấu hình API:** [EXTERNAL_CONFIG.md mục 11](file:///d:/CODE/AppartmentSaleProject/EXTERNAL_CONFIG.md#11-cover-epic-cau-hinh-telegram-mtproto-client-userbot-scraper-tu-dong--lang-nghe-thoi-gian-thuc)  
**Nhánh làm việc (Git Branch):** `cover-epic`  
**Triết lý cốt lõi:** Ponytail Minimalism (0 VND chi phí phát sinh, không mua API đắt tiền), Self-Service (Người dùng tự kết nối số cá nhân trên Web, không lộ API key), An toàn tài khoản tuyệt đối (Rate-limiting & Anti-flood).

---

## 1. Mục Tiêu & Phạm Vi Công Việc

Xây dựng module cào tin và lắng nghe thời gian thực thông minh từ Telegram:
1. **Tầng 1 (Hệ Thống):** Tích hợp thư viện `telegram` (GramJS) với `TELEGRAM_API_ID` và `TELEGRAM_API_HASH` đăng ký miễn phí từ `my.telegram.org`.
2. **Tầng 2 (Tự Phục Vụ):** Cung cấp giao diện Web cho Quản lý / Môi giới tự kết nối số điện thoại Telegram cá nhân qua mã OTP để tận dụng quyền thành viên của họ trong các nhóm BĐS kín.
3. **Cào Tin Theo Người Đăng Mục Tiêu:** Quét lịch sử nhóm (công khai lẫn nhóm kín), lọc chính xác bài đăng của một người chỉ định (ví dụ: *"Trần Minh Hiếu"*).
4. **Bảo Toàn Album Ảnh Gốc & AI Ingestion:** Tải trọn bộ album ảnh gốc trực tiếp từ Telegram CDN đẩy lên Cloudinary, dùng Gemini Flash trích xuất thông tin căn hộ và khử trùng lặp qua `DedupService`.
5. **Đón Tin Mới Thời Gian Thực:** Khởi chạy Daemon chạy ngầm lắng nghe bài đăng mới của người đó và nạp tiếp vào kho hàng trong 3 giây.

---

## 2. Tiền Điều Kiện Kỹ Thuật (Pre-conditions)
* Cài đặt thư viện Node.js: `telegram` (GramJS).
* Biến môi trường trong `.env`: `TELEGRAM_API_ID` và `TELEGRAM_API_HASH`.
* Tái sử dụng các biến có sẵn: `CLOUDINARY_*`, `GEMINI_API_KEY`, `JWT_SECRET`.

---

## 3. Danh Sách Nhiệm Vụ Chi Tiết (Implementation Checklist)

### 3.1. Backend Architecture & Services
- [x] **Cài đặt thư viện:** Chạy `npm install telegram` tại `backend/`.
- [x] **Mã hóa chuỗi Session (`backend/src/utils/crypto.util.ts`):**
  - Viết hàm mã hóa và giải mã chuỗi `sessionString` bằng thuật toán `aes-256-gcm` với khóa dẫn xuất từ `JWT_SECRET`.
- [x] **Mở rộng Schema lưu trữ Session (`backend/src/modules/user/user.model.ts` hoặc `system-config.model.ts`):**
  - Lưu thông tin `telegramSession: { encryptedString, iv, authTag, phone, telegramUserId, firstName, lastName, username, connectedAt, isActive }`.
- [x] **Xây dựng `telegram-userbot.service.ts`:**
  - `initClient(sessionString?)`: Khởi tạo instance `TelegramClient` với `StringSession`.
  - `sendAuthCode(phone)`: Gửi mã OTP xác nhận về ứng dụng Telegram.
  - `verifyAuthCode({ phone, phoneCodeHash, code, password? })`: Xác thực mã OTP và lưu chuỗi `sessionString`.
  - `disconnectSession(userId)`: Xóa phiên và thu hồi kết nối.
  - `getJoinedDialogs(userId)`: Trả về danh sách tất cả các nhóm/kênh mà tài khoản đang tham gia.
  - `resolveAndJoinGroup(chatInput)`: Tự động phát hiện và gọi `JoinChannelRequest` nếu là nhóm công khai mà user chưa tham gia.
  - `scrapeTargetSenderPosts({ chatId, targetSender, limit })`:
    - Tìm kiếm tin nhắn của target sender trong nhóm (`messages.search`).
    - Lọc đúng người đăng theo tên hiển thị, username hoặc user ID.
    - Gom nhóm các tin thuộc cùng album (`grouped_id`).
    - Chèn khoảng delay 1.5s - 2.0s giữa các bài để đảm bảo an toàn (Anti-Flood).
    - Tải ảnh gốc trực tiếp từ Telegram CDN và tải lên Cloudinary thư mục `apartment_sale/telegram`.
    - Gọi `GeminiService.parseApartmentListing` để trích xuất dữ liệu có cấu trúc.
    - Gọi `DedupService.matchAndMerge` để nạp vào Bảng hàng hoặc gộp vào `subListings`.
  - `startRealtimeListener({ chatId, targetSender })`: Lắng nghe sự kiện `NewMessage` thời gian thực và tự động nạp tin mới.
  - `stopRealtimeListener(chatId)`: Hủy đăng ký lắng nghe.
- [x] **Xây dựng `telegram-userbot.controller.ts` & `telegram-userbot.routes.ts`:**
  - Định nghĩa đầy đủ các routes: `POST /auth/send-code`, `POST /auth/verify`, `POST /auth/disconnect`, `GET /status`, `GET /dialogs`, `POST /scrape`, `POST /listener/start`, `POST /listener/stop`.
  - Kết nối route vào `backend/src/app.ts` dưới tiền tố `/api/v1/ingestion/telegram-userbot`.

### 3.2. Frontend Scraper Dashboard
- [x] **Xây dựng API Client (`frontend/src/api/telegramUserbotApi.ts`):**
  - Các hàm gọi endpoint backend tương ứng kèm xử lý token xác thực JWT.
- [x] **Tạo Trang Quản Lý Cào Tin (`frontend/src/pages/admin/TelegramScraperPage.tsx`):**
  - **Thẻ 1 — Kết nối Telegram Cá Nhân:**
    - Trạng thái chưa kết nối: Form nhập SĐT $\rightarrow$ Bấm gửi OTP $\rightarrow$ Form nhập mã OTP 5 số (+ ô mật khẩu 2FA nếu có).
    - Trạng thái đã kết nối: Huy hiệu xanh ✅ hiển thị Tên tài khoản, SĐT và nút `[Hủy kết nối / Đăng xuất]`.
  - **Thẻ 2 — Thiết lập Cào Tin:**
    - Danh sách thả xuống (Select/Combobox) gợi ý các nhóm Telegram tài khoản đã tham gia.
    - Ô dán link nhóm trực tiếp (`https://t.me/...` hoặc `@...`).
    - Ô nhập định danh người đăng mục tiêu: *"Trần Minh Hiếu"* hoặc `@username`.
    - Ô chọn số lượng bài cần cào: 10, 20, 50, 100 bài.
    - Công tắc bật/tắt: *"Lắng nghe tin mới thời gian thực"*.
    - Nút bấm lớn: `[🚀 Bắt đầu quét & Nạp căn hộ]`.
  - **Thẻ 3 — Tiến trình & Kết quả thời gian thực:**
    - Thanh Progress Bar hiển thị % tiến độ (`12/30 căn`).
    - Console Log thời gian thực hiển thị từng bước xử lý.
    - Bảng kết quả xem trước các căn hộ vừa nạp thành công (Ảnh thu nhỏ, Tiêu đề, Giá thuê, Địa chỉ, Nút `[Xem chi tiết]` mở modal xem phòng).
- [x] **Bổ sung điều hướng:**
  - Thêm mục *"Cào tin Telegram"* trong menu Quản trị (`adminNav.ts`).
  - Thêm Route `/admin/telegram-scraper` trong `App.tsx`.

---

## 4. Kịch Bản Kiểm Thử & Nghiệm Thu (Acceptance Tests)

1. [x] **Test 1 — Kết nối SĐT & OTP:**
   - Người dùng nhập SĐT `+84...` $\rightarrow$ Nhận được mã 5 số trong app Telegram $\rightarrow$ Nhập vào Web xác nhận $\rightarrow$ Hệ thống lưu phiên thành công.
2. [x] **Test 2 — Quét Nhóm Công Khai:**
   - Dán link nhóm công khai BĐS Đà Nẵng $\rightarrow$ Userbot tự động tham gia nhóm và bắt đầu quét lịch sử.
3. [x] **Test 3 — Quét Nhóm Kín:**
   - Sử dụng tài khoản người dùng đã ở sẵn trong nhóm kín $\rightarrow$ Quét thành công bài đăng cũ trong nhóm mà không cần duyệt lại.
4. [x] **Test 4 — Lọc Đúng Người Đăng:**
   - Đặt bộ lọc tên *"Trần Minh Hiếu"* $\rightarrow$ Toàn bộ bài đăng của các thành viên khác trong nhóm bị bỏ qua tức thì, chỉ bài của Trần Minh Hiếu được nạp.
5. [x] **Test 5 — Đầy Đủ Album Ảnh Gốc:**
   - Kiểm tra căn hộ nạp vào: Album 5–8 ảnh nét căng từ Telegram CDN được lưu trữ đầy đủ trên Cloudinary.
6. [x] **Test 6 — Trích Xuất AI & Khử Trùng Lặp:**
   - Dữ liệu căn hộ có Giá, Địa chỉ, Số phòng chuẩn xác; căn trùng được gộp vào `subListings` với nhãn nguồn `[Tên nhóm] - [Trần Minh Hiếu]`.
7. [x] **Test 7 — Lắng Nghe Thời Gian Thực:**
   - Tài khoản mục tiêu đăng bài mới vào nhóm $\rightarrow$ Hệ thống tự động bắt và nạp vào kho trong 3 giây.
8. [x] **Test 8 — Biên Dịch & Build:**
   - `tsc --noEmit` và `npm run build` ở cả frontend và backend thành công 0 lỗi.
