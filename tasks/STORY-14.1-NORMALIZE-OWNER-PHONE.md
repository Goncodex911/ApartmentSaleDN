# STORY 14.1: Chuẩn Hóa SĐT Chủ Nhà Từ Tin AI & Che Số Tuyệt Đối (Normalize & Always-Mask Owner Phone)

**Bối cảnh:** Epic 14, phát hiện #1 và #2 trong đợt rà soát 20/11/2026.
SĐT của form nhập tay đã được chuẩn hóa về `0xxxxxxxxx` (`vnPhone`). Nhưng SĐT do AI bóc từ tin Telegram / Zalo vẫn lưu nguyên văn (`gemini.service.ts:183`), ví dụ `0905.123.456` hoặc `+84 905 123 456`.
Có 2 hậu quả đã chạy thử xác nhận:
* Bộ che số (`apartment.service.ts:48`) chỉ khớp khi có 10 chữ số liền nhau. Vì vậy `0905.123.456` và `0905 123 456` **không bị che** và CTV thấy đủ SĐT chủ nhà, vi phạm Story 1.2.
* Khử trùng theo SĐT (`dedup.service.ts:34`) biến `+84 905…` thành `84905…`, không khớp với `0905…` trong DB, nên tin trùng được tạo thành căn mới.

---

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý / chủ hệ thống.
* **Tôi muốn:** Mọi SĐT chủ nhà, kể cả SĐT AI bóc từ tin cào, được lưu cùng một dạng `0xxxxxxxxx` và luôn bị che khi CTV xem.
* **Để:** Giữ đúng cam kết che dữ liệu (Story 1.2) và để khử trùng theo SĐT hoạt động.

---

## 2. Tiền điều kiện (Pre-conditions)
* Đã có `normalizeVnPhone` trong `backend/src/utils/validators.ts`.
* Đã có mẫu script chạy thử / ghi thật ở `backend/src/scripts/backfill-zone-type.ts`.
* Không cần cấu hình mới, không thêm thư viện.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Chuẩn hóa khi nhập tin AI
* **Given** tin đăng ghi SĐT `0905.123.456`, `0905 123 456`, `+84 905 123 456` hoặc `84905123456`
* **When** pipeline AI tạo căn mới hoặc gộp làm nguồn phụ
* **Then** `ownerContact.phone` của căn và của nguồn phụ đều lưu `0905123456`.

### AC2 — SĐT không hợp lệ
* **Given** AI trả chuỗi không phải SĐT Việt Nam hợp lệ sau khi chuẩn hóa (ví dụ `1900 1234`, `090512`)
* **Then** không lưu SĐT, căn được gắn cờ "Không tìm thấy số điện thoại đầu mối" như hiện tại.

### AC3 — Che số không phụ thuộc định dạng
* **Given** CTV mở căn (danh sách, chi tiết, căn phù hợp với khách, nguồn phụ) có SĐT ở bất kỳ định dạng nào, kể cả dữ liệu cũ chưa chuẩn hóa
* **Then** SĐT hiển thị `0905***456`, không bao giờ lộ đủ số.
* **And** chuỗi lạ không nhận dạng được thì chỉ giữ tối đa 4 chữ số đầu, phần còn lại là `***`.
* **And** Quản lý / ADMIN vẫn thấy SĐT đầy đủ (không đổi).

### AC4 — Khử trùng theo SĐT khớp mọi định dạng
* **Given** kho có căn SĐT `0905123456` ở đường Nguyễn Văn Thoại
* **When** tin mới mang `+84 905 123 456` cùng đường
* **Then** khử trùng Tầng 1 nhận ra trùng và gộp làm nguồn phụ.

### AC5 — Script chuẩn hóa dữ liệu cũ
* `npm run normalize-owner-phones` (mặc định **chạy thử**): in số căn đã quét, số SĐT sẽ đổi, số SĐT không hợp lệ (giữ nguyên, chỉ báo cáo) và 20 ví dụ đầu (SĐT in ra đã che).
* `npm run normalize-owner-phones -- --apply` mới ghi DB. Chuẩn hóa `ownerContact.phone` và mọi `subListings[].ownerContact.phone`, **không đổi `updatedAt`**.
* Chạy lại nhiều lần vẫn an toàn (lần 2 báo 0 thay đổi).
* ⚠️ Chỉ chạy `--apply` trên DB thật khi Project Owner đồng ý (WORKING_RULES §4).

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/utils/validators.ts`:** thêm `toVnPhone(raw): string | undefined`. Hàm gọi `normalizeVnPhone`, rồi trả về giá trị khi khớp `/^0[35789]\d{8}$/`, ngược lại `undefined`. Dùng chung cho AI, khử trùng và script.
* **`backend/src/utils/phone-text.ts`:** thêm `maskPhone(raw)`:
  - Hợp lệ sau chuẩn hóa → `0905***456`.
  - Không hợp lệ → giữ 4 chữ số đầu + `***`.
* **`backend/src/modules/ingestion/gemini.service.ts`:** `sanitizeResult` dùng `toVnPhone(ext.ownerContact?.phone) ?? ''`. Không có SĐT thì quy tắc gắn cờ hiện tại tự chạy.
* **`backend/src/modules/apartments/apartment.service.ts`:** `maskContact` dùng `maskPhone` cho căn và cho nguồn phụ.
* **`backend/src/modules/dedup/dedup.service.ts`:** `checkDeterministicMatch` dùng `toVnPhone(phone)`. Không hợp lệ thì trả `null`, thay cho `replace(/\D/g, '')` và kiểm tra độ dài.
* **`backend/src/scripts/normalize-owner-phones.ts` (mới):** viết theo khung `backfill-zone-type.ts` (`--apply`, `bulkWrite`, `timestamps: false`). Chỉ cập nhật căn có ít nhất 1 SĐT đổi giá trị.
* **`backend/package.json`:** thêm script `"normalize-owner-phones": "tsx src/scripts/normalize-owner-phones.ts"`.

### Frontend:
* Không đổi (frontend hiển thị chuỗi backend đã che).

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Kiểm thử hàm (chạy bằng `tsx` trong scratchpad, không thêm thư viện test):
  - `toVnPhone`: `0905.123.456`, `0905 123 456`, `+84 905 123 456`, `84905123456` đều ra `0905123456`; `1900 1234` ra `undefined`.
  - `maskPhone`: 4 dạng trên đều ra `0905***456`; `abc 123456789012` không lộ quá 4 chữ số.
* [ ] API (bản local):
  - Dán nhanh tin có SĐT `0905.123.456` → căn lưu `0905123456`.
  - Đăng nhập CTV mở căn đó và một căn cũ có SĐT dạng có dấu chấm → đều thấy `0905***456`.
  - Dán lại tin cùng đường với `+84 905 123 456` → gộp vào căn cũ (`isDuplicate: true`).
* [ ] Script: chạy thử trên DB local ra đúng số lượng; `--apply` xong chạy lại báo 0; `updatedAt` không đổi.
* [ ] `tsc` 2 phía không lỗi.
* [ ] Báo cáo và đề xuất commit, chờ duyệt. Hỏi Project Owner trước khi chạy script trên DB thật.

---

## 6. Rủi ro & lựa chọn
* SĐT cũ không hợp lệ (gõ thiếu số, tổng đài 1900) được **giữ nguyên** và chỉ báo cáo, không xóa. Quản lý sửa tay nếu cần. Bộ che số mới vẫn đảm bảo CTV không thấy các số này.
* Trước khi chạy script, có thể còn căn trùng SĐT chưa được gộp. Script **không** tự gộp các căn này, vì việc gộp cần người xác nhận (Story 13.10).
