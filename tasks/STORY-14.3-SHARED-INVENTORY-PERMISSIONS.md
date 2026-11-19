# STORY 14.3: Chung Kho — Mọi Quản Lý Sửa Được Mọi Căn (Shared Inventory Permissions)

**Bối cảnh:** Epic 14, phát hiện #6 trong đợt rà soát 20/11/2026. **Project Owner đã chốt Phương án A — Chung kho.**
Frontend coi mọi Quản lý là người có quyền với căn (`ApartmentsPage.tsx:237` truyền `isOwnerOrAdmin={isManager}`). Backend thì chỉ cho người tạo căn (`managerId`) hoặc ADMIN thao tác.
Tin cào từ Telegram đều gán cho tài khoản Quản lý / ADMIN tạo sớm nhất (`telegram.service.ts:145`). Vì vậy các Quản lý khác bấm Sửa, đổi trạng thái, gia hạn hợp đồng hay xử lý báo lỗi trên phần lớn kho đều nhận lỗi 403. Thông báo "căn bị báo lỗi" và "nhắc tái ký" cũng chỉ đến một người.

---

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý.
* **Tôi muốn:** Sửa, đổi trạng thái, gia hạn hợp đồng, quản lý nguồn phụ và xử lý báo lỗi trên **mọi căn** trong kho, kể cả căn bot cào hoặc căn Quản lý khác tạo.
* **Để:** Cả đội cùng chăm một kho hàng, không còn nút bấm báo 403, và kho căn cào không bị "kẹt" ở một tài khoản.

---

## 2. Tiền điều kiện (Pre-conditions)
* Đã có `isPrivilegedRole` (`apartment.model.ts`), `AuditService` (Story 13.3), `NotificationService.notifyManagers`.
* Frontend hiện **đã** hiện nút cho mọi Quản lý, nên chỉ cần sửa backend cho khớp. Không cần thêm cờ `canEdit` vào API.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Quản lý thao tác được mọi căn
* **Given** Quản lý B mở căn do Quản lý A tạo, hoặc căn bot Telegram cào
* **When** B sửa thông tin, đổi trạng thái (kèm hợp đồng khi Đã thuê), gia hạn hợp đồng, thêm / gỡ nguồn phụ, hoặc xóa căn
* **Then** thao tác thành công (không còn 403).
* **And** CTV vẫn không làm được các thao tác trên (403 như cũ, do `requireRoles`).

### AC2 — Vẫn truy vết được người làm
* Mọi thao tác ở AC1 đã ghi Audit Log theo **người thực hiện**: đổi trạng thái, đổi giá, xóa căn (Story 13.3). Story này giữ nguyên các bản ghi đó.
* Trường `managerId` giữ nghĩa "người tạo căn", không đổi khi người khác sửa.

### AC3 — Xử lý báo lỗi
* Mọi Quản lý / ADMIN xử lý được báo lỗi của mọi căn, cả trong chi tiết căn lẫn hàng đợi `/moderation`.
* Thẻ trong hàng đợi không còn hiện dòng "Chỉ Quản lý của căn được xử lý".

### AC4 — Thông báo đến cả đội
* **Căn bị báo lỗi** (≥ 2 người báo, `LISTING_FLAGGED`) → gửi mọi Quản lý / ADMIN đang hoạt động.
* **Nhắc tái ký** (`LEASE_EXPIRING`) → gửi mọi Quản lý / ADMIN đang hoạt động và CTV chốt căn (`lease.closedBy`). Mỗi người chỉ nhận 1 lần mỗi mốc.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/modules/apartments/apartment.service.ts`:** bỏ kiểm tra `user.role !== 'ADMIN' && apartment.managerId.toString() !== user.id` ở 6 hàm: `update`, `updateStatus`, `renewLease`, `addSubListing`, `removeSubListing`, `delete`. Route đã chặn bằng `requireRoles('ADMIN', 'MANAGER')`, nên không cần hàm quyền mới.
* **`backend/src/modules/reports/listing-report.service.ts`:**
  - `canResolve` → `isPrivilegedRole(actor.role)`.
  - `queue` vẫn trả `canResolve` (luôn `true` với Quản lý) để frontend cũ không lỗi.
  - `refreshFlag` dùng `NotificationService.notifyManagers` thay cho `notify` một người.
* **`backend/src/modules/jobs/lease-reminder.service.ts`:** người nhận = mọi Quản lý / ADMIN đang hoạt động (đọc 1 lần mỗi lượt quét) cộng `lease.closedBy`, bỏ trùng.
* Không đổi model, không đổi route.

### Frontend:
* **`frontend/src/pages/ApartmentsPage.tsx`, `components/apartment/ApartmentDetailModal.tsx`:** đổi tên prop `isOwnerOrAdmin` → `canManage` cho đúng nghĩa. Logic giữ nguyên: Quản lý / ADMIN = có quyền.
* **`frontend/src/components/admin/ModerationCard.tsx`:** giữ nhánh `!item.canResolve` (an toàn). Với Phương án A, nhánh này không còn xuất hiện với Quản lý.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] API (bản local, 2 tài khoản Quản lý A, B + 1 CTV):
  - B gọi `PUT`, `PATCH /status`, `PATCH /lease/renew`, `POST`/`DELETE /sub-listings`, `DELETE` trên căn của A → 200.
  - CTV gọi các API trên → 403.
  - Audit Log ghi tên B cho đổi trạng thái / đổi giá / xóa căn.
* [ ] Báo lỗi:
  - 2 CTV báo lỗi 1 căn của A → cả A và B nhận `LISTING_FLAGGED`.
  - B xử lý trong `/moderation` → 200.
* [ ] Nhắc tái ký: căn của A hết hạn trong 10 ngày → A, B và CTV chốt căn mỗi người nhận 1 thông báo.
* [ ] Puppeteer 390px: đăng nhập B → mở căn của A → đổi trạng thái thành công, không hiện lỗi.
* [ ] `tsc` 2 phía + build production không lỗi; dọn dữ liệu thử.
* [ ] Báo cáo và đề xuất commit, chờ duyệt.

---

## 6. Rủi ro & lựa chọn
* **Xóa căn:** theo Phương án A, mọi Quản lý xóa được mọi căn, có xác nhận và Audit Log `DELETE_APARTMENT`. Nếu muốn chặt hơn, có thể giữ quyền xóa riêng cho ADMIN và người tạo căn, rồi ẩn nút Xóa ở frontend với người khác. Đề xuất **không** làm lúc này để đội nhỏ thao tác nhanh; cần thì mở story riêng.
* Thông báo gửi cả đội nên tăng số thông báo tỉ lệ với số Quản lý. Đội ít Quản lý thì chấp nhận được. Khi đội lớn có thể chuyển sang Phương án B (gán người phụ trách) ở một Epic sau.
