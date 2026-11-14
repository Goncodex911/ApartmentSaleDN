# STORY-6.2: AI Auto-Chat Giữ chân Khách (AI Virtual Assistant)

## 1. Mô tả Story (User Story)
* **Là một:** CTV đang bận hoặc ngoài giờ làm việc.
* **Tôi muốn:** Khi khách mở link xem phòng (Story 5.3) và nhắn tin, trợ lý AI trả lời ngay, hỏi nhu cầu, gợi ý 2-3 căn thật còn trống, và báo cho tôi qua Telegram.
* **Để:** Giữ chân khách ngay lập tức, không để khách đi hỏi môi giới khác.

---

## 2. Tiền điều kiện (Pre-conditions)
1. Trang xem phòng công khai `/p/:slug-code` (Story 5.3). Mỗi link gắn với đúng 1 CTV.
2. `GEMINI_API_KEY` đã cấu hình. `SearchService.search` (Epic 4) để truy vấn căn.
3. Model `Lead` (Story 6.1) và `Notification` (dùng chung với Story 6.3).

---

## 3. Tiêu chí Chấp nhận (Acceptance Criteria - Gherkin)

### AC1: Khung chat trên trang xem phòng
* Nút chat nổi phía trên Bottom Bar, mở thành khung chat toàn màn hình trên điện thoại.
* Lời chào đầu là `greetingMessage` của CTV.
* `sessionId` do server cấp, lưu `localStorage` theo từng link → tải lại trang vẫn giữ hội thoại.

### AC2: AI trả lời tự nhiên trong 3–5 giây & thu thập nhu cầu
* Gemini trả JSON `{ reply, requirements, customer, wantsSuggestions }`. Hội thoại tối đa 12 tin gần nhất làm ngữ cảnh.
* Thu thập dần: khu vực, ngân sách tối đa, thời điểm chuyển vào, nuôi thú cưng, đi ô tô, số phòng ngủ, **tên và SĐT** khách.
* Ngữ cảnh gửi AI **chỉ gồm dữ liệu công khai** (DTO của Story 5.3) → khách có hỏi khéo cũng không lộ thông tin chủ nhà.
* Timeout 8 giây hoặc Gemini lỗi → trả câu dự phòng *"Tư vấn viên sẽ liên hệ lại bạn ngay"*, vẫn ghi nhận khách và báo CTV.

### AC3: Gợi ý 2-3 căn thật từ MongoDB
* Khi đã có khu vực hoặc ngân sách, server gọi `SearchService.search` (`status: AVAILABLE`, tối đa 3 căn, loại trừ căn đang xem).
* Mỗi căn gợi ý là thẻ có ảnh, giá, khu vực, và **link xem phòng của chính CTV đó** (tạo bằng `ShareLinkService`). Như vậy khách vẫn ở trong "kênh" của CTV.
* Thẻ căn do **server** tạo từ dữ liệu thật, AI không tự bịa căn.

### AC4: Tự tạo khách trong CRM & báo CTV
* Tin nhắn đầu tiên → tạo `Lead` (`source: AI_CHAT`, `stage: NEW`) cho CTV chủ link. Nhu cầu, tên, SĐT được cập nhật dần vào Lead.
* Gửi thông báo (trong app + Telegram nếu CTV đã liên kết):
  * Khi khách bắt đầu chat: *"Khách web vừa nhắn tin cần tìm phòng khu Cầu Giấy, hãy vào hỗ trợ!"*
  * Khi khách để lại SĐT: *"Khách Anh Nam (0912…) vừa để lại SĐT…"*. Mỗi loại chỉ gửi 1 lần mỗi phiên.

### AC5: Liên kết Telegram an toàn cho CTV
* Hồ sơ cá nhân có nút **"Liên kết Telegram"**: server tạo mã 1 lần (8 ký tự, hết hạn sau 10 phút) và trả deep link `https://t.me/<bot>?start=<mã>`.
* Bot nhận `/start <mã>` trong chat riêng → lưu `telegramChatId` cho đúng tài khoản. **Không** cho liên kết bằng `ctvCode`, vì mã này công khai và người khác có thể nhận trộm thông báo khách.

### AC6: Chống lạm dụng (endpoint công khai gọi Gemini)
* Giới hạn bộ nhớ trong (không cài package): 10 tin/phút mỗi IP, 30 tin mỗi phiên. Tin dài tối đa 500 ký tự. Vượt giới hạn → `429`.

---

## 4. Phạm vi Kỹ thuật (Technical Implementation Scope)

### A. Backend
```plaintext
modules/chat/
├── chat-session.model.ts   # { shareCode, ctvId, apartmentId, leadId, messages[], requirements, customer, notified{} }
├── chat.prompt.ts          # system prompt + JSON schema
├── chat.service.ts         # gửi tin: Gemini → cập nhật Lead → gợi ý căn → thông báo
├── chat.controller.ts / chat.routes.ts  # POST /api/v1/chat/:code/messages, GET /api/v1/chat/:code/sessions/:sessionId
modules/notifications/
├── notification.model.ts   # { userId, type, title, body, leadId, apartmentId, readAt } TTL 30 ngày
├── notification.service.ts # notify(userId, ...) = lưu in-app + gửi Telegram nếu đã liên kết
├── notification.controller.ts / notification.routes.ts   # (dùng chung Story 6.3)
middlewares/rate-limit.ts   # bộ giới hạn tần suất trong bộ nhớ
modules/auth/user.model.ts  # + telegramChatId, telegramLinkCode, telegramLinkExpiresAt
modules/users/*             # POST /api/v1/users/telegram-link
modules/ingestion/telegram.service.ts  # xử lý /start <mã>, sendMessage public
```

### B. Frontend
```plaintext
api/chatApi.ts
components/public/ChatWidget.tsx        # khung chat + thẻ căn gợi ý
pages/PublicListingPage.tsx             # gắn ChatWidget
components/profile/ProfileModal.tsx     # nút Liên kết Telegram
```

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
- [ ] Gửi tin đầu tiên → có `Lead` mới (AI_CHAT, NEW) đúng CTV chủ link + 1 thông báo.
- [ ] Khách nói "tìm phòng Cầu Giấy dưới 7 triệu" → nhận ≤ 3 thẻ căn thật, link là link của cùng CTV.
- [ ] Khách hỏi SĐT chủ nhà → AI không có dữ liệu để lộ.
- [ ] Gemini lỗi → vẫn có câu trả lời dự phòng, Lead vẫn được tạo.
- [ ] Gửi 11 tin trong 1 phút từ 1 IP → tin thứ 11 nhận `429`.
- [ ] Liên kết Telegram bằng mã 1 lần; mã hết hạn → bot báo lỗi.
- [ ] Build thành công, file ≤ 250 dòng, không commit khi chưa được phép.
