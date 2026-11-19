# STORY 14.2: Siết Khử Trùng Tự Động Chống Gộp Nhầm (Strict Auto-Dedup)

**Bối cảnh:** Epic 14, phát hiện #3, #4, #5 trong đợt rà soát 20/11/2026.
Pipeline nhập tin tự động (Telegram / webhook / dán nhanh) **tự gộp** tin trùng mà không ai xác nhận. Hiện có 3 lỗ hổng:
* **Theo SĐT:** cùng SĐT và địa chỉ có chung **1 từ bất kỳ** dài hơn 2 ký tự là bị gộp (`dedup.service.ts:61-62`). Các từ "kiet", "van", "nguyen", "tran" không bị loại. Môi giới thường đăng nhiều căn với cùng một SĐT, nên căn mới bị nhét thành nguồn phụ của căn khác và biến mất khỏi Bảng hàng.
* **Theo ảnh:** ảnh trơn hoặc banner mẫu của môi giới có dHash giống nhau. Mỗi lần gộp, căn Master còn cộng thêm hash ảnh của nguồn phụ, nên càng lâu càng dễ gộp nhầm. Hàm so ảnh quét toàn bộ căn trong quận, không giới hạn.
* **Gộp vào căn đã hết trống:** tin mới báo "còn trống" bị gộp vào căn đang Đã cọc / Đã thuê mà không ai biết.

---

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý kho hàng.
* **Tôi muốn:** Bot chỉ tự gộp tin khi chắc chắn là cùng một căn, và báo tôi khi một căn đã cho thuê lại được đăng là còn trống.
* **Để:** Căn mới của cùng một môi giới không bị "nuốt" mất, và Bảng hàng phản ánh đúng tình trạng thị trường.

---

## 2. Tiền điều kiện (Pre-conditions)
* **Story 14.1 đã xong:** SĐT đã chuẩn hóa, so khớp theo SĐT chính xác.
* Đã có `streetKey` (Story 13.10, trong `similar-apartment.ts`), `ADDRESS_PLACEHOLDER` (`utils/street.ts`), `NotificationService.notifyManagers`.
* Áp dụng Phương án A của Story 14.3: thông báo gửi mọi Quản lý / ADMIN đang hoạt động.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Gộp theo SĐT phải cùng tên đường
* **Given** cùng SĐT, cùng quận, địa chỉ "Kiệt 12 Nguyễn Văn Thoại" và "Kiệt 5 Ngô Thì Sĩ"
* **Then** KHÔNG gộp, tạo căn mới.
* **Given** "K12/3 Nguyễn Văn Thoại" và "Nguyễn Văn Thoại, Mỹ An" cùng SĐT
* **Then** gộp làm nguồn phụ.
* **And** dùng chung quy tắc `streetKey` (bỏ số nhà, kiệt, hẻm, chữ "đường") với bộ 3 của Story 13.10.

### AC2 — Tin chưa có tên đường
* **Given** tin mới không có tên đường (`Đang cập nhật địa chỉ`) nhưng SĐT trùng căn đã có
* **Then** không tự gộp; tạo căn mới, gắn cờ `needsReview` với lý do "Có thể trùng căn của cùng SĐT — tin chưa có tên đường".

### AC3 — Bỏ qua ảnh không đặc trưng
* Ảnh có dHash quá đơn điệu (số bit 1 < 8 hoặc > 56 trên 64 bit, ví dụ ảnh một màu, nền trơn) không được lưu vào `imageHashes` và không được tính khi so trùng.
* Hash không đặc trưng đã lưu ở căn cũ cũng bị bỏ qua khi so.

### AC4 — Không tích lũy hash, giới hạn phạm vi so ảnh
* Gộp nguồn phụ **không** cộng thêm hash ảnh vào căn Master. Căn Master chỉ giữ hash ảnh của chính nó.
* So ảnh chỉ xét căn cập nhật trong **180 ngày** gần nhất và cùng quận (so khớp nguyên tên quận, không dùng chuỗi con).

### AC5 — Gộp vào căn đã hết trống
* **Given** căn Master đang `DEPOSITED` hoặc `RENTED`
* **When** pipeline tự động gộp một tin mới vào căn đó
* **Then** căn được gắn `needsReview = true` với lý do "Nguồn mới báo còn trống — kiểm tra trạng thái".
* **And** mọi Quản lý / ADMIN đang hoạt động nhận thông báo `SOURCE_AVAILABLE_AGAIN`. Bấm vào thì mở chi tiết căn.
* **And** chỉ báo khi căn chưa có cờ `needsReview`, để môi giới đăng lại nhiều lần không gây spam thông báo.
* **And** Quản lý tự chọn "gộp" khi duyệt tin CTV (Story 8.6 / 13.10) thì không áp dụng AC này.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/modules/dedup/street-key.ts` (mới):** chuyển `streetKey` và `STREET_STOPWORDS` từ `similar-apartment.ts` sang đây, thêm `sameStreet(a, b)` (bao hàm hai chiều). Tách file để tránh import vòng `similar-apartment` ↔ `dedup.service`.
* **`backend/src/modules/dedup/phash.util.ts`:** thêm `isInformative(hash)`, đếm số bit 1 trong khoảng 8–56.
* **`backend/src/modules/dedup/dedup.service.ts`:**
  - `checkDeterministicMatch(phone, street, district, excludeId?)`:
    - So `sameStreet(street, apt.location.street || apt.location.address)`.
    - Thay vòng lặp "chung 1 từ".
    - Quận so bằng tên chuẩn (`canonicalDistrict`), không dùng `includes`.
  - Thêm `hasPhoneOwner(phone)`, trả về true khi có căn mang SĐT đó, dùng cho AC2.
  - `runPipeline`:
    - Lọc `newImageHashes` bằng `isInformative`.
    - Tin không có `streetKey` và `hasPhoneOwner` → tạo căn mới, ghi đè `needsReview` / `reviewReason` sau `applyReviewPolicy`.
    - Sau khi gộp vào Master `DEPOSITED`/`RENTED` → gắn cờ và gọi `notifyManagers` (AC5).
  - `checkVisualMatch`:
    - Thêm điều kiện `updatedAt >= now − 180 ngày`.
    - Quận dùng regex neo `^…$` đã escape.
    - Bỏ qua hash không đặc trưng.
  - `aggregateSubListing`: bỏ đoạn cộng `newHashes` vào `master.imageHashes`. Bỏ luôn tham số `newHashes` khỏi chữ ký hàm và cập nhật nơi gọi trong `submission.service.ts`.
* **`backend/src/modules/dedup/similar-apartment.ts`:** import `streetKey` và `sameStreet` từ file mới. `findSimilarApartment` truyền `street` thay cho `address` vào `checkDeterministicMatch`.
* **`backend/src/modules/notifications/notification.model.ts`:** thêm `SOURCE_AVAILABLE_AGAIN` vào `NOTIFICATION_TYPES`.

### Frontend:
* **`frontend/src/api/notificationApi.ts`:** thêm `SOURCE_AVAILABLE_AGAIN` vào kiểu `type`.
* **`frontend/src/components/layout/NotificationBell.tsx`:** `SOURCE_AVAILABLE_AGAIN` mở chi tiết căn (giống `LISTING_FLAGGED`), dùng icon phù hợp từ lucide.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Kiểm thử hàm: `sameStreet` với các cặp ở AC1; `isInformative('0000000000000000')` = false, hash ảnh thật = true.
* [ ] API dán nhanh (bản local, có `GEMINI_API_KEY`):
  - 2 tin cùng SĐT khác đường → 2 căn.
  - 2 tin cùng SĐT cùng đường → 1 căn + 1 nguồn phụ.
  - Tin cùng SĐT không có địa chỉ → căn mới có cờ "Có thể trùng…".
  - Chuyển căn sang Đã thuê rồi dán lại tin trùng → căn có cờ + Quản lý nhận 1 thông báo. Dán lần nữa → không thêm thông báo.
* [ ] Duyệt tin CTV chọn "Gộp làm nguồn phụ" vẫn hoạt động như cũ.
* [ ] `tsc` 2 phía + build production không lỗi; dọn dữ liệu thử.
* [ ] Báo cáo và đề xuất commit, chờ duyệt.

---

## 6. Rủi ro & lựa chọn
* Siết điều kiện thì sẽ có một số tin trùng thật lọt thành căn mới (ví dụ tin ghi sai chính tả tên đường). Chấp nhận được, vì **tạo thừa còn sửa được** (Quản lý thấy và xóa), còn **gộp nhầm thì căn mất hẳn** khỏi Bảng hàng.
* `imageHashes` của các căn Master cũ đã tích lũy từ trước vẫn được giữ, story này không dọn. Có thể dọn bằng một script riêng nếu sau này thấy cần.
