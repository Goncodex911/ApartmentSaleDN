# COVER EPIC: Các Tính Năng Phát Sinh & Stories Lẻ Bổ Sung (Supplementary Stories & Enhancements)

## 🎯 Mục Tiêu & Triết Lý Cốt Lõi
Tài liệu này là không gian tập trung để ghi nhận, phân rã và theo dõi toàn bộ các **User Story lẻ**, các yêu cầu cải tiến phát sinh nhanh, tinh chỉnh UX/UI vi mô, hoặc các tính năng bổ sung thực tế trong quá trình vận hành mà không thuộc riêng biệt một Epic lớn cố định nào từ Epic 1 đến Epic 17.

### Nguyên Tắc Bất Di Bất Dịch:
1. **Chi phí vận hành 0 VND (Ponytail Minimalism):** Mọi công cụ bổ sung đều phải sử dụng giao thức miễn phí, mã nguồn mở, không phát sinh chi phí duy trì hàng tháng.
2. **Kiến trúc Tự Phục Vụ (Self-Service Architecture):** Người dùng (Môi giới / Quản lý) có thể tự kết nối tài khoản cá nhân của mình trực tiếp trên giao diện Web mà không cần can thiệp vào mã nguồn máy chủ hay khai báo API Key phức tạp.
3. **Bao phủ toàn diện (Dual-Case Coverage):** Hỗ trợ cào tin từ cả **Nhóm Công Khai (Public Groups)** lẫn **Nhóm Kín (Private Groups)**, xử lý cả **quét lịch sử bài đăng cũ** lẫn **lắng nghe bài đăng mới thời gian thực**.
4. **Bảo toàn dữ liệu chất lượng cao:** Thu thập trọn vẹn album ảnh gốc chất lượng cao trực tiếp từ CDN Telegram đẩy lên Cloudinary, kết hợp với trí tuệ nhân tạo Google Gemini Flash để chuẩn hóa dữ liệu và bộ máy DedupService để chống trùng lặp.
5. **An toàn tuyệt đối cho tài khoản:** Tích hợp cơ chế Rate-Limiting giãn cách và tự động xử lý `FloodWaitError` để bảo vệ nick Telegram của người dùng không bị đánh cờ spam hay khóa tài khoản.

---

## 📊 Bảng Danh Mục Stories Lẻ (Cover Epic Backlog)

| Mã Story | Tên Story & Tính Năng | Phạm Vi Ảnh Hưởng | Độ Ưu Tiên | Trạng Thái | Link Task Chi Tiết |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **CE-01** | Hệ Thống Cào & Đồng Bộ Căn Hộ Theo Tài Khoản Mục Tiêu Trong Nhóm Telegram (Self-Service Userbot Scraper & Real-Time Listener) | Backend (`telegram-userbot`, `crypto`, `dedup`, `gemini`), Frontend (`TelegramScraperPage`, `adminNav`) | P0 (Ưu tiên cao) | 📝 Chuẩn bị lập trình | [STORY-CE-01-TELEGRAM-TARGET-SENDER-FILTER.md](file:///d:/CODE/AppartmentSaleProject/tasks/STORY-CE-01-TELEGRAM-TARGET-SENDER-FILTER.md) |

---

## 📌 Chi Tiết User Story CE-01: Hệ Thống Cào & Đồng Bộ Căn Hộ Theo Tài Khoản Mục Tiêu Trong Nhóm Telegram

### 1. Mô tả bài toán & Giá trị nghiệp vụ (Business Context)
* **Vấn đề thực tế:** Trong thị trường BĐS cho thuê tại Đà Nẵng, các đầu chủ lớn hoặc cộng tác viên ruột (ví dụ: tài khoản *"Trần Minh Hiếu"*) thường xuyên đăng hàng chục căn hộ mỗi ngày vào các nhóm Telegram BĐS (cả nhóm công khai và nhóm kín).
* **Bất cập trước đây:** 
  * Môi giới phải vào nhóm, bôi đen copy-paste từng dòng chữ, tải từng bức ảnh về điện thoại/máy tính rồi vào trang web tạo căn hộ thủ công. Thao tác này mất từ 5–10 phút cho mỗi căn hộ và dễ bỏ sót thông tin.
  * Bot Telegram thông thường (`@BotFather`) bị chính sách bảo mật của Telegram chặn, **hoàn toàn không thể đọc tin nhắn cũ** trong nhóm và **không thể tự vào nhóm kín**.
  * Lập trình viên không có mặt trong các nhóm kín kiểm duyệt gắt gao của môi giới, do đó hệ thống không thể dùng một tài khoản cố định của lập trình viên để quét.
* **Giải pháp đột phá (Userbot Self-Service):**
  * Tích hợp giao thức **Telegram MTProto Client** (thư viện mã nguồn mở `telegram` / GramJS).
  * Lập trình viên đăng ký App 1 lần duy nhất trên `my.telegram.org` để lấy `TELEGRAM_API_ID` và `TELEGRAM_API_HASH` (miễn phí 100%).
  * Cho phép môi giới tự kết nối số điện thoại Telegram cá nhân ngay trên giao diện Web qua mã OTP. Khi đó, hệ thống sử dụng chính quyền thành viên của môi giới (người vốn đã ở sẵn trong các nhóm kín) để cào sạch bài đăng cũ của tài khoản mục tiêu ("Trần Minh Hiếu") và tự động đón nhận bài mới thời gian thực.

---

### 2. Mô hình Kiến trúc 2 Tầng (Two-Tier Architecture)

```
+-----------------------------------------------------------------------------------+
| TẦNG 1: CẤU HÌNH HỆ THỐNG (LẬP TRÌNH VIÊN CÀI 1 LẦN DUY NHẤT - 0 VND)            |
| - Đăng ký App trên my.telegram.org -> Lấy TELEGRAM_API_ID & TELEGRAM_API_HASH    |
| - Cấu hình vào .env của máy chủ Backend (Render.com)                              |
+-----------------------------------------------------------------------------------+
                                       │
                                       ▼
+-----------------------------------------------------------------------------------+
| TẦNG 2: TỰ PHỤC VỤ TRÊN WEB (MÔI GIỚI / QUẢN LÝ TỰ THAO TÁC - ZERO KEY)          |
| - Môi giới mở Web (/admin/telegram-scraper) -> Nhập Số điện thoại cá nhân        |
| - Telegram gửi mã OTP 5 số về App Telegram -> Môi giới nhập OTP vào Web          |
| - Máy chủ sinh sessionString mã hóa AES-256 lưu trong MongoDB (user.telegramSession) |
+-----------------------------------------------------------------------------------+
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌───────────────────────────────────────┐   ┌───────────────────────────────────────┐
│ TRƯỜNG HỢP A: NHÓM CÔNG KHAI          │   │ TRƯỜNG HỢP B: NHÓM KÍN / RIÊNG TƯ     │
│ (Public: t.me/nhom_bds hoặc @nhom_bds)│   │ (Private: t.me/+... hoặc ID âm)       │
│ - Tự động gọi JoinChannelRequest gia  │   │ - Tận dụng quyền thành viên của chính  │
│   nhập nhóm trong 0.5s (không cần duyệt)│  │   môi giới đã ở sẵn trong nhóm kín    │
│ - Hoặc dán link nhóm để quét tức thì  │   │ - Hoặc dùng link mời ImportChatInvite │
└───────────────────────────────────────┘   └───────────────────────────────────────┘
                                       │
                                       ▼
+-----------------------------------------------------------------------------------+
| BỘ LỌC TÀI KHOẢN MỤC TIÊU & THU THẬP BÀI ĐĂNG (TARGET SENDER SCRAPER)             |
| - Tìm kiếm theo Tên hiển thị ("Trần Minh Hiếu"), Username (@...) hoặc ID           |
| - Gom bài viết kèm toàn bộ Album ảnh gốc từ Telegram CDN                          |
| - Tự động đẩy ảnh lên Cloudinary -> Bóc tách AI Gemini -> Khử trùng DedupService   |
| - Bật Daemon lắng nghe sự kiện tin mới thời gian thực (Real-Time Listener)        |
+-----------------------------------------------------------------------------------+
```

---

### 3. Tiêu chí Chấp nhận Chi tiết (Acceptance Criteria - Gherkin Standard)

#### AC1: Xác thực Phiên Telegram Tự Phục Vụ (Self-Service Auth Flow)
* **Given** Quản lý hoặc Môi giới truy cập trang `/admin/telegram-scraper` trên Web
* **When** người dùng bấm nút `[🔗 Kết nối tài khoản Telegram cá nhân]` và nhập số điện thoại (ví dụ: `+84905123456`)
* **Then** backend gọi GramJS `sendCode(phone)`, máy chủ Telegram gửi mã xác nhận 5 chữ số trực tiếp vào ứng dụng Telegram của người dùng.
* **When** người dùng nhập mã OTP 5 chữ số (kèm mật khẩu xác thực 2 bước 2FA nếu tài khoản có cài đặt)
* **Then** backend xác thực thành công và sinh ra chuỗi phiên `sessionString`:
  * Mã hóa chuỗi `sessionString` bằng thuật toán **AES-256-GCM** với khóa bí mật từ `JWT_SECRET`.
  * Lưu vào MongoDB (gắn vào tài khoản người dùng hoặc bảng cấu hình).
  * Giao diện cập nhật trạng thái kết nối: `✅ Đang kết nối: Trần Minh Hiếu (+84 905***456)`.
* **And** hệ thống cung cấp nút `[❌ Hủy kết nối / Đăng xuất Telegram]` cho phép thu hồi phiên làm việc bất cứ lúc nào để đảm bảo quyền riêng tư.

#### AC2: Tự Động Nạp Danh Sách Nhóm & Bộ Chọn Nhóm (Dialogs Picker)
* **Given** tài khoản Telegram của người dùng đã kết nối thành công
* **When** người dùng mở màn hình thiết lập quét tin
* **Then** hệ thống tự động gọi hàm `getDialogs` để lấy danh sách tất cả các Nhóm chat, Kênh hoặc Siêu nhóm (Supergroup) mà tài khoản đó đang tham gia.
* **And** hỗ trợ ô tìm kiếm nhanh theo tên nhóm để người dùng chọn trong 1 cú click.
* **And** hỗ trợ ô nhập trực tiếp đường link nhóm (link công khai `https://t.me/ten_nhom` hoặc link mời nhóm kín `https://t.me/+AbCdEf...`).

#### AC3: Tự Động Gia Nhập Nhóm Công Khai (Public Group Auto-Join)
* **Given** người dùng dán một link nhóm công khai (`t.me/nhombdsdanang` hoặc `@nhombdsdanang`)
* **When** tài khoản của người dùng chưa có mặt trong nhóm đó
* **Then** hệ thống tự động gọi API `JoinChannelRequest` để tham gia nhóm ngay lập tức trong 0.5 giây (không cần admin duyệt) và tiếp tục quy trình cào tin mà không gây gián đoạn.

#### AC4: Lọc Chính Xác Theo Tài Khoản Mục Tiêu (Target Poster Resolution)
* **Given** người dùng chọn nhóm và nhập tiêu chí lọc người đăng:
  * Tên hiển thị (ví dụ: `Trần Minh Hiếu` — hỗ trợ tìm kiếm không phân biệt hoa thường và không dấu).
  * HOẶC Username Telegram (ví dụ: `@minhhieu_bds`).
  * HOẶC Telegram User ID.
* **When** tiến trình quét tin duyệt qua lịch sử nhóm
* **Then** hệ thống chỉ giữ lại các tin nhắn thỏa mãn:
  * Tin do chính tài khoản mục tiêu đăng (`message.sender_id` khớp với target).
  * HOẶC tin do tài khoản mục tiêu chuyển tiếp từ kênh riêng của họ (`message.fwd_from` khớp với target).
* **And** toàn bộ bài đăng của các thành viên khác trong nhóm bị loại bỏ ngay lập tức trong $< 0.1\text{ms}$ (không tiêu tốn hạn mức AI hay lưu trữ ảnh).

#### AC5: Tải Trọn Bộ Album Ảnh Gốc Đẩy Lên Cloudinary (High-Res Album CDN Pipeline)
* **Given** bài đăng của tài khoản mục tiêu chứa ảnh hoặc một cụm album ảnh (`grouped_id`)
* **When** hệ thống tải bài đăng
* **Then** hệ thống tải toàn bộ các file ảnh gốc với độ phân giải cao nhất trực tiếp từ máy chủ CDN của Telegram vào bộ nhớ RAM stream.
* **And** tự động upload toàn bộ ảnh lên Cloudinary thư mục `apartment_sale/telegram` với tên file chuẩn hóa.
* **And** bảo toàn trọn vẹn văn bản mô tả (caption) của bài viết đi kèm album.

#### AC6: Bóc Tách Trí Tuệ Nhân Tạo & Khử Trùng Lặp Tự Động (AI Parse & Dedup Engine)
* **Given** văn bản bài đăng và mảng đường dẫn ảnh Cloudinary thu được
* **When** bài đăng được đưa vào quy trình nạp dữ liệu:
  1. Gọi `GeminiService.parseApartmentListing` để trích xuất có cấu trúc: Tiêu đề, Giá thuê (VND hoặc USD), Loại phòng (Studio, 1PN, 2PN, 3PN), Diện tích, Địa chỉ, Khu vực/Quận, Tiện ích, SĐT liên hệ.
  2. Đưa qua `DedupService.matchAndMerge`:
     * Nếu trùng với căn hộ đã có trong kho $\rightarrow$ Tự động gộp thành nguồn phụ trong danh sách `subListings`.
     * Nếu là căn hộ mới $\rightarrow$ Tạo mới bản ghi trong collection `apartments`.
  3. Gắn nhãn nguồn tự động: `sourceName = "[Tên nhóm Telegram] - [Tên người đăng]"` (ví dụ: `BĐS Đà Nẵng Mới Nhất - Trần Minh Hiếu`), `sourceType = "telegram_userbot"`.

#### AC7: Lắng Nghe Tin Mới Thời Gian Thực (Real-Time Continuous Daemon)
* **Given** người dùng cấu hình một nhóm và tài khoản mục tiêu cần theo dõi
* **When** người dùng bật công tắc `[⚡ Lắng nghe tin mới thời gian thực]`
* **Then** hệ thống khởi chạy một tiến trình chạy ngầm (Background Event Listener qua GramJS `NewMessageEvent`):
  * Bất cứ khi nào tài khoản mục tiêu đăng bài viết mới vào nhóm, hệ thống phát hiện trong vòng **3 giây**.
  * Tự động tải ảnh, gọi AI bóc tách và nạp thẳng vào Bảng hàng.
  * Thông báo thời gian thực lên giao diện Web qua Server-Sent Events (SSE).
* **And** hệ thống cung cấp nút dừng lắng nghe bất kỳ lúc nào.

#### AC8: Chống Giới Hạn Tần Suất & Bảo Vệ Tài Khoản Tuyệt Đối (Anti-Flood Rate Limiting)
* **Given** hệ thống đang cào nhiều bài đăng cũ trong quá khứ
* **When** thực hiện các thao tác đọc tin nhắn và tải media
* **Then** hệ thống tự động chèn khoảng chờ an toàn từ **1.5 đến 2.0 giây** giữa mỗi bài đăng.
* **And** nếu nhận được mã lỗi `FloodWaitError(seconds)` từ Telegram $\rightarrow$ Hệ thống tự động pause đúng số giây yêu cầu rồi tự động khôi phục, tuyệt đối không gửi dồn dập khiến tài khoản bị Telegram giới hạn tính năng.

#### AC9: Trải Nghiệm Giao Diện Người Dùng Thân Thiện (`TelegramScraperPage.tsx`)
* **Given** người dùng truy cập trang công cụ cào tin
* **Then** giao diện trực quan hiển thị theo 3 bước:
  * **Bước 1 — Kết nối tài khoản:** Hiển thị form đăng nhập SĐT + OTP hoặc thẻ thông tin tài khoản đang kết nối.
  * **Bước 2 — Thiết lập quét:** Bộ chọn nhóm (tự gợi ý các nhóm đã tham gia hoặc ô dán link) + Ô nhập tên người đăng + Lựa chọn số lượng bài cần lấy (10, 20, 50, 100 bài) + Công tắc lắng nghe thời gian thực.
  * **Bước 3 — Bảng tiến trình & Kết quả:**
    * Thanh tiến trình chạy trực tiếp (Live Progress Bar) kèm nhật ký dòng thời gian:
      > `[1/20] Đã tìm thấy bài đăng lúc 14:30 20/11/2026 của Trần Minh Hiếu...`  
      > `[1/20] Đang tải 6 ảnh lên Cloudinary & bóc tách AI...`  
      > `[1/20] ✅ Đã nạp thành công: Căn hộ 2PN view biển Mỹ Khê - 12 triệu/tháng`  
    * Bảng danh sách các căn hộ vừa nạp thành công kèm ảnh thu nhỏ, giá, địa chỉ và nút `[Xem chi tiết]` mở trực tiếp modal căn hộ.

---

### 4. Thiết Kế Kỹ Thuật (Technical Architecture & Specifications)

#### 4.1. Thư viện Kỹ thuật (Dependencies)
* `telegram` (phiên bản `^2.22.x` — GramJS: Thư viện thuần TypeScript/JavaScript hỗ trợ MTProto client trên Node.js, không cần binary phụ thuộc C++).
* `crypto` (Thư viện chuẩn của Node.js: Dùng thuật toán `aes-256-gcm` để mã hóa chuỗi session lưu trong DB).

#### 4.2. Mô hình Dữ liệu (Database Models)
* **Bổ sung trường vào `User` model (hoặc collection `telegram_sessions`):**
  ```typescript
  telegramSession?: {
    encryptedString: string;     // Chuỗi sessionString mã hóa AES-256
    iv: string;                  // Initialization Vector
    authTag: string;             // Authentication Tag
    phone: string;               // Số điện thoại Telegram
    telegramUserId: string;      // ID người dùng Telegram
    firstName: string;           // Tên hiển thị Telegram
    lastName?: string;
    username?: string;           // @username nếu có
    connectedAt: Date;
    isActive: boolean;
  }
  ```

#### 4.3. Cấu Trúc File & Mã Nguồn
```
backend/src/
├── modules/
│   ├── ingestion/
│   │   ├── telegram-userbot.service.ts    # Khởi tạo MTProto client, xử lý OTP, cào bài, tải ảnh CDN, lắng nghe event
│   │   ├── telegram-userbot.controller.ts # Tiếp nhận request từ frontend (send-code, verify, get-dialogs, scrape)
│   │   └── telegram-userbot.routes.ts     # Định tuyến API
│   └── dedup/
│       └── dedup.service.ts               # Khử trùng lặp căn hộ (tái sử dụng từ Epic 3)
frontend/src/
├── pages/
│   └── admin/
│       └── TelegramScraperPage.tsx        # Giao diện chính: Kết nối OTP + Chọn nhóm + Quét bài + Tiến trình trực tiếp
├── api/
│   └── telegramUserbotApi.ts              # Gọi API backend kết nối và cào tin
└── components/
    └── admin/
        └── adminNav.ts                    # Bổ sung menu "Cào tin Telegram"
```

#### 4.4. Danh Mục API Endpoints
* `POST /api/v1/ingestion/telegram-userbot/auth/send-code`: Nhận `phone` $\rightarrow$ Gửi mã OTP về Telegram của người dùng.
* `POST /api/v1/ingestion/telegram-userbot/auth/verify`: Nhận `phone`, `phoneCodeHash`, `code`, `password` (tùy chọn) $\rightarrow$ Xác thực và lưu phiên.
* `POST /api/v1/ingestion/telegram-userbot/auth/disconnect`: Hủy phiên và xóa dữ liệu phiên đăng nhập.
* `GET  /api/v1/ingestion/telegram-userbot/status`: Kiểm tra trạng thái phiên kết nối hiện tại.
* `GET  /api/v1/ingestion/telegram-userbot/dialogs`: Lấy danh sách các nhóm chat / kênh tài khoản đã tham gia.
* `POST /api/v1/ingestion/telegram-userbot/scrape`: Bắt đầu tiến trình cào bài đăng lịch sử theo nhóm + người đăng.
* `POST /api/v1/ingestion/telegram-userbot/listener/start`: Bật lắng nghe tin mới thời gian thực.
* `POST /api/v1/ingestion/telegram-userbot/listener/stop`: Dừng lắng nghe tin mới thời gian thực.

---

### 5. Tiêu Chuẩn Hoàn Thành & Kịch Bản Kiểm Thử (Definition of Done & QA Checklist)

* [ ] **Cấu hình & Môi trường:** Đã khai báo đầy đủ `TELEGRAM_API_ID` và `TELEGRAM_API_HASH` trong file `.env`.
* [ ] **Xác thực OTP:** Người dùng nhập SĐT $\rightarrow$ Nhận mã OTP trong Telegram $\rightarrow$ Nhập vào Web xác thực thành công.
* [ ] **Kiểm tra Nhóm Công Khai:** Nhập link nhóm công khai mà tài khoản chưa tham gia $\rightarrow$ Userbot tự động join và cào bài thành công.
* [ ] **Kiểm tra Nhóm Kín:** Quét thành công bài đăng trong nhóm kín mà tài khoản người dùng đã ở sẵn bên trong.
* [ ] **Lọc Đúng Người Đăng:** Nhập tên *"Trần Minh Hiếu"* $\rightarrow$ Chỉ có đúng các bài của người này được nạp vào, không sót và không lẫn bài của người khác.
* [ ] **Độ Trọn Vẹn của Album Ảnh:** Căn hộ nạp vào có đầy đủ 5–10 ảnh nét gốc từ Telegram CDN lưu trên Cloudinary.
* [ ] **Chuẩn Hóa AI & Khử Trùng:** Dữ liệu căn hộ có đầy đủ Giá, Vị trí, Số phòng, và được gắn nhãn nguồn rõ ràng; các bài đăng trùng lặp được gộp chuẩn vào `subListings`.
* [ ] **Lắng Nghe Thời Gian Thực:** Khi tài khoản mục tiêu đăng bài mới $\rightarrow$ Hệ thống tự động nạp vào Bảng hàng trong 3 giây.
* [ ] **Bảo Mật & An Toàn:** Chuỗi session được mã hóa AES-256; có cơ chế rate-limiting 1.5s–2.0s chống khóa nick.
* [ ] **Kiểm tra Biên Dịch (Build Check):** Cả Backend và Frontend biên dịch sạch 100% không có lỗi TypeScript hay Vite build.
