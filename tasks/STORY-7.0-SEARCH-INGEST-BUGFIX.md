# STORY 7.0: Sửa lỗi nhập tin & tìm kiếm (P0 — Epic 7 Thị trường Đà Nẵng)

**Bối cảnh:** Chạy thử tin thật (căn 2PN Mỹ An, Đà Nẵng) lộ 4 lỗi nền tảng ở phần nhập và tìm kiếm, cần sửa trước khi chuyển dữ liệu sang Đà Nẵng (Story 7.1).

## User Story
Là **CTV**, tôi muốn gõ "căn 2 phòng ngủ Mỹ An dưới 25tr" thì nhận đúng căn ở Mỹ An (không mất chữ "Mỹ An", không nhảy nhầm quận),
và là **Quản lý**, tôi muốn tin AI chưa chắc chắn được đánh dấu "Cần kiểm tra" thay vì bị đổi sai trạng thái thành "Sắp trống".

## Acceptance Criteria
1. **Tách cờ `needsReview` khỏi trạng thái**
   - Tin nhập từ Telegram/Zalo có `needsReview = true` vẫn lưu `status = AVAILABLE`, kèm `needsReview: true` và `reviewReason`.
   - Quản lý/Admin thấy nhãn "Cần kiểm tra" (thẻ danh sách + chi tiết, có lý do). CTV/khách không thấy cờ này.
   - Quản lý sửa căn (lưu form) → cờ tự gỡ (`needsReview = false`).
2. **Nhận diện quận theo nguyên từ** (không so khớp chuỗi con)
   - "2BR near the beach" KHÔNG bị nhận là Tây Hồ ("the" chứa "th"); "cg", "dd" chỉ khớp khi đứng riêng.
   - Vẫn nhận "cầu giấy", "caugiay", "cau giay", "CG".
3. **Tìm câu tự nhiên giữ từ khóa còn lại**
   - Tiêu chí AI/heuristic bóc được (quận, giá, loại phòng, tiện ích, điểm mốc) áp làm bộ lọc; các từ có nghĩa còn lại (VD "Mỹ An", tên đường) vẫn được dùng để lọc.
   - Không cần gọi thêm request tìm từ khóa ở frontend; nếu tìm tự nhiên lỗi (VD quá giới hạn 20 lần/phút) → tự chuyển sang tìm từ khóa.
4. **Từ khóa tự do kết hợp AND**
   - Mỗi từ có nghĩa phải xuất hiện ở tiêu đề / mô tả / địa chỉ / phường / quận (trước đây chỉ cần 1 từ → quá lỏng).
   - Bỏ qua từ đệm ("căn hộ", "cho thuê", "gần", "dưới", "tr"...) và cụm giá ("25tr", "6 triệu").
   - Tìm theo tên quận không còn bị ép thành "bán kính 2km quanh tâm quận" (chỉ điểm mốc mới tìm theo bán kính).

## Giải pháp kỹ thuật
- `search/text-tokens.ts` (mới): tách từ không dấu, tìm cụm từ liên tiếp, danh sách từ đệm.
- `QueryAnalyzer`: so khớp quận / tiếng lóng / điểm mốc theo cụm từ; từ còn lại → `$and`; trả `cleanedQuery` = từ khóa còn lại.
- `NaturalSearchService.parseHeuristic`: dùng chung bộ so khớp quận.
- `SearchService.searchNatural`: `q = cleanedQuery` thay vì bỏ hẳn câu; `GeocodingService.resolveCoordinates(text, { landmarksOnly })` khi tìm kiếm.
- `Apartment` model: thêm `needsReview`, `reviewReason`; `maskApartment` ẩn 2 trường với CTV; `ApartmentService.update` gỡ cờ.
- Frontend: hook bỏ request thứ 2, fallback khi lỗi; nhãn "Cần kiểm tra" cho Quản lý.

## Kiểm thử
- Script chạy mẫu tin thật + các câu: "căn 2 phòng ngủ Mỹ An dưới 25tr", "can ho ngu hanh son gan bien", "2BR near the beach with pool", "studio cg".
- `npm run build` backend & frontend.
