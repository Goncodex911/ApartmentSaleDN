# STORY CE-03.4: Script Rà Soát Căn Bị Gộp / Đánh Dấu Trùng Nhầm (Numbered Street Audit Script)

**Bối cảnh:** `docs/stories/coverEpic.md` (CE-03, AC4).
Trước Story 19.4 và CE-03.1, luồng Telegram có thể đã **tự gộp** căn ở `Mỹ An 22` vào căn `Mỹ An` / `Mỹ An 2` (`checkDeterministicMatch` dùng `sameStreet` kiểu chứa nhau), hoặc gắn cờ "có thể trùng" sai. Cần một script chạy 1 lần để liệt kê các trường hợp nghi ngờ, cho Quản lý xử lý.

---

## 1. Mô tả Story (User Story)
* **Là một:** Chủ dự án.
* **Tôi muốn:** Có danh sách các căn có thể đã bị gộp / gắn trùng nhầm vì lỗi so tên đường.
* **Để:** Tách lại hoặc bỏ cờ trùng, không mất căn thật trong Bảng hàng.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story CE-03.1 đã xong (dùng `sameStreet` mới để so lại).
* Chủ dự án **tự chạy** script với `$env:MONGODB_URI` tạm trên máy mình (không dán URI vào chat / file).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Chạy thử mặc định (dry-run)
* **When** chạy `npm run audit-street-dedup`
* **Then** script **chỉ đọc**, in bảng: `_id`, tiêu đề, tên đường căn master, tên đường của nguồn đã gộp / căn bị gắn trùng, lý do nghi ngờ (`sameStreet` cũ = true, mới = false).
* **And** in tổng số dòng và ghi file `audit-street-dedup-<ngày>.csv` vào thư mục hiện tại. File này nằm trong `.gitignore` và không chứa SĐT đầy đủ (che còn 3 số cuối).

### AC2 — Áp dụng có kiểm soát (`--apply`)
* **When** chạy kèm `--apply`
* **Then** script chỉ **bỏ cờ "có thể trùng"** ở các căn sai. Script **không** tự tách nguồn đã gộp, vì việc đó cần người xem: những dòng này chỉ được liệt kê để Quản lý xử lý tay.
* **And** cập nhật bằng `updateOne(..., { timestamps: false })` để không đẩy căn lên đầu danh sách "mới cập nhật".
* **And** cuối script in số căn đã sửa.

### AC3 — An toàn
* **Then** không xóa document nào, không drop collection. Khi thiếu `MONGODB_URI` thì báo lỗi rõ ràng và thoát với mã ≠ 0.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend
* **`backend/src/scripts/audit-street-dedup.ts` (mới, ≤ 150 dòng):** theo mẫu `geocode-streets.ts` / `normalize-owner-phones.ts` (kết nối, đóng kết nối, `process.exit`).
  - Trước khi code, đọc `apartment.model.ts` và `dedup.service.ts` (`mergeIntoMaster`, cờ có thể trùng) để chốt **đúng tên trường** chứa nguồn đã gộp và cờ trùng. Nếu model không lưu tên đường của từng nguồn đã gộp thì chỉ rà phần cờ trùng và ghi giới hạn này vào báo cáo.
  - Giữ bản sao hàm so sánh cũ (`containsStreet`) **bên trong script** để so cũ với mới.
* **`backend/package.json`:** thêm script `"audit-street-dedup": "tsx src/scripts/audit-street-dedup.ts"`.
* **`.gitignore`:** thêm `audit-street-dedup-*.csv`.
* **`EXTERNAL_CONFIG.md`:** thêm 1 mục ngắn cách chạy (giống hướng dẫn `geocode-streets`).

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Chạy dry-run trên DB local có dữ liệu mẫu (`Mỹ An 22` gắn trùng với `Mỹ An`) → có đúng 1 dòng.
* [ ] `--apply` bỏ cờ, `updatedAt` không đổi.
* [ ] `tsc --noEmit` không lỗi.
* [ ] Chủ dự án tự chạy dry-run trên DB thật, xem CSV rồi mới quyết định `--apply`.
