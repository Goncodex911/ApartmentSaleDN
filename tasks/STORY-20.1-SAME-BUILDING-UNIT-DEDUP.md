# STORY 20.1: Không Gộp Nhầm Căn Khác Nhau Cùng Tòa / Cùng Môi Giới (Same-Building Unit Dedup)

**Bối cảnh:** `docs/stories/EPIC_20_USER_FEEDBACK_INGESTION_MAP_FORM.md` (mục A, Story 20.1). Phản hồi người dùng 28/11/2026: dán tin `1BR … Address: My An 7` → báo "Tin trùng — đã gộp vào căn có sẵn".
Đã kiểm tra trên `main` ee1fdfe (`backend/src/modules/dedup/dedup.service.ts`, 297 dòng):
* **Tầng 1** `checkDeterministicMatch` (dòng 40–48): gộp khi cùng **SĐT** + cùng **quận** + cùng **tên đường**. **Không so** loại căn, số phòng ngủ, diện tích, tên tòa, số phòng.
* **Tầng 2** `checkVisualMatch` (dòng 60–96): gộp khi ≥ 2 ảnh trùng dHash. Ảnh **sảnh / hồ bơi chung tòa** dễ khớp giữa các căn khác nhau.
* Khi gộp (`mergeIntoMaster`), tin mới chỉ thành `subListings` → **giá, PN, m², ảnh của căn mới không lên Bảng hàng**.
* Model đã có `location.buildingName` (dòng 63) nhưng AI **chưa bóc**; chưa có trường số phòng / tầng.
* `dedup.service.ts` sát giới hạn 300 dòng → logic mới phải tách file.

**Độ khó:** Khó (thuật toán khử trùng, luồng bot tự gộp không có người xác nhận) — **Claude làm**.

---

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý kho hàng.
* **Tôi muốn:** Các căn khác nhau trong cùng tòa của cùng môi giới được lưu thành căn riêng, chỉ gộp khi thật sự là cùng một căn đăng lại.
* **Để:** Bảng hàng không mất căn, CTV gửi khách đúng căn, đúng giá.

---

## 2. Tiền điều kiện (Pre-conditions)
* CE-03 (khóa tên đường chính xác) đã có trên `main` (ee1fdfe).
* Story 20.3 nên làm trước (cùng sửa `gemini.prompt.ts` / `gemini.service.ts` — tránh xung đột).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — "Chữ ký căn" khác nhau thì không gộp (Tầng 1)
* **Given** căn A đã có (SĐT X, quận Ngũ Hành Sơn, đường "Mỹ An 7", Căn hộ, 1 PN, 45 m²)
* **When** nhập tin B cùng SĐT X, cùng quận, cùng đường
* **Then** kết quả theo bảng (hàm thuần `compareUnit(a, b)` trả `SAME` | `DIFFERENT` | `UNKNOWN`):

| B so với A | Kết quả | Hành động |
|---|---|---|
| Căn hộ, 1 PN, 45 m² (đăng lại, giá khác) | SAME | Gộp như hiện nay |
| Căn hộ, 1 PN, 48 m² (lệch ≤ 10%) | SAME | Gộp |
| Căn hộ, **2 PN**, 45 m² | DIFFERENT | Tạo căn mới |
| Căn hộ, 1 PN, **55 m²** (lệch > 10%) | DIFFERENT | Tạo căn mới |
| **Studio** (0 PN), 45 m² | DIFFERENT | Tạo căn mới |
| Căn hộ, 1 PN, 45 m², tòa **"Monarchy"** vs A tòa **"Sea View"** | DIFFERENT | Tạo căn mới |
| Căn hộ, 1 PN, 45 m², phòng **"P.502"** vs A **"P.803"** | DIFFERENT | Tạo căn mới |
| Căn hộ, 1 PN, **không ghi m²** (A có m²) | SAME (PN + loại khớp, thiếu m² một bên không phải lý do tách) | Gộp |
| Không ghi PN lẫn m² (AI trả mặc định) | UNKNOWN | xem AC3 |

* **And** **giá khác nhau không phải lý do tách** (môi giới hay đổi giá khi đăng lại).
* **And** tên tòa / số phòng chỉ dùng để tách khi **cả hai bên đều có** và khác nhau sau chuẩn hóa (bỏ dấu, hoa thường, tiền tố "P.", "phòng", "căn", "room").

### AC2 — Tầng 2 (trùng ảnh) cũng tôn trọng chữ ký căn
* **Given** tin B trùng ≥ 2 ảnh với căn A
* **When** `compareUnit(A, B) === 'DIFFERENT'`
* **Then** **không gộp**; xét tiếp căn ứng viên khác, hết ứng viên → tạo căn mới.

### AC3 — Chưa đủ dữ liệu để phân biệt → tạo mới + gắn cờ
* **Given** Tầng 1 khớp SĐT + quận + đường nhưng `compareUnit` = `UNKNOWN`
* **Then** **không tự gộp**: tạo căn mới với `needsReview = true`, `reviewReason = "Có thể trùng căn: <tiêu đề A>"` (tiêu đề đã che SĐT bằng `maskPhonesInText`).
* **And** kết quả trả thêm `possibleDuplicateOf: { _id, title }` (để Story 20.2 làm hộp chọn gộp / giữ riêng).
* **And** áp dụng cho mọi nguồn (dán nhanh, Telegram, webhook).

### AC4 — Nhiều căn ứng viên
* **Given** SĐT X có nhiều căn cùng đường (A: 1 PN, C: 2 PN)
* **When** tin B là 2 PN
* **Then** gộp vào **C** (căn đầu tiên trả `SAME`), không dừng ở căn đầu tiên khớp đường như hiện nay.

### AC5 — AI bóc tên tòa & số phòng
* **Then** prompt AI thêm 2 trường, **chỉ điền khi tin ghi rõ**, không đoán:
  - `buildingName`: tên tòa nhà / dự án (VD "Monarchy", "Sơn Trà Ocean View"), không có → null;
  - `unitLabel`: số phòng / số căn / tầng (VD "P.502", "tầng 8"), không có → null.
* **And** căn mới lưu `location.buildingName` (đã có) và `location.unitLabel` (**trường mới**, nội bộ — không hiện ở trang khách `/p/:slug` và bài chia sẻ).

### AC6 — Không đổi các luật khác
* **Then** tin không có tên đường vẫn đi luồng cũ (cờ "Có thể trùng căn của cùng SĐT").
* **And** Master đã cọc / đã thuê được đăng lại vẫn gắn cờ + báo Quản lý như cũ (chỉ khi `SAME`).
* **And** toàn bộ test hiện có vẫn đạt.

### AC7 — Script rà soát gộp nhầm cũ (chỉ đọc)
* **Given** chạy `npm run audit-unit-merge` (backend)
* **Then** in danh sách căn Master có `subListings` mà nội dung tin gốc (`rawContent`) bóc lại theo regex nhẹ (`\d+\s*(PN|BR|bedroom|phòng ngủ)`, `\d+\s*m2`) khác PN / m² của Master → nghi gộp nhầm, kèm mã căn + tiêu đề (đã che SĐT).
* **And** script **không ghi DB**, không gọi AI.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend
* **Tạo `backend/src/modules/dedup/unit-signature.ts`** (~70 dòng): kiểu `UnitSignature { propertyType?, bedrooms?, area?, buildingName?, unitLabel? }`; `compareUnit(a, b): 'SAME' | 'DIFFERENT' | 'UNKNOWN'` theo AC1; `unitOf(apartment)` / `unitOfParsed(ext)` lấy chữ ký từ document và từ kết quả AI. Comment tiếng Việt cho ngưỡng 10% m² và lý do bỏ qua giá.
  - Lưu ý: AI mặc định `bedrooms = 1` khi tin không ghi → cần biết PN có được **ghi trong tin** không. Thêm cờ `bedroomsStated` vào kết quả AI (prompt: true khi tin ghi rõ số PN / Studio / 1BR…); `UNKNOWN` khi cả `bedroomsStated = false` và thiếu m².
* **`backend/src/modules/dedup/dedup.service.ts`**:
  - `checkDeterministicMatch`: nhận thêm chữ ký căn, duyệt **mọi** ứng viên khớp SĐT + quận + đường, trả `{ match?: IApartment, uncertain?: IApartment }` theo AC1, AC3, AC4.
  - `checkVisualMatch`: bỏ qua ứng viên `DIFFERENT` (AC2) — cần `.select('imageHashes attributes location.buildingName location.unitLabel')`.
  - `runPipeline`: nhánh `uncertain` → tạo mới + cờ AC3, trả `possibleDuplicateOf`.
  - Tách phần **tạo căn mới** (dòng 179–260) sang `backend/src/modules/dedup/create-master.ts` để `dedup.service.ts` < 300 dòng.
* **`backend/src/modules/ingestion/gemini.prompt.ts`** + **`gemini.service.ts`**: thêm `buildingName`, `unitLabel`, `bedroomsStated` (prompt, ví dụ JSON, `IParsedApartmentData`, `sanitizeResult` — chuỗi rỗng → undefined, cắt 60 ký tự).
* **`backend/src/modules/apartments/apartment.model.ts`**: thêm `location.unitLabel?: string` (`{ type: String, trim: true }`). Không cần migration (căn cũ không có → coi như thiếu).
* **Che dữ liệu:** kiểm tra `public-listing.util.ts` và các formatter chia sẻ **không** xuất `unitLabel` (chỉ chọn trường cụ thể — xác nhận khi code).
* **Tạo `backend/src/scripts/audit-unit-merge.ts`** + script `audit-unit-merge` trong `backend/package.json` (AC7).
* Không thêm biến môi trường.

### Frontend
* Không đổi trong story này (hiển thị `possibleDuplicateOf` & hộp chọn ở Story 20.2). Kết quả "Tạo căn mới" hiện tại của `QuickPasteModal` vẫn hiển thị đúng.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] `backend/tests/core-rules.test.ts` thêm `describe('compareUnit (Story 20.1)')` đủ 9 dòng bảng AC1 + ca ảnh chung tòa (AC2 ở mức hàm thuần) + ca chuẩn hóa "P.502" = "phòng 502".
* [ ] `npm test`, `npm run build` (backend) đạt; `npm run build` (frontend) không lỗi.
* [ ] Chạy `npm run audit-unit-merge` trên DB thật, gửi Project Owner danh sách nghi gộp nhầm (không sửa DB).
* [ ] Thử thật: dán tin "1BR My An 7" và "2BR My An 7" cùng SĐT → 2 căn riêng; dán lại tin "1BR My An 7" đổi giá → gộp.
* [ ] Mọi file ≤ 300 dòng, không `console.log`, không import thừa; comment tiếng Việt ở luật so khớp.
