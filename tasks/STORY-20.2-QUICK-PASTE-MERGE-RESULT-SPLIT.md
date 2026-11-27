# STORY 20.2: Màn Kết Quả Nhập Tin — Thấy Căn Bị Gộp & Tách Thành Căn Mới (Quick Paste Merge Result & Split)

**Bối cảnh:** `docs/stories/EPIC_20_USER_FEEDBACK_INGESTION_MAP_FORM.md` (mục A, Story 20.2).
Đã kiểm tra trên `main` ee1fdfe:
* `QuickPasteModal.tsx` (128 dòng) gọi `ingestionApi.quickPaste` (dòng 37), kết quả trùng chỉ hiện `result.message` ("Đã phát hiện trùng lặp theo SĐT & Địa chỉ…"), **không nói căn nào**, không có nút hoàn tác.
* `DedupService` nhánh trùng đã trả `masterApartmentId` + `apartment: { _id, title }` (`masterSummary`, Story 19.2) và `matchType` (`DETERMINISTIC` | `IMAGE_PHASH`).
* `DuplicateConfirmDialog.tsx` có sẵn (props `onConfirmCreate`, `onViewExisting`, `onCancel`).
* Nguồn phụ được thêm bằng `aggregateSubListing` (push vào `master.subListings`, có `rawContent`).

**Độ khó:** Trung bình (đụng dữ liệu kho + quyền) — **Claude làm**.

---

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý / CTV dán tin bằng "Nhập tin bằng AI".
* **Tôi muốn:** Biết tin của tôi bị gộp vào căn nào, vì sao, và đổi lại được nếu hệ thống gộp sai.
* **Để:** Không mất căn và không phải nhờ Admin sửa dữ liệu.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story 20.1 đã xong (kết quả có `possibleDuplicateOf`, nhánh `UNKNOWN` tạo căn mới + cờ).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Hiện căn đã gộp
* **Given** dán tin và kết quả là "Tin trùng — đã gộp"
* **Then** khung kết quả hiện: ảnh đại diện + tiêu đề + giá của căn Master, lý do bằng lời ("Cùng SĐT & tên đường, cùng 1 PN / 45 m²" hoặc "Trùng 3 ảnh"), nút **Xem căn** mở chi tiết căn Master.
* **And** backend trả thêm `apartment.images[0]`, `apartment.price`, `matchReason` (không trả SĐT chủ).

### AC2 — Tách nguồn vừa gộp thành căn mới
* **Given** kết quả gộp đang hiển thị
* **When** bấm **"Không phải căn này — tạo căn mới"** và xác nhận
* **Then** `POST /api/v1/ingestion/split` với `{ masterId, subListingId }`: xóa nguồn phụ đó khỏi Master, tạo căn mới bằng cách **chạy lại AI trên `rawContent`** của nguồn phụ và **bỏ qua khử trùng** (dùng lại hàm tạo căn của Story 20.1 `create-master.ts`), trả căn mới.
* **And** ghi Nhật ký `AI_IMPORT` với `{ split: true, fromMasterId }`.
* **And** chỉ **người đã nhập nguồn đó** (so `managerId` / người thực hiện được lưu ở nguồn phụ — thêm trường `createdBy` vào subListing) hoặc **Quản lý / Admin** được tách; người khác → 403.

### AC3 — Căn "có thể trùng" (từ Story 20.1)
* **Given** kết quả có `possibleDuplicateOf`
* **Then** hiện căn mới vừa tạo + dòng "Có thể trùng căn <A>" với 2 nút: **Giữ là căn riêng** (bỏ cờ `needsReview`) / **Gộp vào căn A** (căn mới chuyển thành nguồn phụ của A, căn mới bị **xóa mềm** qua `soft-delete.ts`).
* **And** 2 thao tác đều qua API có kiểm quyền như AC2.

### AC4 — Trạng thái & điện thoại
* **Then** mọi nút có trạng thái đang xử lý / lỗi rõ ràng, cao ≥ 44px, không bấm 2 lần.
* **And** tách / gộp thành công → danh sách căn tự cập nhật (SSE `apartment.created` / `apartment.updated` đã có).

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend
* **`backend/src/modules/dedup/dedup.service.ts`**: trả thêm `matchReason`, `subListingId` của nguồn vừa thêm; `aggregateSubListing` lưu `createdBy`.
* **Tạo `backend/src/modules/dedup/merge-actions.service.ts`**: `splitSubListing(masterId, subListingId, actor)`, `keepSeparate(apartmentId, actor)`, `mergeInto(apartmentId, targetId, actor)`.
* **`backend/src/modules/ingestion/ingestion.controller.ts`** + `ingestion.routes.ts` + `ingestion.validation.ts` (Zod): 3 route `POST /ingestion/split`, `/ingestion/keep-separate`, `/ingestion/merge-into`.
* **`apartment.model.ts`**: `subListings[].createdBy?: ObjectId`.

### Frontend
* **`frontend/src/api/ingestionApi.ts`**: 3 hàm mới.
* **`frontend/src/components/apartment/QuickPasteModal.tsx`**: khung kết quả theo AC1, AC3; tách component con `MergeResultCard.tsx` (giữ file < 200 dòng).
* Tái dùng `DuplicateConfirmDialog` cho bước xác nhận nếu props phù hợp, không thì dùng hộp xác nhận chung đang có.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Test hàm thuần quyền tách / gộp (người nhập, Quản lý, CTV khác).
* [ ] `npm test`, `npm run build` backend + frontend đạt.
* [ ] Thử thật trên điện thoại: dán tin bị gộp → thấy căn → tách → có 2 căn; dán tin "có thể trùng" → gộp → còn 1 căn, căn tạm vào thùng rác.
* [ ] File ≤ 300 dòng, không `console.log`.
