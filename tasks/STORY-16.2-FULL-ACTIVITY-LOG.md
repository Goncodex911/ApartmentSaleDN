# STORY 16.2: Nhật Ký Hoạt Động Toàn Diện (Full Activity Log)

**Bối cảnh:** Epic 16. Hiện `audit_logs` (Story 13.3) chỉ ghi 11 hành động nhạy cảm và tự xóa sau 180 ngày bằng TTL index trên `createdAt`. Không ghi:
* đăng nhập / đăng xuất;
* tạo / sửa căn;
* tin CTV, báo lỗi, link chia sẻ;
* Admin đổi cấu hình hệ thống.

**Đã chốt (Q1):** nhật ký thường lưu **60 ngày**; nhật ký quan trọng / bảo mật lưu **180 ngày**.

---

## 1. Mô tả Story (User Story)
* **Là một:** Admin.
* **Tôi muốn:** Xem mọi thao tác thay đổi dữ liệu và mọi lần đăng nhập của tất cả người dùng, lọc theo người, nhóm, mức độ và khoảng thời gian.
* **Để:** Trả lời được "ai đã làm gì, lúc nào, từ thiết bị nào" khi có tranh chấp, sai sót hoặc rò rỉ.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story 16.1: khung Quản trị.
* `AuditService.log` (Story 13.3) ghi chạy nền; `auditActor(req)` lấy IP + thiết bị.
* Story 14.5: chặn đăng nhập sai bằng `rateLimit`.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Hành động được ghi
Giữ đủ 11 hành động cũ, thêm:

| Nhóm (`category`) | Hành động mới | Mức độ |
| :--- | :--- | :---: |
| AUTH | `LOGIN`, `LOGIN_FAILED` (SĐT che 3 số giữa), `LOGOUT`, `LOGIN_BLOCKED` (bị chặn vì thử quá nhiều) | Bảo mật (`LOGIN` = Thông thường) |
| INVENTORY | `CREATE_APARTMENT`, `UPDATE_APARTMENT` (chỉ **tên** các trường đã đổi + trước → sau, trừ `ownerContact`), `ADD_SUBLISTING`, `REMOVE_SUBLISTING`, `RENEW_LEASE`, `AI_IMPORT` (dán nhanh / extension) | Thông thường (`DELETE_APARTMENT` = Quan trọng) |
| SUBMISSION | `SUBMIT_LISTING`, `UPDATE_SUBMISSION`, `WITHDRAW_SUBMISSION`, `CREATE_REPORT`, `RESOLVE_REPORT` | Thông thường |
| SHARE | `CREATE_SHARE_LINK` | Thông thường |
| ADMIN | `UPDATE_SETTINGS` (trường → cũ / mới), `ADD_TELEGRAM_SOURCE`, `TOGGLE_TELEGRAM_SOURCE`, `REMOVE_TELEGRAM_SOURCE`, `EXPORT_AUDIT_CSV` | Quan trọng |

* Các hành động cũ được xếp nhóm như sau:
  * `UNMASK_OWNER_CONTACT` thuộc INVENTORY, mức **Bảo mật**.
  * `CHANGE_ROLE`, `CHANGE_USER_STATUS`, `RESET_PASSWORD`, `CHANGE_PASSWORD` thuộc nhóm ACCOUNT, mức **Bảo mật**.
  * Các hành động còn lại thuộc nhóm phù hợp, mức **Quan trọng**.
* Nhóm và mức độ được **suy ra từ tên hành động** trong 1 bảng tra cứu `ACTION_META`; nơi gọi `AuditService.log` không phải truyền thêm tham số.
* "Đặt vị trí trên bản đồ" (Story 15.7) được ghi trong `UPDATE_APARTMENT`, với trường `location.coordinates`.

### AC2 — Hạn lưu (không đụng index cũ trên Atlas)
* **Given** một mục nhật ký mức Thông thường
* **Then** mục có `expiresAt = createdAt + 60 ngày` và tự xoá nhờ TTL index mới trên `expiresAt`.
* **And** mục Quan trọng / Bảo mật **không có** `expiresAt`, nên bị xoá bởi TTL index cũ trên `createdAt` (180 ngày, mức trần).
* **And** **không xoá hay sửa** index `createdAt` hiện có trên Atlas. Dữ liệu cũ không cần di chuyển.

### AC3 — Không ghi dữ liệu nhạy cảm
* Không ghi: mật khẩu, mật khẩu tạm, token, nội dung chat của khách, ghi chú CRM, giá trị SĐT chủ.
* Không ghi thao tác chỉ đọc, trừ `UNMASK_OWNER_CONTACT` (giữ chống ghi trùng 10 phút như hiện tại).
* `LOGIN_FAILED` chỉ lưu SĐT đã che. Nếu SĐT không thuộc tài khoản nào thì `userId` để trống, nhưng vẫn ghi để phát hiện dò mật khẩu (Story 16.5).

### AC4 — Trang Nhật ký hoạt động `/admin/audit-logs`
* **Lọc:** nhóm, mức độ, người thực hiện (chọn từ danh sách thành viên), thời gian (Hôm nay · 7 ngày · 30 ngày · khoảng tự chọn), ô tìm theo tên người / tên căn.
* **Desktop:** dạng bảng gồm thời gian, người, vai trò, hành động, đối tượng, IP / thiết bị rút gọn ("iPhone · Safari").
* **Điện thoại:** dạng thẻ (giữ `AuditLogItem`).
* Bấm 1 mục mở `BottomSheet` chi tiết: danh sách trường đã đổi (trước → sau), IP, thiết bị đầy đủ.
* Đủ trạng thái: skeleton, lỗi + `[Thử lại]`, trống ("Không có hoạt động trong khoảng thời gian này"). Có "Tải thêm" phân trang.
* Bộ lọc lưu trên URL (query string): chia sẻ link và F5 giữ nguyên bộ lọc.

### AC5 — Xuất CSV
* `[Xuất CSV]` xuất theo bộ lọc hiện tại, **tối đa 10.000 dòng**, UTF-8 BOM như Story 13.4 để mở được bằng Excel tiếng Việt.
* Mỗi lần xuất được ghi `EXPORT_AUDIT_CSV` kèm bộ lọc và số dòng.

### AC6 — Ghi nhật ký chạy nền
* Lỗi ghi nhật ký không làm hỏng thao tác chính và không làm chậm API, giữ cách của 13.3.
* Đăng nhập sai vẫn trả lỗi 401 như cũ.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend
* **`backend/src/modules/audit/audit-log.model.ts`:**
  * Thêm hành động mới vào `AUDIT_ACTIONS`.
  * Thêm `category`, `severity`, `expiresAt?`.
  * `userId` không bắt buộc (cho `LOGIN_FAILED` với SĐT lạ).
  * `targetType` thêm `SETTINGS | SHARE_LINK | REPORT | AUTH`.
  * Index mới: `{ expiresAt: 1 }` với `expireAfterSeconds: 0`, `{ userId: 1, createdAt: -1 }`, `{ category: 1, createdAt: -1 }`.
  * **Giữ** index `{ createdAt: -1 }` TTL 180 ngày.
* **`backend/src/modules/audit/audit-actions.ts` (mới):** `ACTION_META: Record<AuditAction, { category, severity }>` và nhãn tiếng Việt dùng khi xuất CSV.
* **`backend/src/modules/audit/audit.service.ts`:**
  * `log()` tự gắn `category` / `severity` / `expiresAt`.
  * `list()` thêm lọc `category`, `severity`, `from`, `to`.
  * Thêm `exportCsv()`.
  * Nếu file vượt 250 dòng thì tách `audit-export.ts`.
* **`backend/src/modules/audit/audit.controller.ts`, `admin.routes.ts`:** `GET /admin/audit-logs/export`.
* **Điểm ghi mới:**
  * `auth.service.ts` / `auth.controller.ts`: `login`, `logout`.
  * `middlewares/rate-limit.ts` hoặc `auth.routes.ts`: gọi lại khi bị chặn (`LOGIN_BLOCKED`).
  * `apartment.service.ts`: `create`, `update` (so trường), `addSubListing`, `removeSubListing`, `renewLease`.
  * `dedup.service.ts` / ingestion: `AI_IMPORT`, chỉ khi có người thực hiện.
  * `submission.service.ts`, `listing-report.service.ts`, `share-link.service.ts`.
  * `system-config.service.ts`.
* **`backend/src/utils/user-agent.ts` (mới, ≤ 30 dòng):** rút gọn userAgent thành "Hệ điều hành · Trình duyệt" bằng regex, **không thêm thư viện**. Dùng chung cho Story 16.4.

### Frontend
* **`frontend/src/pages/AdminAuditLogsPage.tsx`:** bộ lọc mới, bảng (desktop) / thẻ (điện thoại), sheet chi tiết, xuất CSV. Tách `components/admin/AuditFilters.tsx` và `AuditDetailSheet.tsx` để mỗi file ≤ 250 dòng.
* **`frontend/src/api/adminApi.ts`** (hoặc file API admin hiện có): kiểu và tham số mới, gọi export.

### Ước lượng dung lượng
* Trung bình 1 mục khoảng 0,4KB. 50 thành viên × khoảng 80 thao tác ghi / ngày ≈ 4.000 mục / ngày.
* Mục Thông thường lưu 60 ngày, mục Quan trọng / Bảo mật (khoảng 10%) lưu 180 ngày: tổng ≈ 312.000 mục ≈ **125MB**, vượt mục tiêu 100MB.
* **Cách xử lý:** không ghi `LOGIN` khi làm mới token (refresh), chỉ ghi khi đăng nhập bằng mật khẩu. `UPDATE_APARTMENT` gộp các lần sửa liên tiếp của cùng người, cùng căn trong 2 phút thành 1 mục (giống chống trùng `UNMASK`).
* Đo thực tế bằng `collStats` sau 7 ngày chạy và báo cáo trong Story 16.8b.

---

## 5. Kiểm thử & Định nghĩa hoàn thành (DoD)
* [ ] Kiểm thử API trên DB test riêng:
  * mỗi nhóm hành động ghi đúng `category` / `severity` / `expiresAt`;
  * `LOGIN_FAILED` với SĐT lạ vẫn ghi, SĐT đã che;
  * `UPDATE_APARTMENT` không có giá trị SĐT chủ;
  * mật khẩu không xuất hiện ở bất kỳ mục nào.
* [ ] Index `createdAt` cũ trên DB test giữ nguyên; server khởi động không lỗi `IndexOptionsConflict`.
* [ ] Lọc theo khoảng thời gian, người, nhóm, mức độ đúng; CSV mở trong Excel không lỗi font, tối đa 10.000 dòng.
* [ ] Làm hỏng kết nối ghi nhật ký (giả lập lỗi) thì thao tác chính vẫn thành công.
* [ ] Giao diện ở 390px và 1280px đạt checklist ui-ux-pro-max.
* [ ] `tsc --noEmit` hai phía sạch, build frontend thành công.
