# STORY 14.8: Sửa Lỗi Nhỏ Tìm Kiếm, Hộp Thoại Trùng & Đồng Bộ Khách Đặt Cọc (Small Fixes)

**Bối cảnh:** Epic 14, phát hiện #16 → #19 trong đợt rà soát 20/11/2026.
* **Nút "Xem căn đã có" không làm gì:** nút trong hộp thoại nghi trùng (Story 13.10) mở `/apartments?id=…` (`ApartmentModal.tsx:185`), nhưng Bảng hàng không đọc `id`, nên chỉ mở danh sách chung.
* **Bóc giá sai khi Gemini lỗi:** bộ đọc câu dự phòng hiểu "nhà 1 **tr**ệt 2 lầu dưới 15tr" thành giá ≤ 1 triệu, "tầng 3 **tr**ở lên" thành ≤ 3 triệu (đã chạy thử xác nhận).
* **Chip giá chồng nhau ở mốc biên:** căn đúng 8.000.000 hiện ở cả "5–8tr" lẫn "8–12tr", lệch với phân bố giá trên Dashboard Admin (`$bucket` tính `[min, max)`).
* **Khách đặt cọc không đồng bộ:** CTV chuyển khách sang "Đã đặt cọc" nhưng Quản lý không được báo. Frontend cũng chưa có chỗ chọn căn, dù API đã nhận `depositedApartmentId`.

---

## 1. Mô tả Story (User Story)
* **Là một:** CTV / Quản lý dùng app hằng ngày.
* **Tôi muốn:** Các thao tác nhỏ cho kết quả đúng như mong đợi, và Quản lý biết ngay khi khách của CTV đã cọc căn.
* **Để:** Không mất thời gian vì kết quả tìm kiếm sai, nút bấm không làm gì, hoặc căn đã có khách cọc mà vẫn đang chào.

---

## 2. Tiền điều kiện (Pre-conditions)
* Đã có `openById` và luồng `location.state.openApartmentId` trong `ApartmentsPage` (Story 11.5).
* Đã có `GET /leads/:id/matches` (Story 11.1) và `NotificationService.notifyManagers`.
* Áp dụng Phương án A của Story 14.3: thông báo gửi mọi Quản lý / ADMIN đang hoạt động.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Xem căn đã có
* **Given** hộp thoại nghi trùng khi Quản lý thêm căn
* **When** bấm `[👁️ Xem căn đã có]`
* **Then** tab mới mở Bảng hàng và tự mở chi tiết đúng căn đó; tham số `?id=` bị xóa khỏi URL (tải lại trang không mở lần nữa).
* `id` không hợp lệ hoặc căn đã xóa → báo "Không mở được căn hộ", Bảng hàng vẫn hiện bình thường.

### AC2 — Bóc giá dự phòng
| Câu tìm | Kết quả |
| :--- | :--- |
| nhà 1 trệt 2 lầu dưới 15tr | tối đa 15.000.000 |
| tầng 3 trở lên dưới 8tr | tối đa 8.000.000 |
| studio dưới 6tr | tối đa 6.000.000 |
| 5-7 triệu 2pn | 5.000.000 – 7.000.000 |
| trên 10 củ | tối thiểu 10.000.000 |
* Đơn vị `tr` / `triệu` / `củ` phải đứng riêng thành từ (không có chữ cái liền sau).

### AC3 — Chip giá không chồng biên
* Khoảng giá dùng `[min, max)`: "5–8tr" = `≥ 5.000.000` và `< 8.000.000`.
* Căn đúng 8.000.000 chỉ thuộc "8–12tr", khớp số trên Dashboard Admin.
* Giá tối thiểu / tối đa người dùng tự nhập (`minPrice` / `maxPrice`) vẫn tính bao gồm hai đầu như cũ.

### AC4 — Khách đặt cọc
* **Given** CTV mở khách, bấm chuyển sang "Đã đặt cọc"
* **Then** hiện bảng chọn căn: danh sách căn phù hợp của khách (Story 11.1), kèm lựa chọn "Không chọn căn".
* **When** chọn căn và xác nhận
* **Then** khách chuyển "Đã đặt cọc" kèm `depositedApartmentId`.
* **And** mọi Quản lý / ADMIN đang hoạt động nhận thông báo `LEAD_DEPOSITED`: "CTV [tên] báo khách [tên khách] đã cọc căn [tiêu đề]". Bấm vào thì mở chi tiết căn để Quản lý đổi trạng thái.
* Trạng thái căn **không** tự đổi; Quản lý xác nhận rồi mới đổi.
* Chọn "Không chọn căn" → chuyển giai đoạn như cũ, không gửi thông báo.
* Chuyển lại "Đã đặt cọc" lần nữa với cùng căn → không gửi thông báo trùng.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/modules/search/natural-search.service.ts`:** `extractPrice` thêm `(?![a-zà-ỹđ])` sau nhóm đơn vị ở cả `rangeMatch` lẫn `maxMatch`.
* **`backend/src/modules/search/filter.builder.ts`:** khoảng giá 1 chạm dùng `$lt` cho cận trên (`PRICE_RANGES`), giữ `$lte` cho `maxPrice` người dùng nhập.
* **`backend/src/modules/leads/lead.service.ts`:** `changeStage`, khi `stage === 'DEPOSITED'` và `depositedApartmentId` khác giá trị cũ:
  - Kiểm tra căn tồn tại; không có thì 404.
  - Lưu xong mới gọi `NotificationService.notifyManagers({ type: 'LEAD_DEPOSITED', … })`, chạy nền và nuốt lỗi (`notifySafely`).
  - Tên CTV đọc từ `User`.
* **`backend/src/modules/notifications/notification.model.ts`:** thêm `LEAD_DEPOSITED`.

### Frontend:
* **`frontend/src/pages/ApartmentsPage.tsx`:** đọc `new URLSearchParams(location.search).get('id')` → `openById(id)` → `navigate(location.pathname, { replace: true })`. Gộp chung với effect `openApartmentId`.
* **`frontend/src/components/leads/LeadDetailModal.tsx`:** chọn "Đã đặt cọc" thì mở bảng chọn căn (dùng lại dữ liệu `leadApi.matches`); gửi `depositedApartmentId` qua `leadApi.changeStage`.
  - File đang 160 dòng. Nếu vượt 250 dòng thì tách `DepositApartmentPicker.tsx`.
* **`frontend/src/api/leadApi.ts`:** `ChangeStagePayload` thêm `depositedApartmentId?: string`.
* **`frontend/src/api/notificationApi.ts` + `components/layout/NotificationBell.tsx`:** thêm `LEAD_DEPOSITED`, bấm vào mở chi tiết căn (giống `LISTING_FLAGGED`).
* **`frontend/src/components/apartment/filterChips.ts`:** kiểm tra nhãn chip giá vẫn đúng với cách tính mới (chỉ sửa nếu nhãn ghi "≤").

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Kiểm thử `NaturalSearchService.parseHeuristic` với 5 câu ở AC2 (tsx, scratchpad).
* [ ] API:
  - Căn giá 8.000.000 → có trong `priceRange=8m_12m`, không có trong `5m_8m`.
  - `PATCH /leads/:id/stage` DEPOSITED + căn → Quản lý có thông báo `LEAD_DEPOSITED`; gọi lại cùng căn → không thêm thông báo.
* [ ] Puppeteer 390px (bản local):
  - Thêm căn trùng → "Xem căn đã có" → tab mới mở đúng chi tiết căn, URL không còn `?id=`.
  - CTV chuyển khách sang Đã đặt cọc, chọn căn → Quản lý bấm thông báo mở đúng căn.
  - Bảng chọn căn: vùng bấm ≥ 44px, chữ ≥ 16px, có trạng thái loading / trống ("Chưa có căn phù hợp").
* [ ] `tsc` 2 phía + build production không lỗi; dọn dữ liệu thử.
* [ ] Báo cáo và đề xuất commit, chờ duyệt.

---

## 6. Rủi ro & lựa chọn
* **Bảng chọn căn** chỉ lấy danh sách căn phù hợp ≥ 80%. Khách cọc căn ngoài danh sách thì CTV chọn "Không chọn căn" và ghi chú tay. Nếu cần ô tìm căn bất kỳ thì làm ở story sau.
* **Đổi cách tính khoảng giá** làm số căn trong chip "5–8tr" / "8–12tr" có thể lệch 1–2 căn so với trước. Đây là kết quả đúng, không phải lỗi.
