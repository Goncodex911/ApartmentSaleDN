# STORY 14.4: Khóa API Kho Căn Với Khách Vãng Lai (Lock Inventory API to Signed-in Users)

**Bối cảnh:** Epic 14, phát hiện #7 trong đợt rà soát 20/11/2026.
Các API `GET /apartments`, `/apartments/:id`, `/apartments/search` và `/apartments/search/natural` đang dùng `optionalAuthMiddleware`. Người chưa đăng nhập nhận dữ liệu giống CTV: **số nhà, link Google Maps, tọa độ chính xác, tên chủ, link bài gốc** (SĐT đã che).
Trang xem phòng gửi khách (Story 5.3) đã lọc rất kỹ theo danh sách trắng, nhưng các API trên đi vòng qua lớp đó, nên đối thủ có thể tải toàn bộ kho mà không cần đăng nhập.
**Project Owner đã chốt:** CTV **vẫn được thấy** `location.mapUrl` và `subListings[].sourceUrl` để dẫn khách. Story này không đổi dữ liệu trả cho CTV.

---

## 1. Mô tả Story (User Story)
* **Là một:** Chủ hệ thống.
* **Tôi muốn:** Chỉ người đã đăng nhập mới tải được danh sách, chi tiết và kết quả tìm kiếm căn từ API.
* **Để:** Bảo vệ nguồn hàng, không để ai tải trọn kho và vượt qua kênh CTV.

---

## 2. Tiền điều kiện (Pre-conditions)
* Mọi màn hình gọi các API trên đều nằm sau `ProtectedRoute` (đã kiểm tra: chỉ `ApartmentsPage`, `FilterSheet`, `LeadMatchesSection`...).
* Trang công khai `/p/:slug` chỉ gọi `/share/public/:code` và `/chat/...`. Gợi ý căn trong chat đi qua `SearchService` nội bộ, không qua HTTP.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Bắt buộc đăng nhập
* **Given** không có token hoặc token không hợp lệ
* **When** gọi `GET /api/v1/apartments`, `/apartments/:id`, `/apartments/search`, `GET`/`POST /apartments/search/natural`
* **Then** nhận 401 "Phiên đăng nhập không hợp lệ hoặc đã hết hạn".

### AC2 — Phần công khai vẫn hoạt động
* `GET /share/public/:code` (trang xem phòng), `POST /chat/:code/messages` kèm gợi ý căn, `GET /chat/:code/sessions/:id`, `GET /apartments/search/landmarks` vẫn gọi được khi chưa đăng nhập.
* **Given** mở link xem phòng trong cửa sổ ẩn danh
* **Then** xem ảnh, thông tin và chat AI có gợi ý căn bình thường.

### AC3 — Bảng hàng không đổi hành vi
* CTV và Quản lý tìm kiếm, lọc, xem bản đồ, mở chi tiết như cũ. Khi mất mạng vẫn đọc được bản lưu offline (Story 9.1).
* Token hết hạn → app tự refresh rồi gọi lại (interceptor hiện có), không đá về trang đăng nhập.

### AC4 — Giới hạn tìm câu tự nhiên theo tài khoản
* Giới hạn 20 lần / phút của `/search/natural` đếm theo **tài khoản** thay vì IP, để nhiều CTV dùng chung mạng văn phòng không chặn lẫn nhau.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **`backend/src/modules/apartments/apartment.routes.ts`:** `GET /` và `GET /:id` dùng `authMiddleware` thay cho `optionalAuthMiddleware`.
* **`backend/src/modules/search/search.routes.ts`:**
  - `GET /` và `GET`/`POST /natural` dùng `authMiddleware`.
  - `naturalLimiter` đặt **sau** `authMiddleware`, `key: (req) => req.user!.id`.
  - `/landmarks` giữ `optionalAuthMiddleware` (danh sách điểm mốc công khai, không có dữ liệu kho).
* Không đổi `maskApartment`, đúng quyết định của Project Owner.
* Bỏ import `optionalAuthMiddleware` nếu file không còn dùng.

### Frontend:
* Không đổi.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] `curl` không token tới 5 endpoint ở AC1 → 401; có token CTV → 200.
* [ ] `curl` không token tới các endpoint ở AC2 → 200.
* [ ] Puppeteer 390px:
  - Cửa sổ ẩn danh mở `/p/<slug>` → trang hiện đủ, chat AI trả gợi ý căn.
  - Đăng nhập CTV → Bảng hàng tìm "studio Hải Châu dưới 6tr" có kết quả.
  - Tắt mạng → vẫn thấy danh sách đã lưu.
* [ ] `tsc` backend không lỗi.
* [ ] Báo cáo và đề xuất commit, chờ duyệt.

---

## 6. Rủi ro & lựa chọn
* Extension Chrome hoặc công cụ ngoài nào đang đọc kho **không đăng nhập** sẽ ngừng chạy. Kiểm tra trong repo không thấy chỗ dùng. Nếu có công cụ ngoài repo, cần cấp token cho công cụ đó.
* Bản cache offline đã lưu trước đó trên máy không bị ảnh hưởng.
