# EPIC-18: Liên Kết Tài Khoản Telegram Ổn Định Cho Cào Tin (Reliable Telegram Account Linking)

## Mục tiêu
Admin và Quản lý **kết nối được tài khoản Telegram cá nhân vào hệ thống ngay lần đầu**, trên cả điện thoại lẫn máy tính, và **giữ được kết nối** để Cào tin Telegram (CE-01, CE-02) chạy ổn định. Khi Telegram không cho đăng nhập (chính sách chống lừa đảo, tài khoản bị hạn chế), vẫn có **đường dự phòng không cần đăng nhập** để đưa tin vào Bảng hàng.

**Tiêu chí thành công của cả Epic:**
* 3 thiết bị thật (iPhone Safari, Android Chrome, máy tính Chrome) đều kết nối thành công ≥ 1 lần mà không cần hỗ trợ kỹ thuật.
* Mọi lần thất bại đều có **thông báo tiếng Việt nói rõ nguyên nhân + việc cần làm** (không còn "Có lỗi xảy ra").
* Render khởi động lại / deploy giữa lúc đang đăng nhập không làm mất lượt đăng nhập.
* Trang không bao giờ hiện "Đã kết nối" khi phiên thực tế đã chết.

---

## Hiện trạng (kiểm tra ngày 26/11/2026)

| Cách kết nối | Kết quả thực tế | Nguyên nhân đã xác định |
|---|---|---|
| **Mã OTP** | Trang báo "Telegram vừa gửi mã vào **ứng dụng Telegram**" nhưng chat *Telegram (service notifications)* **không có mã mới** | (1) Tài khoản đã bật **Login Email**: Telegram gửi mã qua **email** (`auth.sentCodeTypeEmailCode`), không qua app. Thư viện gramjs `client.sendCode()` chỉ trả `isCodeViaApp`, **làm mất loại kênh gửi** → giao diện luôn ghi "ứng dụng Telegram". (2) Có thể gặp `sentCodeTypeSetUpEmailRequired` (Telegram bắt buộc thiết lập email trước) → hiện chưa xử lý. |
| **Xác nhận 1-chạm** (`tg://login?token=`) | Không liên kết được | (1) **Nhiều khả năng Telegram chặn mở link đăng nhập trực tiếp** để chống lừa đảo — link `tg://login` chỉ được chấp nhận khi **quét QR bằng camera trong Telegram** (Cài đặt → Thiết bị → Liên kết thiết bị máy tính) → *cần xác minh ở Story 18.0*. (2) Token đăng nhập **hết hạn sau ~30 giây** nhưng giao diện giữ link cũ, không làm mới. (3) Mã QR đã bị gỡ (trước đây tạo qua `api.qrserver.com` → lộ token), nên máy tính hiện **không có QR để quét**. |
| **Phiên chờ đăng nhập** | Mất khi Render khởi động lại | `pendingAuths` / `pendingQrAuths` chỉ lưu **trong bộ nhớ**. Render free tự ngủ sau ~15 phút và khởi động lại mỗi lần deploy → mã OTP vừa nhận thành vô hiệu, người dùng nhập đúng mã vẫn lỗi. |
| **Phiên đã kết nối** | Từng bị `SESSION_REVOKED` | Đã sửa một phần (PR #32: tự nhận phiên chết, đóng kết nối khi tắt máy chủ). Chưa có kiểm tra định kỳ; Telegram còn có thể thu hồi phiên mới đăng nhập từ IP máy chủ lạ (Render ở nước ngoài). |
| **Thông báo lỗi** | Lỗi Telegram hiện nguyên văn tiếng Anh hoặc "Có lỗi xảy ra" | Chưa ánh xạ các lỗi RPC (`PHONE_CODE_INVALID`, `PHONE_CODE_EXPIRED`, `FLOOD_WAIT_X`, `PHONE_NUMBER_BANNED`, `PASSWORD_HASH_INVALID`, `AUTH_RESTART`…). |

**Tài nguyên sẵn có để tận dụng:**
* gramjs 2.26.22 có đủ API: `auth.SendCode` (trả `type`, `nextType`, `timeout`), `auth.ResendCode`, `auth.CancelCode`, `auth.ExportLoginToken` / `ImportLoginToken`, sự kiện `UpdateLoginToken`.
* Phiên Telegram đã được **mã hóa AES-GCM** khi lưu DB (`encryptSession` / `decryptSession`).
* Bot hệ thống (`telegram.service.ts`) **đã có liên kết tài khoản app ↔ Telegram** qua `/start <mã>` (trường `telegramChatId`, Story 16.9) → dùng lại cho đường dự phòng.
* Nhật ký hoạt động (`CONNECT_TELEGRAM_ACCOUNT`…) và Sức khỏe hệ thống (`record()`) đã có.

---

## Nguyên tắc thiết kế
1. **Nói thật kênh gửi mã:** giao diện hiển thị đúng nơi Telegram gửi mã (app / SMS / email `ng***b@gmail.com` / cuộc gọi / Fragment) và thời gian chờ được gửi lại.
2. **Đúng cách cho đúng thiết bị:** điện thoại → **OTP** (mặc định); máy tính → **QR quét bằng điện thoại** (mặc định). Không hứa "1-chạm trên cùng điện thoại" nếu Telegram không cho phép.
3. **Bền qua khởi động lại:** mọi trạng thái đăng nhập dở dang lưu DB (mã hóa, TTL ngắn), không chỉ trong RAM.
4. **Không lộ bí mật:** QR vẽ ngay trên trình duyệt (không gửi token ra dịch vụ ngoài); không log mã OTP / token.
5. **Luôn có đường lui:** nếu không đăng nhập được, Quản lý vẫn đưa tin vào hệ thống bằng cách **chuyển tiếp bài cho Bot**.

---

## Danh mục User Stories

| Story | Tên | Trọng tâm kỹ thuật | Ưu tiên | Ước lượng |
| :--- | :--- | :--- | :---: | :---: |
| **18.0** | Chẩn đoán & xác minh cơ chế đăng nhập Telegram | Log chẩn đoán an toàn, thử 3 kịch bản trên thiết bị thật | P0 | 0,5 ngày |
| **18.1** | OTP đúng kênh gửi: app / SMS / email + gửi lại | `auth.SendCode` trực tiếp, `type`/`nextType`/`timeout`, `auth.ResendCode`, email pattern | P0 | 1 ngày |
| **18.2** | Phiên chờ đăng nhập bền qua khởi động lại | Lưu StringSession tạm (mã hóa) + `phoneCodeHash` vào DB, TTL 10 phút | P0 | 1 ngày |
| **18.3** | Thông báo lỗi Telegram rõ ràng bằng tiếng Việt | Bảng ánh xạ lỗi RPC, đếm ngược `FLOOD_WAIT`, ghi Sức khỏe hệ thống | P0 | 0,5 ngày |
| **18.4** | QR đăng nhập chuẩn cho máy tính | QR vẽ tại trình duyệt, tự làm mới token trước hạn, `UpdateLoginToken`, hướng dẫn theo thiết bị | P1 | 1 ngày |
| **18.5** | Giữ phiên khỏe & phát hiện phiên chết sớm | `getMe` kiểm tra nhẹ (cache 5 phút), thông số thiết bị cố định, thông báo khi bị thu hồi | P1 | 0,5 ngày |
| **18.6** | Đường dự phòng: chuyển tiếp bài cho Bot | Bot nhận bài/album chuyển tiếp từ Quản lý đã liên kết `/start` → nạp như cào tin | P1 | 1 ngày |
| **18.7** | Kiểm thử thiết bị thật & tài liệu hướng dẫn | Checklist 3 thiết bị, hướng dẫn cho Quản lý, cập nhật EXTERNAL_CONFIG | P0 | 0,5 ngày |

**Tổng ước lượng:** ~6 ngày làm việc. Thứ tự đề xuất: 18.0 → 18.1 + 18.2 + 18.3 (gỡ chặn OTP) → 18.7 (thử) → 18.4 → 18.5 → 18.6.

---

## Chi tiết từng Story

### Story 18.0 — Chẩn đoán & xác minh cơ chế đăng nhập
**Là** người phát triển, **tôi muốn** biết chính xác Telegram trả gì ở mỗi bước đăng nhập, **để** sửa đúng nguyên nhân thay vì đoán.
* **AC1:** Given gửi mã OTP, When Telegram trả `auth.SentCode`, Then log máy chủ ghi loại kênh (`App/Sms/EmailCode/SetUpEmailRequired/FragmentSms/...`), `nextType`, `timeout` — **không ghi mã, không ghi phoneCodeHash**.
* **AC2:** Given mở `tg://login?token=` trên điện thoại có Telegram, Then ghi lại Telegram phản hồi gì (xác nhận / cảnh báo / chặn) trên iOS và Android → quyết định giữ hay bỏ nút "1-chạm".
* **AC3:** Given quét QR bằng *Cài đặt → Thiết bị → Liên kết thiết bị máy tính*, Then xác nhận `ExportLoginToken` trả `LoginTokenSuccess` / `LoginTokenMigrateTo`.
* **Đầu ra:** bảng kết quả 3 kịch bản, đính kèm vào Story 18.4.

### Story 18.1 — OTP đúng kênh gửi
**Là** Quản lý, **tôi muốn** biết mã đăng nhập được gửi ở đâu và gửi lại được, **để** không phải đoán và chờ vô ích.
* Thay `client.sendCode()` bằng `client.invoke(new Api.auth.SendCode(...))` để đọc `type`, `nextType`, `timeout`.
* **AC1:** `SentCodeTypeApp` → "Mã đã gửi vào **ứng dụng Telegram** (chat *Telegram* có dấu tích xanh) trên thiết bị đang đăng nhập."
* **AC2:** `SentCodeTypeEmailCode` → "Mã đã gửi tới **email ng\*\*\*b@gmail.com**" (dùng `email_pattern` Telegram trả về) + nhắc xem thư mục Spam.
* **AC3:** `SentCodeTypeSms` / `Call` / `FragmentSms` → ghi đúng kênh; Fragment kèm link `url`.
* **AC4:** `SentCodeTypeSetUpEmailRequired` → hướng dẫn: "Mở ứng dụng Telegram → Cài đặt → Quyền riêng tư & Bảo mật → **Email đăng nhập**, thiết lập email rồi bấm Gửi lại".
* **AC5:** Có `nextType` → nút **"Gửi lại qua SMS / cuộc gọi"** mở sau `timeout` giây (đếm ngược), gọi `auth.ResendCode`.
* **AC6:** Bấm "Đổi số điện thoại" → gọi `auth.CancelCode` để hủy mã cũ.
* **Phạm vi:** `telegram-userbot.service.ts`, `telegram-userbot.controller.ts`, `TelegramConnectCard.tsx`, `telegramUserbotApi.ts`.

### Story 18.2 — Phiên chờ đăng nhập bền qua khởi động lại
**Là** Quản lý, **tôi muốn** nhập mã vừa nhận vẫn đăng nhập được dù máy chủ vừa khởi động lại, **để** không phải gửi mã lại nhiều lần (dễ bị Telegram tạm khóa).
* Ngay sau `auth.SendCode` / `ExportLoginToken`: lưu `StringSession` của client đang chờ (chứa auth key dùng để gửi mã) **mã hóa bằng `encryptSession`** + `phone`, `phoneCodeHash`, loại kênh vào collection `telegram_pending_logins` (TTL 10 phút, 1 bản ghi / người dùng).
* **AC1:** Given đã gửi mã, When Render khởi động lại, Then nhập đúng mã vẫn kết nối thành công (khôi phục client từ session tạm).
* **AC2:** Given quá 10 phút, Then báo "Mã đã hết hạn, vui lòng gửi mã mới" (không phải lỗi chung).
* **AC3:** Kết nối thành công / hủy → xóa bản ghi tạm; không bao giờ trả session tạm về trình duyệt.
* **Phạm vi:** model mới `telegram-pending-login.model.ts`, `telegram-userbot.service.ts`.

### Story 18.3 — Thông báo lỗi Telegram rõ ràng
* Bảng ánh xạ (tối thiểu): `PHONE_NUMBER_INVALID` → "Số điện thoại không đúng định dạng Telegram"; `PHONE_CODE_INVALID` → "Mã không đúng"; `PHONE_CODE_EXPIRED` → "Mã đã hết hạn, gửi mã mới"; `FLOOD_WAIT_X` → "Thử quá nhiều lần, vui lòng chờ **X phút**" (đếm ngược, khóa nút); `PHONE_NUMBER_BANNED` / `USER_DEACTIVATED` → "Tài khoản Telegram bị hạn chế, dùng Story 18.6"; `PASSWORD_HASH_INVALID` → "Mật khẩu 2FA không đúng"; `AUTH_RESTART` → tự thử lại 1 lần.
* **AC1:** Mọi lỗi kết nối hiện tiếng Việt + việc cần làm; không còn văn bản lỗi tiếng Anh thô.
* **AC2:** Lỗi hệ thống (không phải lỗi người dùng) ghi `record('telegram', ...)` để Admin thấy trong Sức khỏe hệ thống.

### Story 18.4 — QR đăng nhập chuẩn cho máy tính
**Là** Quản lý dùng máy tính, **tôi muốn** quét QR bằng Telegram trên điện thoại, **để** kết nối không cần mã.
* QR **vẽ tại trình duyệt** (thư viện `qrcode` ~ 30KB — cần duyệt cài gói — hoặc bộ mã hóa QR nội bộ), **không** gửi token ra ngoài.
* Máy chủ tự gọi lại `ExportLoginToken` **trước khi token hết hạn** (dựa vào `expires`), giao diện nhận token mới qua lượt hỏi trạng thái → QR luôn còn hạn; nghe `UpdateLoginToken` để phản hồi ngay khi quét.
* **AC1:** Máy tính: mặc định tab QR, hướng dẫn "Telegram trên điện thoại → Cài đặt → Thiết bị → **Liên kết thiết bị máy tính** → quét mã".
* **AC2:** Điện thoại: mặc định tab OTP; nút "Mở Telegram xác nhận" **chỉ giữ nếu Story 18.0 chứng minh hoạt động**.
* **AC3:** Tài khoản bật 2FA → hiện ô mật khẩu ngay sau khi quét (đã có, giữ nguyên).
* **AC4:** QR quá 2 phút không quét → tạm dừng làm mới, nút "Tạo mã mới" (tránh giữ kết nối Telegram vô ích).

### Story 18.5 — Giữ phiên khỏe & phát hiện phiên chết sớm
* `GET /status` kiểm tra nhẹ bằng `getMe` (cache 5 phút / người) → phiên chết thì tự xóa và hiện màn hình kết nối lại (dùng `withSession` đã có).
* Thông số thiết bị **cố định** cho mọi client của 1 người (`deviceModel`, `systemVersion`, `appVersion`, `langCode: 'vi'`) — Telegram coi là cùng 1 thiết bị, giảm nghi ngờ.
* **AC1:** Phiên bị thu hồi → người dùng nhận thông báo trong app (chuông) "Kết nối Telegram đã bị ngắt, vui lòng kết nối lại".
* **AC2:** Trang hiển thị "Kết nối lúc … · kiểm tra lần cuối …".
* **AC3:** Hướng dẫn trong trang: không bấm "Chấm dứt các phiên khác" trong Telegram; phiên mới có thể bị Telegram hạn chế 24 giờ đầu.

### Story 18.6 — Đường dự phòng: chuyển tiếp bài cho Bot
**Là** Quản lý không đăng nhập được Telegram cá nhân, **tôi muốn** chuyển tiếp bài đăng (kể cả album) từ nhóm BĐS sang Bot của hệ thống, **để** bài vẫn được AI bóc tách và nạp vào Bảng hàng.
* Dùng lại liên kết `/start <mã>` (trường `telegramChatId`) đã có.
* **AC1:** Given Quản lý/Admin đã liên kết Bot, When chuyển tiếp 1 bài hoặc album vào chat riêng với Bot, Then bài đi qua pipeline AI + khử trùng, `managerId` = người chuyển tiếp, Bot trả lời "Đã nạp: <tiêu đề>" hoặc lý do bị loại.
* **AC2:** Người chưa liên kết hoặc là CTV → Bot trả lời hướng dẫn, không nạp.
* **AC3:** Giới hạn 30 bài / giờ / người; ghi Nhật ký `TELEGRAM_SCRAPE` (nguồn: chuyển tiếp).
* **Phạm vi:** `telegram.service.ts` (nhánh xử lý chat riêng), không cần đăng nhập Telegram cá nhân, không thêm biến môi trường.

### Story 18.7 — Kiểm thử thiết bị thật & tài liệu
* Checklist: iPhone Safari (OTP qua app, qua email), Android Chrome (OTP), máy tính Chrome (QR), tài khoản có 2FA, khởi động lại Render giữa chừng, nhập sai mã 3 lần, phiên bị thu hồi.
* Cập nhật `EXTERNAL_CONFIG.md` (mục Telegram) và hướng dẫn ngắn cho Quản lý (dán nhóm Zalo).

---

## Rủi ro & cách giảm

| Rủi ro | Mức | Cách giảm |
|---|---|---|
| Telegram chặn hẳn link `tg://login` mở trực tiếp | Cao | Story 18.0 xác minh; mặc định OTP trên điện thoại, QR trên máy tính |
| Telegram hạn chế / thu hồi phiên đăng nhập từ IP máy chủ nước ngoài (Render) | Trung bình | Story 18.5 (thiết bị cố định, phát hiện sớm) + Story 18.6 (đường dự phòng không cần đăng nhập) |
| Gửi mã liên tục → `FLOOD_WAIT` khóa hàng giờ | Trung bình | Story 18.2 (không mất phiên chờ) + 18.3 (đếm ngược, khóa nút) |
| Đăng nhập Telegram cá nhân bằng ứng dụng bên thứ ba có thể trái điều khoản Telegram nếu dùng để spam | Thấp (chỉ đọc nhóm đã tham gia) | Chỉ đọc, không gửi tin; giới hạn 2 tác vụ quét; giãn cách giữa các bài |
| Cài thêm gói `qrcode` | Thấp | Chỉ cần ở Story 18.4; cần bạn duyệt cài gói |

## Ngoài phạm vi
* Đăng tin / gửi tin tự động vào nhóm Telegram bằng tài khoản cá nhân.
* Chạy nhiều tài khoản Telegram cho 1 người dùng.
* Chuyển backend khỏi Render.
