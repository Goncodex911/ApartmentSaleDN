# STORY 16.7: Thùng Rác Căn Hộ & Dọn Kho Tồn (Recycle Bin & Stale Inventory)

**Bối cảnh:** Epic 16. `ApartmentService.delete` hiện gọi `apartment.deleteOne()`, tức là **xoá vĩnh viễn**: xoá nhầm là mất.
* Có **14 module** đọc trực tiếp collection `apartments` qua `find` / `aggregate`: admin, broker-performance, apartment, chat, dedup, similar-apartment, lease-reminder, lead, listing-report, map-pins, search, share-link, submission-cleanup, submission.
* Ngoài ra có 3 script.
* Sửa tay từng chỗ rất dễ sót.

**Đã chốt (Q3):** giữ trong thùng rác **30 ngày**; chỉ Admin khôi phục / xoá vĩnh viễn; Quản lý vẫn xoá được (vào thùng rác).

**Đã chốt thêm:**
* Căn chốt đã vào thùng rác **vẫn tính** vào bảng xếp hạng CTV.
* Tin mới trùng với căn trong thùng rác thì **tạo căn mới**, không tự khôi phục căn cũ.

---

## 1. Mô tả Story (User Story)
* **Là một:** Admin.
* **Tôi muốn:** Khôi phục được căn bị xoá nhầm và dọn các căn lâu không cập nhật.
* **Để:** Không mất dữ liệu vì thao tác nhầm và giữ Bảng hàng sạch.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story 14.6: `closeOpenReports` khi xoá căn.
* Story 8.6: cơ chế dọn ảnh Cloudinary.
* Story 11.5: việc hằng ngày chạy khi có người mở app lần đầu trong ngày (`daily-jobs.ts`, khoá `job_runs`).
* Story 16.1: khung Quản trị. Story 16.2: nhật ký.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Xoá mềm
* **Given** Quản lý / Admin xoá 1 căn
* **Then** căn có `deletedAt`, `deletedBy`, không bị xoá khỏi DB.
* **And** căn **biến mất** khỏi:
  * Bảng hàng, tìm kiếm thường và Atlas Search;
  * ghim bản đồ (kể cả chế độ khu vực / bbox của 15.3);
  * ghép khách, chat gợi ý;
  * căn tương tự / chống trùng;
  * nhắc tái ký;
  * thống kê kho ở Tổng quan.
* **And** link chia sẻ của căn hiện trang "Tin này không còn hiệu lực" (giữ giao diện hết hạn hiện có).
* **And** báo lỗi đang mở được đóng như hiện tại (14.6). Khôi phục căn **không** mở lại báo lỗi cũ.

### AC2 — Lọc chung ở tầng dữ liệu, không sửa từng chỗ
* Bộ lọc `deletedAt: null` được gắn **tự động** cho mọi truy vấn `find` / `findOne` / `count` / `update` / `aggregate` của model `Apartment`.
* Với `aggregate` có `$search` (Atlas Search) hoặc `$geoNear` (phải đứng đầu pipeline), `$match` được chèn **ngay sau** stage đầu.
* Chỉ những nơi đánh dấu rõ (option `{ withDeleted: true }`) mới thấy căn đã xoá:
  * trang Thùng rác;
  * việc dọn thùng rác;
  * `broker-performance` (để căn chốt vẫn được tính).

### AC3 — Trang Thùng rác `/admin/trash`
* Thêm mục "Thùng rác" vào `adminNav` (nằm trong mục "Thêm" trên điện thoại).
* Danh sách gồm: tiêu đề căn, giá, khu vực, người xoá, thời điểm xoá, **số ngày còn lại** (30 − số ngày đã qua). Mới xoá nhất ở đầu, phân trang.
* `[Khôi phục]` đưa căn về đúng trạng thái trước khi xoá và hiện lại ở mọi nơi.
* `[Xoá vĩnh viễn]` có xác nhận ghi rõ "không thể hoàn tác", xoá căn và dọn ảnh Cloudinary.
* Chỉ ADMIN gọi được 2 API này (403 với Quản lý).
* Thùng rác trống thì hiện "Thùng rác trống".

### AC4 — Tự dọn sau 30 ngày
* Việc hằng ngày (`daily-jobs.ts`) xoá vĩnh viễn căn có `deletedAt` quá 30 ngày và dọn ảnh Cloudinary.
* Mỗi lần chạy tối đa 50 căn để không treo request mở app.

### AC5 — Kho tồn `/admin/stale`
* Danh sách căn đang chào (`AVAILABLE` / `UPCOMING`) **không cập nhật > 30 ngày** (`updatedAt`). Lọc được theo khu vực, người tạo, số ngày (30 / 60 / 90).
* Chọn nhiều căn để thao tác hàng loạt:
  * `[Chuyển Sắp trống]`;
  * `[Đánh dấu cần kiểm tra]` (dùng cờ `needsReview` sẵn có);
  * `[Xoá]` (vào thùng rác).
* Mỗi thao tác có xác nhận ghi số căn. Mỗi lần tối đa 100 căn.
* Mỗi căn được ghi 1 mục nhật ký riêng (16.2).
* **Lưu ý:** xoá hàng loạt **không** kích hoạt cảnh báo `MASS_DELETE` (16.5) khi người thực hiện là Admin dùng chức năng Kho tồn. Dùng cờ `bulk: true` trong `details`.

### AC6 — Nhật ký
* Ghi `DELETE_APARTMENT` (vào thùng rác), `RESTORE_APARTMENT`, `PURGE_APARTMENT` (vĩnh viễn, tay hoặc tự động) và các thao tác hàng loạt của Kho tồn.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend
* **`backend/src/modules/apartments/apartment.model.ts`:**
  * Thêm `deletedAt?: Date` (index), `deletedBy?: ObjectId`, `statusBeforeDelete?`.
  * Thêm plugin / middleware `pre(['find', 'findOne', 'countDocuments', 'updateOne', 'updateMany', 'findOneAndUpdate'])` và `pre('aggregate')` gắn bộ lọc, trừ khi `this.getOptions().withDeleted`.
* **`backend/src/modules/apartments/soft-delete.ts` (mới):** plugin trên và hàm chèn `$match` đúng vị trí cho aggregate.
* **`apartment.service.ts`:** `delete()` đổi sang xoá mềm; thêm `restore()`, `purge()`.
* **`backend/src/modules/apartments/trash.service.ts` (mới):** `listTrash`, `purgeExpired` (gọi từ `daily-jobs.ts`), `listStale`, `bulkStale(action, ids, actor)`.
* **`broker-performance.service.ts`:** thêm `withDeleted`.
* **`share-link.service.ts`:** căn đã xoá thì trả "không còn hiệu lực". Hiện tại căn mất hẳn cũng đi qua nhánh này nên kiểm tra lại cho chắc.
* **Index:** `{ deletedAt: 1 }` (sparse) và `{ status: 1, updatedAt: 1 }` cho Kho tồn.
* **Atlas Search:** không cần đổi index search; bộ lọc chạy bằng `$match` sau `$search`.
* **Routes (ADMIN):**
  * `GET /admin/trash`;
  * `POST /admin/trash/:id/restore`;
  * `DELETE /admin/trash/:id`;
  * `GET /admin/stale`;
  * `POST /admin/stale/bulk`.

### Frontend
* **`frontend/src/pages/AdminTrashPage.tsx`, `AdminStalePage.tsx` (mới):** desktop dạng bảng có ô chọn, điện thoại dạng thẻ có chế độ chọn nhiều. Khi đang chọn, thanh thao tác hàng loạt dính ở đáy (≥ 44px, chừa safe-area).
* **`adminNav.ts`:** mục Thùng rác, Kho tồn.
* **Xác nhận xoá ở form / chi tiết căn:** đổi chữ thành "Chuyển căn vào thùng rác? Admin có thể khôi phục trong 30 ngày".

---

## 5. Kiểm thử & Định nghĩa hoàn thành (DoD)
* [ ] **Kiểm thử hồi quy từng nơi** (DB test). Căn đã xoá không xuất hiện ở:
  * danh sách;
  * tìm kiếm thường;
  * tìm kiếm bản đồ theo điểm mốc;
  * bbox;
  * ghép khách;
  * chat gợi ý;
  * căn tương tự / chống trùng tin mới;
  * nhắc tái ký;
  * dashboard-stats;
  * link chia sẻ;
  * `findById` trong sửa / đổi trạng thái (trả 404).
* [ ] Bảng xếp hạng CTV vẫn tính căn chốt đã xoá.
* [ ] Khôi phục thì căn về đúng trạng thái cũ; báo lỗi cũ không mở lại.
* [ ] Dọn tự động xoá căn quá 30 ngày, giữ căn 29 ngày.
* [ ] Quản lý gọi API khôi phục / xoá vĩnh viễn thì nhận 403.
* [ ] Hàng loạt 100 căn chạy xong < 5 giây và có đủ 100 mục nhật ký.
* [ ] `tsc --noEmit` hai phía sạch, build frontend thành công. Giao diện đạt checklist ở 390px / 1280px.
