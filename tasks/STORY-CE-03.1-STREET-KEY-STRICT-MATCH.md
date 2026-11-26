# STORY CE-03.1: So Khớp Tên Đường Chính Xác Cho Đường Đánh Số (Street Key Strict Match)

**Bối cảnh:** `docs/stories/coverEpic.md` (CE-03, AC1 — phát hiện A, D).
Đã kiểm tra trên `main` 56f34dc (đã có Story 19.4):
* `sameStreet('Mỹ An 22','Mỹ An 2')` = `false` → **đã đúng** (19.4 giữ số đuôi tên đường).
* Còn sai: `sameStreet('Mỹ An 22','Mỹ An')` = `true`, `sameStreet('Mỹ An 22','2 Mỹ An')` = `true` (vì `.includes` cho phép chứa nhau).
* `streetKey` chỉ cắt ở dấu `,` → `'Mỹ An 2 - Ngũ Hành Sơn'` → `my an 2 ngu hanh son`, `'Mỹ An 2 (gần biển)'` → `my an 2 gan bien`.
* `splitAddress('30/4 Hải Châu')` → `{houseNumber:'30/4', street:'Hải Châu'}`; `splitAddress('2 tháng 9')` → `{houseNumber:'2', street:'tháng 9'}`.
* **Rủi ro cao nhất:** `sameStreet` được dùng ở `DedupService.checkDeterministicMatch`, nơi luồng Telegram **tự gộp** căn (không có người xác nhận). Vì vậy trùng nhầm ở đây sẽ làm mất căn thật.

---

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý / CTV nhập căn ở các đường đánh số (Mỹ An 1…25, An Thượng 1…38).
* **Tôi muốn:** Hệ thống chỉ coi 2 địa chỉ là cùng đường khi tên đường giống hệt nhau, sau khi bỏ phần phụ (phường/quận, ghi chú).
* **Để:** Không bị báo trùng nhầm và không bị tự gộp nhầm căn từ Telegram.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story 19.4 và 19.12 đã có trên `main` (`streetKey` giữ số đuôi, có `backend/tests/core-rules.test.ts`).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — So khớp bằng nhau tuyệt đối
* **Given** 2 địa chỉ đã chuẩn hóa thành khóa đường
* **Then** `sameStreet` chỉ trả `true` khi 2 khóa **bằng nhau**, không còn so kiểu chứa nhau (`.includes`).

| a | b | Kết quả |
|---|---|---|
| Mỹ An 22 | Mỹ An 2 | false |
| Mỹ An 22 | Mỹ An | false |
| Mỹ An 22 | 2 Mỹ An | false |
| Mỹ An 22 | K12/3 Mỹ An 22 | true |
| Mỹ An 2 - Ngũ Hành Sơn | Mỹ An 2 | true |
| Mỹ An 2 (gần biển) | Mỹ An 2 | true |
| Nguyễn Văn Thoại Mỹ An | Nguyễn Văn Thoại | true |
| Đường An Thượng 1 | An Thượng 1, Ngũ Hành Sơn | true |
| Đang cập nhật địa chỉ | bất kỳ | false |

### AC2 — Bỏ phần phụ của địa chỉ
* **Then** `streetKey` cắt bỏ mọi thứ sau ký tự đầu tiên trong số `,` `-` `–` `(` `|`.
* **And** bỏ tên phường/quận **ở cuối chuỗi** theo từ điển (Mỹ An, Khuê Mỹ, Phước Mỹ, An Hải, Sơn Trà, Hải Châu, Ngũ Hành Sơn, Hòa Hải, Hòa Xuân, Thanh Khê, Liên Chiểu, Cẩm Lệ, Đà Nẵng, cùng các tiền tố `phường`/`p.`/`quận`/`q.`/`tp`), với 2 điều kiện:
  - phần còn lại sau khi bỏ **không rỗng** (`'Mỹ An'` đứng một mình vẫn giữ là `my an`);
  - tên phường **nằm ở cuối chuỗi**, không có số theo sau (`'Mỹ An 22'` không bị bỏ).

### AC3 — Đường mang tên ngày
* **Then** các đường `30/4`, `2/9`, `3/2`, `29/3` dù viết dạng `30/4`, `30-4`, `30 tháng 4` hay `đường 2 tháng 9` đều ra cùng một khóa (`30 thang 4`, `2 thang 9`…).
* **And** `splitAddress('30/4 Hải Châu')` → `{ houseNumber: '', street: '30/4' }` (vì sau `30/4` chỉ có tên quận), và `splitAddress('2 tháng 9')` → `{ houseNumber: '', street: '2 tháng 9' }`.
* **But** `splitAddress('30/4 Mỹ An 22')` vẫn → `{ houseNumber: '30/4', street: 'Mỹ An 22' }` (là số kiệt vì phía sau có tên đường thật).

### AC4 — Không vỡ luồng cũ
* **Then** toàn bộ test hiện có trong `core-rules.test.ts` vẫn đạt. Test nào phải đổi kỳ vọng (VD `'đường 30/4, Hải Châu'` không còn ra `'30 4'`) thì ghi rõ lý do trong PR.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend
* **`backend/src/modules/dedup/street-key.ts`:**
  - `sameStreet`: đổi thành `x === y`.
  - `streetKey`: cắt ở `/[,\-–(|]/`; chuẩn hóa ngày (`30/4`, `30-4` → `30 thang 4`) **trước** khi tách từ; bỏ hậu tố phường/quận theo AC2.
  - Từ điển phường/quận để ở file mới `backend/src/modules/dedup/area-suffix.ts` (~30 dòng) nếu `street-key.ts` dài quá 120 dòng. Dùng lại `ZONES` của `listing-taxonomy.ts` khi được.
  - Thêm comment tiếng Việt giải thích vì sao không bỏ tên phường đứng một mình hoặc có số theo sau.
* **`backend/src/utils/street.ts`:** `splitAddress` kiểm tra mẫu ngày ở đầu chuỗi. Nếu phần sau là rỗng, `tháng …` hoặc chỉ là tên quận/phường thì coi là tên đường, không tách thành số nhà.
* Không đổi schema, không thêm biến môi trường.

### Frontend
* Không đổi.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] `backend/tests/core-rules.test.ts` thêm đủ các dòng của bảng AC1 cùng các ca AC3.
* [ ] `npm test` (backend) đạt; `tsc --noEmit` không lỗi.
* [ ] File ≤ 300 dòng, không còn `console.log`.
