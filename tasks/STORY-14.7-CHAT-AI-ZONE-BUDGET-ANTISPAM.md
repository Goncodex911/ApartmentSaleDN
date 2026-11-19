# STORY 14.7: Chat AI Hiểu Đúng Khu Vực & Ngân Sách, Chống Spam Khách Ảo (Chat AI Zones, USD Budget & Anti-spam)

**Bối cảnh:** Epic 14, phát hiện #13, #14, #15 trong đợt rà soát 20/11/2026. Bổ sung cho `STORY-6.2-AI-AUTO-CHAT.md` và Story 11.1.
* **Ngân sách USD bị hiểu sai:** `chat-ai.ts:56` coi mọi ngân sách < 1.000 là "triệu". Khách nước ngoài nói "$600/month" bị lưu thành 600 triệu VNĐ, nên được gợi ý căn đắt và ghép sai.
* **Khu vực dạng phường bị lưu sai chỗ:** AI lưu "Mỹ An", "An Hải" vào `districts` (ô quận). Các tên này không khớp quận nào khi tìm kiếm hay ghép căn, nên khách chat theo khu vực quen thuộc của thị trường Đà Nẵng **không bao giờ** được gợi ý căn hay ghép căn mới.
* **Spam khách ảo:** mỗi lần mở chat mới tạo 1 khách trong CRM và 1 thông báo cho CTV. Giới hạn hiện chỉ là 10 tin / phút / IP, nên một người có thể tạo hàng trăm khách ảo mỗi giờ.

---

## 1. Mô tả Story (User Story)
* **Là một:** CTV nhận khách từ link xem phòng.
* **Tôi muốn:** Khách chat được hiểu đúng khu vực và ngân sách (kể cả khách nước ngoài trả bằng USD), và phễu khách không bị khách ảo làm đầy.
* **Để:** Gợi ý căn trong chat và thông báo ghép căn thật sự đến với khách chat.

---

## 2. Tiền điều kiện (Pre-conditions)
* `ILeadRequirements` đã có `zones` và `budgetCurrency`. `scoreLeadMatch` đã chấm theo khu vực và USD (Story 11.1).
* Đã có `ZONES`, `OTHER_ZONE`, `canonicalDistrict`, `findPhrase` / `toSearchTokens`, `usdToVndRate`.
* **Phụ thuộc:** `createCounter` trong `middlewares/rate-limit.ts` (Story 14.5). Làm story này trước thì tạo `createCounter` ở đây; Story 14.5 dùng lại.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Khu vực
* **Given** khách nói "tìm căn ở Mỹ An" hoặc "near An Hai"
* **Then** nhu cầu lưu `zones: ['Mỹ An']` / `['An Hải']`, không lưu vào `districts`.
* Tên quận hợp lệ lưu dạng chuẩn ("nhs" → "Ngũ Hành Sơn"). Tên vừa là khu vực vừa là quận (Hải Châu, Sơn Trà, Ngũ Hành Sơn) lưu cả hai ô.
* Tên không thuộc Đà Nẵng bị bỏ.

### AC2 — Ngân sách
* **Given** khách viết "budget $600/month" hoặc "600 đô"
* **Then** lưu `maxBudget: 600`, `budgetCurrency: 'USD'`.
* **Given** khách viết "tầm 7 triệu" (AI trả 7 hoặc 7000000)
* **Then** lưu `maxBudget: 7000000`, `budgetCurrency: 'VND'`. Quy tắc "số < 1.000 là triệu" chỉ áp dụng khi tiền tệ là VNĐ.

### AC3 — Gợi ý & ghép căn dùng nhu cầu mới
* Khách chat có khu vực **hoặc** ngân sách được gợi ý tối đa 3 căn: lọc theo khu vực (`zones`) và/hoặc quận, ngân sách USD quy đổi theo tỷ giá cấu hình.
* Khách tạo từ chat có `zones` / `budgetCurrency` trong CRM, nên khi có căn mới phù hợp ≥ 80% thì CTV nhận thông báo ghép căn như khách nhập tay.
* Thông báo "Khách mới nhắn tin … cần tìm phòng khu …" ghi cả khu vực lẫn quận.

### AC4 — Chống spam khách ảo
* Mỗi IP tạo tối đa **5 phiên chat mới / giờ** trên cùng một link. Vượt thì trả 429 "Bạn đã mở quá nhiều cuộc trò chuyện, vui lòng thử lại sau". Phiên đang có vẫn chat bình thường.
* Gửi `sessionId` không tồn tại (đã hết hạn sau 30 ngày, hoặc bịa) được tính là phiên mới.
* Khách chỉ được tạo trong CRM và CTV chỉ được báo **từ tin nhắn thứ 2** của phiên, hoặc ngay khi khách để lại SĐT.
* Khung chat hiện câu báo lỗi 429 cho khách bằng đúng ngôn ngữ đang chọn.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/modules/chat/chat-ai.ts`:**
  - Prompt: tách `"zones"` (danh sách `ZONES` trừ "Khác") khỏi `"districts"` (chỉ tên quận); thêm `"budgetCurrency": "VND" | "USD"`.
  - `sanitize`:
    - `districts` → `canonicalDistrict`, bỏ trùng, bỏ tên không hợp lệ.
    - `zones` nhận từ cả 2 ô bằng `findPhrase` trên danh sách `ZONES`.
    - Ngân sách xử lý theo AC2.
* **`backend/src/modules/chat/chat-session.model.ts`:** `requirements` thêm `zones: [String]` và `budgetCurrency: { type: String, enum: ['VND', 'USD'] }`.
* **`backend/src/modules/chat/chat.service.ts`:**
  - `suggestApartments`:
    - Điều kiện có nhu cầu gồm cả `zones`.
    - Truyền `zones`, `district`; ngân sách USD quy đổi `× usdToVndRate()`.
  - `sendMessage`:
    - Tạo phiên mới (không có hoặc không tìm thấy `sessionId`) phải qua bộ đếm `createCounter({ windowMs: 1 giờ, max: 5 })`, key `${ip}:${code}`. Cần truyền `req.ip` từ controller.
    - Chỉ gọi `syncLeadFromChat` khi `userMessageCount >= 2` hoặc `customer.phone`.
* **`backend/src/modules/chat/chat.controller.ts`:** truyền `req.ip` vào service.
* **`backend/src/modules/chat/chat-lead.ts`:** chuỗi khu vực trong thông báo ghép `zones` + `districts`. Phần chép nhu cầu sang Lead đã tự xử lý trường mới.
* **`backend/src/middlewares/rate-limit.ts`:** `createCounter` (nếu Story 14.5 chưa làm).

### Frontend:
* **`frontend/src/components/public/ChatWidget.tsx`:** 429 khi đang ở tiếng Anh hiện bản tiếng Anh của câu báo (thêm vào `publicCopy`), không dùng câu "lỗi kết nối" chung.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Kiểm thử hàm `sanitize` (tsx, scratchpad) với kết quả AI giả lập:
  - `districts: ['Mỹ An']` → `zones: ['Mỹ An']`, `districts: []`.
  - `districts: ['nhs']` → `['Ngũ Hành Sơn']`.
  - `maxBudget: 600, budgetCurrency: 'USD'` → giữ 600 USD.
  - `maxBudget: 7` → 7.000.000 VND.
* [ ] API (bản local, có `GEMINI_API_KEY`):
  - Chat "I need a 1BR near My An, budget $600" → gợi ý căn ở Mỹ An ≤ 600 USD (quy đổi).
  - Lead trong CRM có `zones` + `budgetCurrency: 'USD'`.
  - Tạo căn mới ở Mỹ An giá phù hợp → CTV nhận thông báo ghép căn.
* [ ] Chống spam:
  - 6 phiên mới từ cùng IP trên một link → phiên thứ 6 trả 429.
  - Phiên chỉ có 1 tin không chứa SĐT → không tạo Lead.
  - Tin thứ 2 → tạo Lead và gửi thông báo.
* [ ] Puppeteer 390px: khung chat hiện câu báo 429 đúng ngôn ngữ.
* [ ] `tsc` 2 phía không lỗi; dọn dữ liệu thử.
* [ ] Báo cáo và đề xuất commit, chờ duyệt.

---

## 6. Rủi ro & lựa chọn
* **Chờ tin thứ 2 mới tạo khách** nên CTV bị báo chậm hơn một lượt. Đổi lại, phễu không bị khách mở chat rồi bỏ đi làm đầy. Nếu muốn báo ngay từ tin đầu thì chỉ giữ giới hạn 5 phiên / giờ; đề xuất giữ như AC4.
* Phiên chat đã có trước khi triển khai vẫn giữ `districts` cũ, không chuyển đổi lại. Phiên mới mới dùng cách lưu mới.
