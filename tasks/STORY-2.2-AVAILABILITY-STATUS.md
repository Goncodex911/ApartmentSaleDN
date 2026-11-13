# STORY-2.2: Quản lý Trạng thái Vòng đời Căn hộ (Listing Status & 1-Click Availability)

## 1. Mô tả Story (User Story)
* **Là một:** Cộng tác viên (CTV) hoặc Quản lý kho hàng (Manager).
* **Tôi muốn:** Biết chính xác thời gian thực căn hộ đang ở trạng thái nào (Trống ở ngay, Sắp trống từ ngày X, Đang giữ cọc, hoặc Đã cho thuê) và Quản lý có thể cập nhật trạng thái chỉ bằng 1 thao tác click nhanh.
* **Để:** CTV không tốn thời gian tư vấn nhầm những căn đã hết phòng, và Quản lý kịp thời mở bán lại các căn sắp chuyển đi.

---

## 2. Tiền điều kiện (Pre-conditions)
1. **[STORY-2.1](file:///d:/CODE/AppartmentSaleProject/tasks/STORY-2.1-APARTMENT-CRUD.md)** đã hoàn thành: Schema căn hộ đã có trường `status` và `availableDate`.
2. Token xác thực JWT của Quản lý / Admin hoặc CTV.

---

## 3. Tiêu chí Chấp nhận (Acceptance Criteria - Gherkin)

### AC1: Bộ 4 trạng thái phòng rõ ràng
* **Given:** Căn hộ trong hệ thống.
* **Then:** Chỉ được thuộc một trong 4 trạng thái sau:
  * `AVAILABLE`: Trống ở ngay.
  * `UPCOMING`: Sắp trống (Bắt buộc đính kèm ngày dự kiến khách cũ dọn đi `availableDate`).
  * `DEPOSITED`: Đang giữ cọc (Đang chờ khách ký hợp đồng hoặc dọn vào).
  * `RENTED`: Đã cho thuê thành công (Phòng đã có khách ở).

### AC2: Cập nhật nhanh 1-Click trạng thái phòng (`PATCH /:id/status`)
* **Given:** Quản lý đang xem danh sách bảng hàng và muốn đổi nhanh trạng thái phòng (ví dụ: chuyển từ `AVAILABLE` sang `DEPOSITED` hoặc `RENTED`).
* **When:** Gửi request `PATCH /api/v1/apartments/:id/status` với body: `{ status: "DEPOSITED" }`.
* **Then:** 
  * Hệ thống cập nhật trạng thái trong MongoDB ngay lập tức (không cần gửi lại toàn bộ dữ liệu căn hộ).
  * Trả về HTTP 200 kèm trạng thái mới.

### AC3: Tự động ẩn căn đã thuê (`RENTED`) khỏi bảng hàng của CTV
* **Given:** Người dùng là CTV (hoặc khách vãng lai) truy cập bảng hàng `GET /api/v1/apartments`.
* **When:** Không chỉ định tham số lọc `status` cụ thể.
* **Then:**
  * Hệ thống mặc định **loại trừ các căn có trạng thái `RENTED`**.
  * Chỉ hiển thị các căn `AVAILABLE`, `UPCOMING` và `DEPOSITED` để CTV tập trung tư vấn.

### AC4: Quản lý kiểm soát toàn bộ kho phòng (kể cả căn đã thuê)
* **Given:** Quản lý hoặc Admin truy cập bảng hàng.
* **When:** Muốn xem lại các căn `RENTED` để theo dõi ngày hết hạn hợp đồng.
* **Then:** Quản lý có thể truyền `?status=RENTED` hoặc `?status=ALL` để xem đầy đủ 100% kho phòng.

### AC5: Ràng buộc trạng thái `UPCOMING`
* **Given:** Quản lý cập nhật trạng thái sang `UPCOMING`.
* **When:** Không truyền trường `availableDate` (ngày dự kiến trống).
* **Then:** Hệ thống báo lỗi HTTP 400: *"Vui lòng chọn ngày dự kiến phòng sẽ trống"*.

---

## 4. Phạm vi Kỹ thuật (Technical Implementation Scope)

### A. Backend Files cần triển khai:
1. `backend/src/modules/apartments/apartment.validation.ts`:
   * Bổ sung Zod schema: `updateStatusSchema`:
     ```typescript
     export const updateStatusSchema = z.object({
       status: z.enum(['AVAILABLE', 'UPCOMING', 'DEPOSITED', 'RENTED']),
       availableDate: z.string().datetime().optional().or(z.date().optional()),
     }).refine(
       (data) => (data.status === 'UPCOMING' ? !!data.availableDate : true),
       { message: 'Vui lòng chọn ngày dự kiến phòng sẽ trống khi chuyển sang trạng thái Sắp trống' }
     );
     ```
2. `backend/src/modules/apartments/apartment.service.ts`:
   * Bổ sung hàm: `updateStatus(id: string, status: string, availableDate: Date | undefined, user: { id: string; role: string })`.
   * Cập nhật hàm `findAll`: Tự động ẩn căn `RENTED` nếu người gọi là `COLLABORATOR` hoặc chưa đăng nhập (trừ khi có chỉ định cụ thể từ Quản lý).
3. `backend/src/modules/apartments/apartment.controller.ts`:
   * Bổ sung controller: `updateStatus(req, res, next)`.
4. `backend/src/modules/apartments/apartment.routes.ts`:
   * Khai báo endpoint: `PATCH /:id/status` với `authMiddleware`, `requireRoles('ADMIN', 'MANAGER')`.

---

## 5. Danh sách Kiểm thử & Định nghĩa Hoàn thành (Definition of Done)
- [ ] Endpoint `PATCH /api/v1/apartments/:id/status` cập nhật trạng thái tức thì trong 1 request nhẹ.
- [ ] Ràng buộc nghiệp vụ: Báo lỗi nếu chọn `UPCOMING` mà không có `availableDate`.
- [ ] Kiểm thử tự động:
  - Căn hộ có status `RENTED` tự động biến mất khỏi kết quả tìm kiếm của CTV.
  - Quản lý vẫn có thể truy vấn các căn `RENTED` bình thường.
- [ ] TypeScript build check (`npm run build`) hoàn tất 0 lỗi.
- [ ] Tuân thủ [WORKING_RULES.md](file:///d:/CODE/AppartmentSaleProject/WORKING_RULES.md): Không tự ý chạy lệnh git nếu chưa được phép.

