# STORY 18.6: Đường Dự Phòng — Chuyển Tiếp Bài Cho Bot (Forward-to-Bot Ingestion Fallback)

**Bối cảnh:** `docs/stories/EPIC_18_RELIABLE_TELEGRAM_ACCOUNT_LINKING.md` (Story 18.6).
Khi Telegram không cho đăng nhập tài khoản cá nhân vào ứng dụng bên thứ ba (mã không tới, tài khoản bị hạn chế, phiên bị thu hồi liên tục), Quản lý vẫn cần đưa tin từ nhóm BĐS vào Bảng hàng. Bot hệ thống (`telegram.service.ts`, `TELEGRAM_BOT_TOKEN`) **đã có** liên kết tài khoản app ↔ Telegram qua `/start <mã>` (trường `User.telegramChatId`, Story 16.9 / Epic 6) và đã có pipeline nạp tin (album, AI, khử trùng) cho nhóm nguồn. Story này mở thêm nhánh: **chat riêng với Bot** nhận bài chuyển tiếp.

---

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý / Admin không đăng nhập được Telegram cá nhân vào hệ thống.
* **Tôi muốn:** Chuyển tiếp (forward) bài đăng hoặc album từ nhóm BĐS vào chat riêng với Bot của hệ thống.
* **Để:** Bài vẫn được AI bóc tách và nạp vào Bảng hàng mà không cần cấp quyền tài khoản Telegram cá nhân.

---

## 2. Tiền điều kiện (Pre-conditions)
* Bot đang chạy trên Render (`TELEGRAM_BOT_TOKEN` đã cấu hình, không có máy chủ khác cùng nhận tin của bot).
* Người dùng đã liên kết Telegram với tài khoản app (nút "Liên kết Telegram" → `/start <mã>`).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Nạp bài chuyển tiếp
* **Given** Quản lý / Admin đã liên kết (`telegramChatId` = chat riêng với Bot)
* **When** chuyển tiếp 1 bài hoặc 1 album (nhiều ảnh) vào chat riêng với Bot
* **Then** bài đi qua pipeline hiện có (gom album → AI bóc tách → chỉ tải ảnh khi là tin cho thuê → khử trùng), `managerId` = **người chuyển tiếp**, `sourceName` = tên nhóm gốc (`forward_origin` / `forward_from_chat.title`) nếu Telegram cung cấp
* **And** Bot trả lời trong chat: *"Đã nạp: <tiêu đề> (Căn mới / Gộp trùng)"* hoặc *"Không phải tin cho thuê: <lý do>"*.

### AC2 — Từ chối người không hợp lệ
* **Given** chat riêng từ người **chưa liên kết** hoặc tài khoản **CTV** / bị khóa
* **Then** Bot không nạp, trả lời hướng dẫn: *"Bạn cần liên kết Telegram trong app (Hồ sơ → Liên kết Telegram). Chỉ Quản lý / Admin được nạp tin qua Bot."*

### AC3 — Giới hạn & nhật ký
* **Given** một người chuyển tiếp quá **30 bài / giờ**
* **Then** Bot trả lời *"Bạn đã chuyển tiếp 30 bài trong 1 giờ, vui lòng chờ"*, không nạp thêm.
* **And** mỗi bài nạp ghi Nhật ký `TELEGRAM_SCRAPE` với `details.source = 'FORWARD'`, số căn đã nạp.

### AC4 — Không ảnh hưởng nhóm nguồn
* **Then** luồng nhóm nguồn hiện có (Admin cấu hình ở Story 13.5) giữ nguyên hành vi.

### AC5 — Hướng dẫn trên trang Cào tin
* **Then** trang Cào tin Telegram có khối "Không kết nối được? Chuyển tiếp bài cho Bot @<tên bot>" kèm 3 bước và trạng thái đã liên kết Bot hay chưa.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/modules/ingestion/telegram.service.ts`:**
  - Trong `handlePost`: nếu `chat.type === 'private'` → tra `User.findOne({ telegramChatId: String(chat.id), role: { $in: ['ADMIN', 'MANAGER'] }, status: 'ACTIVE' })`; có → nạp với `managerId` của người đó; không → trả lời hướng dẫn.
  - Giới hạn 30 bài / giờ / người (bộ đếm trong RAM, dùng lại `createCounter` của `rate-limit.ts` nếu phù hợp).
  - Lấy tên nhóm gốc từ `forward_origin.chat.title` / `forward_from_chat.title`.
* **`telegram.service.ts` có thể vượt 300 dòng** → tách nhánh chat riêng ra `telegram-forward.service.ts`.
* **Audit:** `AuditService.log(..., 'TELEGRAM_SCRAPE', ..., { source: 'FORWARD', imported })`.

### Frontend:
* **`frontend/src/components/admin/telegram/ForwardToBotHint.tsx` (mới):** khối hướng dẫn + trạng thái liên kết (dùng `user.telegramChatId` sẵn có trong `/auth/me` nếu có; nếu không, thêm cờ `telegramLinked`).
* **`TelegramScraperPage.tsx`:** hiển thị khối khi chưa kết nối Telegram cá nhân hoặc khi gặp `TELEGRAM_ACCOUNT_RESTRICTED`.

### Không thêm biến môi trường.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Quản lý đã liên kết chuyển tiếp 1 album 5 ảnh → 1 căn mới có đủ ảnh, Bot trả lời "Đã nạp".
* [ ] Chuyển tiếp tin không phải cho thuê → Bot trả lời lý do, không tạo căn.
* [ ] CTV / người chưa liên kết → Bot trả lời hướng dẫn.
* [ ] Bài thứ 31 trong 1 giờ bị chặn.
* [ ] Nhật ký hoạt động có dòng "Cào tin Telegram" nguồn FORWARD.
* [ ] Nhóm nguồn cũ vẫn nạp bình thường.
* [ ] Backend `tsc --noEmit`, frontend build không lỗi; file ≤ 300 dòng.
