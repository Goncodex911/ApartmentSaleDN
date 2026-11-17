# STORY 8.1: Sửa lỗi & khóa quyền luồng nhập tin (Epic 8)

**Bối cảnh:** Rà soát chức năng nhập tin theo feedback khách (xem `docs/stories/EPIC_08_LISTING_UPLOAD_FEEDBACK.md`, mục B)
phát hiện lỗi phân quyền ở API nhập tin và nhiều lỗi ở form thêm/sửa căn trên điện thoại.

## User Story
Là **Quản lý / Admin**, tôi muốn luồng nhập tin không lưu dữ liệu giả, dùng tốt trên điện thoại và chỉ người có quyền mới tạo được căn,
để kho căn hộ luôn đúng và an toàn.

## Acceptance Criteria
1. **Khóa quyền:** `/ingestion/parse`, `/process-listing`, `/extension-import`, `/quick-paste` chỉ cho `MANAGER`, `ADMIN`
   (CTV gọi → 403). Các cổng dùng webhook secret giữ nguyên.
   (`/parse` không lưu DB nhưng tốn hạn mức Gemini và frontend không có chỗ nào cho CTV dùng.)
2. **Không điền sẵn dữ liệu giả:** diện tích, phí điện/nước/dịch vụ, mức hoa hồng để trống; thang máy, PCCC mặc định không chọn;
   số phòng ngủ và nội thất **bắt buộc chọn** (không mặc định 1 PN / Full nội thất).
3. **Xóa trắng ô khi sửa căn → gỡ thật:** frontend gửi `null` cho ô tùy chọn bị xóa; backend chấp nhận `null` ở các trường
   không bắt buộc và xóa trường đó (`$unset`). Trường bắt buộc vẫn không nhận `null`.
4. **Xóa ảnh trên điện thoại:** nút xóa luôn hiện (không phụ thuộc rê chuột), vùng bấm 44px, có `aria-label`.
5. **Form chuẩn điện thoại:** toàn màn hình trên điện thoại; chữ ô nhập 16px (iPhone không tự phóng to); ô nhập & nút cao 44px;
   bàn phím số cho ô số, bàn phím điện thoại cho ô SĐT; nút Lưu ghim cuối màn hình, tránh huy hiệu Netlify.
6. Bỏ ví dụ Hà Nội trong ô gợi ý; thêm tiện ích Ban công vào form (đang có ở bộ lọc nhưng không nhập được).

## Giải pháp kỹ thuật
- `ingestion.routes.ts`: thêm `requireRoles('ADMIN', 'MANAGER')`.
- `utils/validators.ts` `toPatchSchema`: trường tùy chọn trong schema tạo mới → `nullable()` trong schema sửa.
- `ApartmentService.update`: `null` → gán `undefined` (Mongoose tự `$unset`).
- Frontend: `components/apartment/formFields.tsx` (ô nhập, nhãn, chip dùng chung), viết lại `ApartmentModal` dạng toàn màn hình,
  `MarketFieldsSection` & `PhotoUploader` dùng chung kiểu mới.

## Kiểm thử
- Gọi 4 API bằng token CTV → 403; token Quản lý → chạy bình thường.
- Sửa căn: xóa diện tích / phí điện / khoảng cách biển → DB không còn trường đó; gửi `price: null` → 400.
- Chụp màn hình form trên điện thoại (390px). `npm run build` backend & frontend.
