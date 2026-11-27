# STORY 20.3: Tiêu Đề Lấy Nguyên Dòng Đầu Của Tin Mẫu (Post Title From First Line)

**Bối cảnh:** `docs/stories/EPIC_20_USER_FEEDBACK_INGESTION_MAP_FORM.md` (mục B, Story 20.3). Phản hồi người dùng 28/11/2026.
Đã kiểm tra trên `main` ee1fdfe:
* `gemini.prompt.ts:20` yêu cầu AI tự viết **tiêu đề tiếng Việt** ("Cho thuê căn 2PN …"); ví dụ JSON dòng 70 cũng là tiếng Việt.
* `gemini.service.ts:244` lấy thẳng `ext.title` của AI → dòng tiêu đề chuẩn của tin mẫu (`1BR Apartment for rent – Son Tra`) bị thay mất.
* `gemini.service.ts:223` dùng `ext.title` để đoán loại căn (`inferPropertyType`) → vẫn giữ tiêu đề AI cho việc đoán này.

**Độ khó:** Dễ — **giao Antigravity** (`agy`), Claude rà diff + chạy build/test trước khi báo cáo.

---

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý / CTV dán tin theo mẫu của đội vào "Nhập tin bằng AI".
* **Tôi muốn:** Tiêu đề căn giữ nguyên dòng đầu của tin (VD `1BR Apartment for rent – Son Tra`).
* **Để:** Tiêu đề đồng bộ với bài đăng của đội, khách nước ngoài đọc được, không phải sửa tay.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story 19.6, 19.12 đã có trên `main` (có `backend/tests/core-rules.test.ts`, chạy bằng `npm test`).
* Không cần biến môi trường mới.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Lấy dòng đầu làm tiêu đề
* **Given** tin có dòng khác rỗng đầu tiên **không phải** dòng thông số (xem AC2)
* **When** nhập tin bằng AI (mọi cổng: dán nhanh, Telegram, webhook)
* **Then** `title` = dòng đó, sau khi: bỏ emoji / ký hiệu trang trí ở **đầu và cuối** dòng, gộp khoảng trắng thừa; **giữ nguyên** chữ hoa/thường, dấu `–`, `-`, `,`.
* **And** dòng dài hơn 120 ký tự → cắt ở khoảng trắng gần nhất ≤ 120 ký tự.

### AC2 — Không lấy dòng thông số / liên hệ
Dòng đầu bị **bỏ qua** (dùng tiêu đề AI) khi rơi vào một trong các trường hợp:
* bắt đầu bằng chữ số hoặc emoji số `0️⃣…🔟` (VD `1️⃣ Type: apartment`);
* có dạng nhãn thông số `Nhãn: giá trị` với nhãn thuộc danh sách: `type, rooms, square meters, address, distance, price, minimum, free dates, other, contact, loại, phòng, diện tích, địa chỉ, giá, liên hệ` (không phân biệt hoa thường, có/không dấu);
* chứa SĐT (≥ 9 chữ số liên tiếp sau khi bỏ dấu cách / chấm) hoặc link (`http`, `www.`, `zalo.me`);
* sau khi làm sạch còn < 6 ký tự.

| Dòng đầu của tin | `title` |
|---|---|
| `1BR Apartment for rent – Son Tra` | `1BR Apartment for rent – Son Tra` |
| `1BR apartment in My An near river` | `1BR apartment in My An near river` |
| `🏠🏠 CHO THUÊ CĂN HỘ 2PN MỸ AN 🔥` | `CHO THUÊ CĂN HỘ 2PN MỸ AN` |
| `1️⃣ Type: apartment` | tiêu đề AI |
| `Address: An Trung Dong 1` | tiêu đề AI |
| `0905 123 456 chính chủ` | tiêu đề AI |
| `🔥🔥` | tiêu đề AI |

### AC3 — Tiêu đề AI dùng cùng ngôn ngữ với tin
* **Given** tin không có dòng tiêu đề hợp lệ
* **Then** dùng tiêu đề AI như hiện nay, nhưng prompt đổi thành: *tiêu đề ngắn gọn, **cùng ngôn ngữ với tin gốc***, kèm 1 ví dụ tiếng Anh và 1 ví dụ tiếng Việt.

### AC4 — Không đổi hành vi khác
* **Then** việc đoán loại căn (`inferPropertyType`) vẫn dùng tiêu đề **AI** (`ext.title`) như cũ.
* **And** fallback `'Căn hộ cho thuê'` khi cả dòng đầu lẫn AI đều không có tiêu đề.
* **And** căn đã có trong DB không bị đổi tiêu đề (không chạy script cập nhật).

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend
* **Tạo `backend/src/modules/ingestion/post-title.ts`** (~40 dòng): hàm thuần `extractPostTitle(rawText: string): string | null` theo AC1–AC2. Comment tiếng Việt giải thích từng luật bỏ qua. Dùng lại `normalizeText` (`utils/address-text.ts`) để so nhãn không dấu.
* **`backend/src/modules/ingestion/gemini.service.ts`** (`sanitizeResult`, dòng ~244): `title: extractPostTitle(rawText) || ext.title || 'Căn hộ cho thuê'`. Giữ nguyên dòng 223.
* **`backend/src/modules/ingestion/gemini.prompt.ts`**: dòng 20 đổi mô tả `title` theo AC3; ví dụ JSON dòng 70 giữ nguyên.
* Không đổi model, API, frontend, biến môi trường.

### Frontend
* Không đổi.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] `backend/tests/core-rules.test.ts` thêm `describe('extractPostTitle (Story 20.3)')` gồm đủ 7 dòng của bảng AC2 + ca tin 1 dòng + ca dòng > 120 ký tự.
* [ ] `npm test` và `npm run build` (backend) đạt.
* [ ] File ≤ 300 dòng, không `console.log`, không import thừa.
* [ ] Claude rà diff của Antigravity trước khi báo cáo; Project Owner thử dán tin mẫu trên điện thoại → tiêu đề đúng dòng đầu.
