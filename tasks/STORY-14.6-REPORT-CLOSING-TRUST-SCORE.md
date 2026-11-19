# STORY 14.6: Báo Lỗi Tin Đóng Đúng Lúc & Điểm Tín Nhiệm Nhất Quán (Accurate Report Closing & Trust Score)

**Bối cảnh:** Epic 14, phát hiện #11 và #12 trong đợt rà soát 20/11/2026. Bổ sung cho `STORY-13.6-LISTING-MODERATION-QUEUE.md`.
* Lưu form sửa căn, dù chỉ sửa chính tả, sẽ tự đóng **mọi** báo lỗi đang mở và gỡ nhãn "Chờ xác minh" (`apartment.service.ts:125`). Ví dụ: báo lỗi "Không liên lạc được chủ" bị đóng dù chưa ai gọi lại chủ.
* Người báo đúng chỉ được +5 điểm khi Quản lý xử lý trong hàng đợi. Đổi trạng thái hay sửa giá ở chỗ khác thì người báo không được cộng điểm.
* Xóa căn không đóng báo lỗi. Các bản ghi mồ côi vẫn chiếm suất trong giới hạn 100 căn (`$limit: 100`) của hàng đợi, vì bước lọc căn đã xóa chạy **sau** bước giới hạn.

---

## 1. Mô tả Story (User Story)
* **Là một:** CTV báo lỗi tin / Quản lý xử lý báo lỗi.
* **Tôi muốn:** Báo lỗi chỉ được đóng khi Quản lý thật sự xử lý đúng vấn đề, và người báo đúng luôn được ghi công dù Quản lý xử lý ở màn hình nào.
* **Để:** Cơ chế báo lỗi đáng tin, CTV có động lực báo, hàng đợi luôn sạch.

---

## 2. Tiền điều kiện (Pre-conditions)
* Đã có `ListingReport`, `closeOpenReports` (`reports/report-closing.ts`), `ListingReportService.resolve`, `trustScore` / `canReport` (Story 13.6).
* Nên làm sau Story 14.3 (mọi Quản lý xử lý được báo lỗi).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Sửa form chỉ đóng báo lỗi liên quan
| Thay đổi khi lưu form | Báo lỗi được đóng (`RESOLVED`, +5 điểm) |
| :--- | :--- |
| Giá thuê khác giá cũ | `PRICE_CHANGED` |
| Danh sách ảnh khác ảnh cũ | `WRONG_PHOTOS` |
| SĐT hoặc tên chủ khác giá trị cũ | `UNREACHABLE` |
| Lý do còn lại (`RENTED`) hoặc chỉ sửa tiêu đề, mô tả, tiện ích… | Không đóng |
* **Given** căn có báo lỗi "Không liên lạc được chủ", **When** Quản lý chỉ sửa tiêu đề, **Then** báo lỗi vẫn mở và nhãn "Chờ xác minh" vẫn còn.

### AC2 — Nhãn "Chờ xác minh" tính lại theo báo lỗi còn mở
* Sau mọi lần đóng báo lỗi, nếu số người khác nhau còn báo (không tính người tạo căn) **< 2** thì gỡ `verification` và phát sự kiện real-time `apartment.flagged`. Còn ≥ 2 thì giữ nhãn và cập nhật danh sách lý do.
* Lưu form vẫn gỡ cờ `needsReview` của tin AI như hiện tại, vì Quản lý đã xem tin.

### AC3 — Cộng điểm nhất quán ở mọi lối xử lý
* Đổi trạng thái sang `DEPOSITED` / `RENTED` (nút trạng thái, LeaseSection, hàng đợi) → đóng **tất cả** báo lỗi `RESOLVED`, người báo +5.
* Hàng đợi "Sửa giá" → đóng tất cả báo lỗi của căn `RESOLVED`, +5 (Quản lý đã xử lý cả mục).
* Hàng đợi "Tin vẫn đúng" → `DISMISSED`; chọn "báo sai" thì −5, khóa quyền báo khi điểm < −15 (giữ như cũ).
* Không ai được cộng hai lần cho cùng một báo lỗi. Người xử lý không tự cộng / trừ điểm cho mình.

### AC4 — Xóa căn
* **Given** căn có báo lỗi đang mở, **When** xóa căn, **Then** các báo lỗi chuyển `DISMISSED`, không đổi điểm của ai.
* Hàng đợi chỉ tính căn còn tồn tại **trước** khi cắt 100 nhóm. Báo lỗi mồ côi có từ trước cũng không còn chiếm chỗ.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/modules/reports/report-closing.ts`:** gom toàn bộ logic đóng báo lỗi về đây.
  - `closeOpenReports(apartmentId, actorId, status, { reasons?: ReportReason[]; trustDelta?: number })`:
    - Chỉ đóng báo lỗi có lý do thuộc `reasons` (không truyền = tất cả).
    - Cộng / trừ `trustDelta` cho người báo khác `actorId`; điểm âm dưới ngưỡng thì khóa `canReport`.
    - Trả về danh sách người báo.
  - `refreshVerification(apartmentId)`: tính lại nhãn "Chờ xác minh" (AC2) và phát real-time khi trạng thái nhãn đổi. Chuyển phần tính nhãn từ `ListingReportService.refreshFlag` sang dùng hàm này.
* **`backend/src/modules/apartments/apartment.service.ts`:**
  - `update`:
    - Trước khi gán, ghi lại giá, ảnh, SĐT / tên chủ cũ; so sánh sau khi lưu để ra danh sách lý do cần đóng (AC1).
    - Bỏ `verification: undefined` khỏi `apartment.set(...)`, thay bằng `refreshVerification`.
    - Bỏ nhánh `else if (before.flagged)` phát sự kiện riêng, vì `refreshVerification` đã lo.
  - `updateStatus`: `DEPOSITED` / `RENTED` → `closeOpenReports(..., 'RESOLVED', { trustDelta: 5 })` rồi `refreshVerification`.
  - `delete`: `closeOpenReports(..., 'DISMISSED')` trước khi xóa.
* **`backend/src/modules/reports/listing-report.service.ts`:**
  - `resolve`:
    - `MARK_RENTED` đi qua `updateStatus`, đã cộng điểm ở đó nên không cộng lại.
    - `UPDATE_PRICE` gọi `update({ price })` rồi `closeOpenReports(..., 'RESOLVED', { trustDelta: 5 })` cho các báo lỗi còn mở.
    - `DISMISS` gọi `closeOpenReports(..., 'DISMISSED', { trustDelta: wrongReport ? -5 : 0 })`.
    - Trả về `{ reporters, trustDelta }` như cũ để frontend không đổi.
  - `queue`: thêm `$lookup` sang `apartments` và `$match` có căn **trước** `$limit: 100` (AC4).
  - Hằng `TRUST_STEP`, `TRUST_LOCK_BELOW` chuyển sang `report-closing.ts`.

### Frontend:
* Không đổi. `ListingHealthSection` và `ModerationCard` vẫn đọc cùng dữ liệu.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] API (bản local, 2 CTV báo lỗi cùng một căn):
  - Báo `UNREACHABLE` + `PRICE_CHANGED`, Quản lý sửa tiêu đề → cả 2 báo lỗi còn mở, nhãn còn.
  - Sửa giá → chỉ `PRICE_CHANGED` đóng, người báo +5; còn 1 người báo nên nhãn được gỡ.
  - Đổi trạng thái Đã thuê → mọi báo lỗi đóng, mỗi người báo +5 đúng một lần.
  - Xóa căn có báo lỗi mở → báo lỗi `DISMISSED`, điểm không đổi; `/reports` không còn căn đó.
  - Hàng đợi "Tin vẫn đúng" + "báo sai" → −5.
* [ ] Real-time: thẻ trên máy CTV khác mất nhãn "Chờ xác minh" khi nhãn được gỡ.
* [ ] `tsc` 2 phía không lỗi; dọn dữ liệu thử.
* [ ] Báo cáo và đề xuất commit, chờ duyệt.

---

## 6. Rủi ro & lựa chọn
* So sánh "ảnh khác" theo danh sách URL: chỉ đổi thứ tự ảnh cũng tính là đổi. Chấp nhận được vì đóng báo lỗi ảnh là hành động có lợi cho người báo.
* Báo lỗi lý do `RENTED` chỉ đóng khi đổi trạng thái. Nếu Quản lý gọi chủ và thấy căn vẫn trống thì dùng "Tin vẫn đúng" trong hàng đợi.
