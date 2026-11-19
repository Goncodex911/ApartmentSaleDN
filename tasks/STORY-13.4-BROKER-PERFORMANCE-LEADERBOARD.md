# STORY 13.4: Bảng Xếp Hạng & Báo Cáo Hiệu Suất CTV (Broker Performance Leaderboard)

**Bối cảnh:** `docs/stories/EPIC_13_ADMIN_CONTROL_CENTER_AND_GOVERNANCE.md` Story 13.4.  
Hệ thống hiện tại có các tương tác của CTV như nạp tin qua `Submissions`, chia sẻ link qua `share_links` (`?ref=ctvCode`), và chăm sóc khách qua `Leads`. Tuy nhiên Admin chưa có công cụ tổng hợp đánh giá CTV nào hoạt động hiệu quả nhất để khen thưởng hoặc phân loại tài khoản không hoạt động. Story này xây dựng Bảng xếp hạng và báo cáo hiệu suất môi giới.

---

## 1. Mô tả Story (User Story)
* **Là một:** Admin điều hành mạng lưới CTV.
* **Tôi muốn:** Xem bảng xếp hạng mức độ hoạt động và hiệu suất của từng CTV (số tin đã đóng góp, số lượt chia sẻ link xem phòng, số khách đang chăm sóc).
* **Để:** Khen thưởng các CTV xuất sắc, nắm bắt mức độ tích cực của đội ngũ và thanh lọc các tài khoản không hoạt động.

---

## 2. Tiền điều kiện (Pre-conditions)
* Đã có dữ liệu từ các module: `Submissions`, `ShareLinks`, `Leads`.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Bảng Xếp Hạng Hoạt Động & Đóng Góp
* **Given** Admin truy cập trang Hiệu suất CTV `/admin/performance`
* **When** trang hiển thị
* **Then** hệ thống liệt kê danh sách CTV kèm các chỉ số hiệu suất:
  - **Họ tên & SĐT:** Kèm mã `ctvCode`.
  - **Nguồn hàng đóng góp:** Tổng số tin CTV đã đăng và số tin được Manager duyệt thành công.
  - **Tương tác chia sẻ:** Tổng số link xem phòng được tạo qua mã `?ref=ctvCode` và tổng lượt xem thực tế của khách hàng (`viewCount`).
  - **Khách hàng quản lý:** Số lượng Lead đang chăm sóc trong phễu CRM.
* **Then** Top 3 CTV có đóng góp lớn nhất được gắn huy hiệu vinh danh: `🥇 Top 1`, `🥈 Top 2`, `🥉 Top 3`.

### AC2 — Bộ Lọc & Phân Loại CTV
* **Given** Admin đang xem danh sách
* **When** Admin chọn bộ lọc theo khoảng thời gian: `Tháng này` · `Tháng trước` · `Toàn thời gian`
* **Then** các chỉ số đóng góp được tính toán lại theo mốc thời gian đã chọn.
* **When** Admin chọn tab `Không hoạt động (Inactive)`
* **Then** hiển thị danh sách các tài khoản CTV không phát sinh lượt đăng tin hoặc chia sẻ nào trong vòng 30 ngày qua.

### AC3 — Xuất Báo Cáo Doanh Số (Export CSV)
* **Given** Admin cần số liệu để tính thưởng hoa hồng cuối tháng
* **When** Admin bấm nút `[📥 Xuất báo cáo CSV]`
* **Then** trình duyệt tự động tải về file CSV định dạng UTF-8 (có BOM để Excel mở không lỗi font tiếng Việt):
  - Cột: `Mã CTV`, `Họ tên`, `Số điện thoại`, `Số tin duyệt`, `Số lượt share link`, `Tổng lượt xem khách`, `Số lead tạo`.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **Endpoint mới:** `GET /api/v1/admin/broker-performance` (query `timeRange: 'this_month' | 'last_month' | 'all'`).
* **Aggregation Pipeline:**
  - Kết nối bảng `users` (lọc `role: 'COLLABORATOR'`) kết hợp với:
    - `submissions`: đếm số tin theo `authorId` và `status === 'APPROVED'`.
    - `share_links`: đếm số link tạo bởi `ctvId` và tổng `viewsCount`.
    - `leads`: đếm số lead thuộc quyền quản lý `ctvId`.
* **Endpoint xuất CSV:** `GET /api/v1/admin/broker-performance/export`.

### Frontend:
* **Tạo trang mới:** `frontend/src/pages/AdminPerformancePage.tsx`.
* **Component con:** Bảng xếp hạng `LeaderboardTable.tsx`, huy hiệu Top 3, nút tải file CSV.
* **API Client:** Thêm phương thức `getBrokerPerformance` trong `adminApi.ts`.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Kiểm tra số liệu aggregation khớp chính xác với database.
* [ ] File CSV tải về mở trên Excel hiển thị đúng dấu tiếng Việt không bị lỗi font.
* [ ] Tính toán Top 3 chính xác theo tiêu chí đóng góp.

---

## 6. Đối chiếu với code hiện tại (bổ sung khi tạo story, 19/11/2026)
* **Không có `?ref=ctvCode`:** link xem phòng là `ShareLink` riêng cho từng cặp (căn, CTV) — trường `ctvId`, lượt xem là `views`.
  "Số link đã tạo" = đếm `ShareLink` theo `ctvId`; "lượt khách xem" = tổng `views`.
* **Tên trường đúng:** `ListingSubmission.ctvId` (không phải `authorId`), trạng thái `APPROVED / REJECTED / PENDING / WITHDRAWN`. Tỷ lệ duyệt = APPROVED / (APPROVED + REJECTED).
* **Lọc theo tháng:** `ShareLink.views` là số cộng dồn, không có mốc thời gian từng lượt xem → **lượt xem chỉ tính được "toàn thời gian"**.
  Muốn lọc theo tháng phải lưu thêm từng lượt xem (collection mới). Đề xuất làm sau.
* **Huy hiệu Top 3:** icon `lucide` (`Trophy` / `Medal`) + chữ "Top 1/2/3", không dùng emoji 🥇🥈🥉 (theo quy chuẩn giao diện Epic 12).
* **CSV:** tạo ngay trên trình duyệt (BOM `﻿` + `Blob`), không cần thêm endpoint export. Không thêm thư viện Excel.
