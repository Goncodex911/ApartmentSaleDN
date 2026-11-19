# EPIC-14: Sửa Lỗi Logic Sau Rà Soát Toàn Hệ Thống & Gia Cố Bảo Mật (System Audit Fixes & Hardening)

## Mục tiêu
Khắc phục các lỗi logic nghiệp vụ, lỗ hổng che dữ liệu và điểm vênh giữa Frontend – Backend được phát hiện trong đợt rà soát toàn bộ mã nguồn ngày **20/11/2026** (nhánh `feat/epic-13-admin-control-center`, sau Story 13.10).
Epic này **không thêm tính năng mới**: chỉ làm cho các luồng đã có chạy đúng như các Epic 1–13 đã cam kết, đặc biệt là nguyên tắc cốt lõi *"CTV và người ngoài không bao giờ thấy SĐT chủ nhà / địa chỉ chính xác"* (Story 1.2, 5.3, 8.3).

---

## Bối cảnh & Kết quả rà soát

### 1. Phạm vi đã rà
* **Backend (~7.600 dòng):** auth & phiên, phân quyền, kho căn, tìm kiếm (từ khóa / câu tự nhiên / bán kính / bản đồ), nhập tin Telegram – webhook – dán nhanh, khử trùng SĐT / bộ 3 / ảnh dHash, tin CTV chờ duyệt, báo lỗi tin & điểm tín nhiệm, CRM khách & ghép căn, chat AI, link xem phòng công khai, thông báo, real-time SSE, việc hằng ngày (nhắc tái ký, dọn ảnh), khu Admin.
* **Frontend:** đăng nhập & làm mới token, Bảng hàng, form thêm/sửa căn & cảnh báo trùng, real-time, duyệt tin CTV, trang Admin, upload thẳng Cloudinary, PWA/offline cache.
* **Triển khai:** `netlify.toml`, `_redirects`, `render.yaml`, `docker-compose.yml`.
* `tsc --noEmit` của cả backend và frontend đều **sạch lỗi** → các vấn đề dưới đây là lỗi nghiệp vụ, không phải lỗi cú pháp.

### 2. Bảng tổng hợp phát hiện → Story xử lý

| # | Phát hiện | Mức | Vị trí chính | Story |
| :-: | :--- | :-: | :--- | :-: |
| 1 | SĐT chủ nhà từ tin AI lưu nguyên văn (`0905.123.456`, `+84 905…`) → bộ che số không che được, CTV thấy SĐT đầy đủ | 🔴 | `ingestion/gemini.service.ts:183`, `apartments/apartment.service.ts:48` | 14.1 |
| 2 | Cùng nguyên nhân #1: khử trùng theo SĐT không khớp (`84905…` ≠ `0905…`) | 🔴 | `dedup/dedup.service.ts:34` | 14.1 |
| 3 | Khử trùng tự động gộp khi cùng SĐT + chung **1 từ bất kỳ** trong địa chỉ ("kiet", "van", "nguyen") → căn khác nhau của cùng môi giới bị gộp mất | 🔴 | `dedup/dedup.service.ts:61-62` | 14.2 |
| 4 | dHash của ảnh trơn / banner mẫu của môi giới giống nhau; căn Master tích lũy hash của mọi nguồn phụ → càng ngày càng dễ gộp nhầm. So ảnh quét toàn bộ căn trong quận, không giới hạn | 🟡 | `dedup/dedup.service.ts` (`checkVisualMatch`, `aggregateSubListing`) | 14.2 |
| 5 | Tin mới báo "còn trống" gộp vào căn đang **Đã thuê** mà không gắn cờ / không báo ai | 🟡 | `dedup/dedup.service.ts` (`aggregateSubListing`) | 14.2 |
| 6 | Frontend coi mọi Quản lý là chủ căn (`isOwnerOrAdmin={isManager}`); Backend chỉ cho người tạo căn hoặc ADMIN → nút sửa / đổi trạng thái / xử lý báo lỗi báo 403. Tin Telegram đều gán cho tài khoản Quản lý/ADMIN tạo sớm nhất | 🔴 | `pages/ApartmentsPage.tsx:237`, `apartments/apartment.service.ts:105`, `ingestion/telegram.service.ts:145` | 14.3 |
| 7 | `GET /apartments`, `/apartments/:id`, `/apartments/search`, `/search/natural` mở cho khách vãng lai → lộ số nhà, link Google Maps, tọa độ chính xác, tên chủ, link bài gốc | 🔴 | `apartments/apartment.routes.ts:62-63`, `search/search.routes.ts:15-22` | 14.4 |
| 8 | Đăng nhập / đăng ký không giới hạn số lần thử (mật khẩu tối thiểu 6 ký tự) | 🟡 | `auth/auth.routes.ts:8-10` | 14.5 |
| 9 | Đăng xuất chỉ xóa cookie, refresh token cũ còn dùng được 7 ngày | 🟡 | `auth/auth.controller.ts:74` | 14.5 |
| 10 | Giới hạn 6 lượt upload/giờ của CTV đếm theo lần xin chữ ký, nhưng 1 chữ ký dùng được không giới hạn trong ~1 giờ | 🟡 | `apartments/apartment.routes.ts:28-34`, `config/cloudinary.ts` | 14.5 |
| 11 | Lưu form sửa căn (dù chỉ sửa chính tả) tự đóng **mọi** báo lỗi đang mở; người báo đúng không được cộng điểm nếu Quản lý xử lý ngoài hàng đợi | 🟡 | `apartments/apartment.service.ts:125` | 14.6 |
| 12 | Xóa căn không đóng báo lỗi đang mở → bản ghi mồ côi chiếm suất `$limit: 100` của hàng đợi kiểm duyệt | ⚪ | `apartments/apartment.service.ts` (`delete`), `reports/listing-report.service.ts` (`queue`) | 14.6 |
| 13 | Chat AI: ngân sách < 1.000 bị hiểu là "triệu" → khách nước ngoài nói "$600" thành 600 triệu VNĐ | 🟡 | `chat/chat-ai.ts:55-56` | 14.7 |
| 14 | Chat AI lưu khu vực dạng phường ("Mỹ An", "An Hải") vào `districts` → không khớp quận khi ghép căn, khách chat không bao giờ được gợi ý / ghép | 🟡 | `chat/chat-ai.ts:50-52`, `leads/lead-matching.service.ts` | 14.7 |
| 15 | Mỗi lần mở chat mới (không gửi `sessionId`) tạo 1 khách + 1 thông báo cho CTV; chỉ giới hạn 10 tin/phút/IP → có thể spam hàng trăm khách ảo/giờ | 🟡 | `chat/chat.service.ts`, `chat/chat.routes.ts` | 14.7 |
| 16 | Nút "Xem căn đã có" trong hộp thoại trùng mở `/apartments?id=…` nhưng Bảng hàng không đọc `id` → chỉ mở danh sách chung | 🟡 | `components/apartment/ApartmentModal.tsx:185` | 14.8 |
| 17 | Bộ đọc giá dự phòng (khi Gemini lỗi): "1 **tr**ệt" → giá ≤ 1 triệu, "tầng 3 **tr**ở lên" → ≤ 3 triệu | ⚪ | `search/natural-search.service.ts:165` | 14.8 |
| 18 | Chip giá chồng nhau ở mốc biên: căn đúng 8.000.000 hiện ở cả "5–8tr" và "8–12tr" | ⚪ | `search/filter.builder.ts:10-11` | 14.8 |
| 19 | CTV chuyển khách sang "Đã đặt cọc" kèm căn, nhưng căn vẫn Trống và Quản lý không được báo | ⚪ | `leads/lead.service.ts:60` | 14.8 |

> 🔴 Cao: lộ dữ liệu hoặc mất dữ liệu / chặn công việc hằng ngày · 🟡 Trung bình · ⚪ Thấp

### 3. Đã kiểm tra — hoạt động đúng, KHÔNG cần sửa
Duyệt tin CTV chống 2 Quản lý bấm cùng lúc · Khóa tài khoản có hiệu lực tức thì (tokenVersion + bộ nhớ phiên 30 giây) · Chống SSRF link Google Maps & ảnh tin CTV · Escape regex mọi ô tìm kiếm · Chặn chèn toán tử MongoDB qua query string · Trang xem phòng công khai dùng DTO danh sách trắng · Dọn ảnh tin bị từ chối giữ ảnh đang dùng · Nhắc tái ký theo "còn ≤ N ngày" có nhắc bù · Real-time gửi bù sự kiện qua `Last-Event-ID` · Xóa cache offline khi đăng nhập / đăng xuất.

### 4. Nguyên tắc thực hiện
* Mỗi Story sửa xong phải chạy `tsc --noEmit` backend + frontend và `npm run build` frontend.
* Story có ghi dữ liệu hàng loạt (script chuẩn hóa SĐT – Story 14.1) **phải báo trước và được Project Owner đồng ý** trước khi chạy trên DB thật (WORKING_RULES §4).
* Không đổi cấu trúc dữ liệu đã có; chỉ thêm trường mới khi Story ghi rõ.

---

## Danh mục các User Stories

| Story | Tên User Story | Trọng tâm kỹ thuật | Độ ưu tiên |
| :--- | :--- | :--- | :---: |
| **Story 14.1** | Chuẩn Hóa SĐT Chủ Nhà Từ Tin AI & Che Số Tuyệt Đối | `normalizeVnPhone` khi bóc tin, bộ che số không phụ thuộc định dạng, script chuẩn hóa dữ liệu cũ | P0 |
| **Story 14.2** | Siết Khử Trùng Tự Động Chống Gộp Nhầm | So khớp tên đường bằng `streetKey`, bỏ qua ảnh trơn/banner, giới hạn hash Master, gắn cờ khi gộp vào căn Đã thuê | P0 |
| **Story 14.3** | Thống Nhất Quyền Sửa Căn Giữa Frontend & Backend | Đã chốt A — Chung kho: bỏ kiểm tra người tạo ở backend, thông báo báo lỗi / tái ký gửi cả đội Quản lý | P0 |
| **Story 14.4** | Khóa API Kho Căn Với Khách Vãng Lai | Bắt buộc đăng nhập cho danh sách / chi tiết / tìm kiếm căn | P0 |
| **Story 14.5** | Gia Cố Đăng Nhập, Phiên & Upload | Giới hạn thử đăng nhập, thu hồi refresh token khi đăng xuất, chữ ký Cloudinary theo lượt | P1 |
| **Story 14.6** | Báo Lỗi Tin Đóng Đúng Lúc & Điểm Tín Nhiệm Nhất Quán | Chỉ đóng báo lỗi khi sửa đúng trường liên quan, cộng điểm mọi lối xử lý, dọn báo lỗi khi xóa căn | P1 |
| **Story 14.7** | Chat AI Hiểu Đúng Khu Vực & Ngân Sách, Chống Spam Khách Ảo | Phường → khu vực (zones), ngân sách USD, giới hạn phiên mới | P1 |
| **Story 14.8** | Sửa Lỗi Nhỏ Tìm Kiếm, Hộp Thoại Trùng & Đồng Bộ Khách Đặt Cọc | Mở căn theo `?id=`, bóc giá có ranh giới từ, chip giá không chồng biên, báo Quản lý khi khách cọc | P2 |

---

### User Story 14.1: Chuẩn Hóa SĐT Chủ Nhà Từ Tin AI & Che Số Tuyệt Đối
* **Là một:** Quản lý / chủ hệ thống.
* **Tôi muốn:** Mọi SĐT chủ nhà (kể cả từ tin Telegram / Zalo AI bóc) được lưu cùng một dạng `0xxxxxxxxx` và luôn bị che khi CTV xem.
* **Để:** Giữ đúng cam kết Data Masking (Story 1.2) và để khử trùng theo SĐT hoạt động.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Given** tin đăng ghi SĐT `0905.123.456`, `0905 123 456` hoặc `+84 905 123 456`, **When** pipeline AI tạo căn hoặc gộp nguồn phụ, **Then** `ownerContact.phone` (căn và nguồn phụ) lưu `0905123456`.
  2. **Given** AI trả chuỗi không phải SĐT VN hợp lệ sau chuẩn hóa, **Then** không lưu SĐT, căn được gắn cờ "Không tìm thấy số điện thoại đầu mối" như hiện tại.
  3. **Given** CTV hoặc khách xem căn có SĐT ở bất kỳ định dạng nào (kể cả dữ liệu cũ chưa chuẩn hóa), **Then** SĐT hiển thị dạng `0905***456`, không bao giờ lộ đủ số.
  4. **Given** căn trong kho có SĐT `0905123456`, **When** tin mới mang `+84 905 123 456` cùng tên đường, **Then** khử trùng Tầng 1 nhận ra trùng.
  5. **Script chuẩn hóa dữ liệu cũ:** chuẩn hóa `ownerContact.phone` và `subListings.ownerContact.phone` của căn đã có; có chế độ chạy thử (chỉ đếm, không ghi). Chỉ chạy thật khi Project Owner đồng ý.
* **Ghi chú kỹ thuật:** gọi `normalizeVnPhone` trong `GeminiService.sanitizeResult`; `maskContact` chuẩn hóa trước rồi mới che (hoặc che theo chữ số, bỏ qua ký tự phân cách); `checkDeterministicMatch` dùng `normalizeVnPhone` thay cho `replace(/\D/g, '')`. Script đặt ở `backend/src/scripts/`, giống `backfill-zone-type.ts`.

---

### User Story 14.2: Siết Khử Trùng Tự Động Chống Gộp Nhầm
* **Là một:** Quản lý kho hàng.
* **Tôi muốn:** Bot chỉ tự gộp tin khi chắc chắn là cùng một căn.
* **Để:** Căn mới của cùng một môi giới không bị "nuốt" thành nguồn phụ của căn khác và biến mất khỏi Bảng hàng.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **So khớp tên đường thật:** **Given** cùng SĐT, cùng quận, địa chỉ "Kiệt 12 Nguyễn Văn Thoại" và "Kiệt 5 Ngô Thì Sĩ", **Then** KHÔNG gộp. **Given** "K12/3 Nguyễn Văn Thoại" và "Nguyễn Văn Thoại, Mỹ An", **Then** gộp. Dùng chung quy tắc `streetKey` với bộ 3 (Story 13.10) thay vì "chung 1 từ bất kỳ".
  2. **Tin không có tên đường** (`Đang cập nhật địa chỉ`): không tự gộp theo SĐT; tạo căn mới và gắn cờ "Cần kiểm tra — có thể trùng căn của cùng SĐT".
  3. **Ảnh không đặc trưng:** ảnh gần như một màu (dHash `0000…`/`ffff…` hoặc số bit 1 quá ít/quá nhiều) không được tính khi so trùng.
  4. **Không tích lũy hash vô hạn:** khi gộp nguồn phụ, không cộng thêm hash ảnh vào căn Master (hoặc giới hạn tối đa 20 hash); so ảnh chỉ xét căn cập nhật trong 180 ngày gần nhất.
  5. **Gộp vào căn đã hết trống:** **Given** căn Master đang `DEPOSITED` hoặc `RENTED`, **When** tin mới trùng được gộp vào, **Then** căn được gắn cờ `needsReview` với lý do "Nguồn mới báo còn trống — kiểm tra trạng thái" và Quản lý của căn nhận thông báo trong app.
* **Ghi chú kỹ thuật:** `dedup.service.ts` (`checkDeterministicMatch`, `checkVisualMatch`, `aggregateSubListing`), dùng lại `streetKey` từ `similar-apartment.ts` (chuyển sang file dùng chung). Thêm kiểu thông báo mới nếu cần trong `notification.model.ts`.

---

### User Story 14.3: Thống Nhất Quyền Sửa Căn Giữa Frontend & Backend
* **Là một:** Quản lý.
* **Tôi muốn:** Chỉ thấy nút sửa / đổi trạng thái / xử lý báo lỗi ở những căn tôi thật sự có quyền, và có quyền với những căn tôi phải chăm sóc (kể cả căn bot cào).
* **Để:** Không còn tình trạng bấm nút rồi nhận lỗi 403, và kho căn cào không bị "kẹt" ở một tài khoản.
* **✅ Đã chốt (Project Owner, 20/11/2026): Phương án A — Chung kho.** Story chi tiết: `tasks/STORY-14.3-SHARED-INVENTORY-PERMISSIONS.md`. Hai phương án đã cân nhắc:
  * **Phương án A — Chung kho (đã chọn):** mọi Quản lý (và ADMIN) sửa được mọi căn; vẫn ghi Audit Log người sửa. Đơn giản, hợp đội nhỏ.
  * **Phương án B — Theo người phụ trách:** giữ kiểm tra `managerId`; tin cào được gán Quản lý theo nhóm Telegram nguồn (thêm trường "Quản lý phụ trách" cho mỗi nhóm ở Story 13.5); Admin chuyển được người phụ trách căn.
* **Tiêu chí chấp nhận (Acceptance Criteria) — chung cho cả 2 phương án:**
  1. API danh sách / chi tiết căn trả kèm cờ `canEdit` tính ở Backend; Frontend dùng cờ này cho nút Sửa, Xóa, đổi trạng thái, hợp đồng thuê, xử lý báo lỗi — không tự suy từ vai trò.
  2. **Given** Quản lý mở căn không có quyền, **Then** không thấy các nút trên và vẫn xem được SĐT chủ nhà như hiện tại.
  3. Thông báo "Căn bị báo lỗi" và "Nhắc tái ký" gửi đúng người có quyền xử lý căn đó (A: mọi Quản lý đang hoạt động; B: Quản lý phụ trách).
  4. Hàng đợi `/moderation` dùng cùng quy tắc quyền với chi tiết căn.
* **Ghi chú kỹ thuật:** quy tắc quyền đặt ở 1 hàm dùng chung (VD `canManageApartment(apartment, actor)` trong `apartment.model.ts`), thay 5 chỗ lặp trong `apartment.service.ts` và `canResolve` trong `listing-report.service.ts`. Frontend: `ApartmentsPage.tsx:237`, `ApartmentDetailModal.tsx`.

---

### User Story 14.4: Khóa API Kho Căn Với Khách Vãng Lai
* **Là một:** Chủ hệ thống.
* **Tôi muốn:** Chỉ người đã đăng nhập mới tải được danh sách / chi tiết căn từ API.
* **Để:** Đối thủ không thể tải toàn bộ kho kèm số nhà, link bản đồ, tọa độ chính xác và vượt qua kênh CTV.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Given** không có token hợp lệ, **When** gọi `GET /api/v1/apartments`, `/apartments/:id`, `/apartments/search`, `/apartments/search/natural`, **Then** nhận 401.
  2. Vẫn công khai: `GET /share/public/:code` (trang xem phòng), chat AI trên trang xem phòng (gợi ý căn đi qua service nội bộ), `GET /apartments/search/landmarks`.
  3. Trang xem phòng công khai và gợi ý căn trong chat vẫn hoạt động bình thường (kiểm thử thủ công bằng cửa sổ ẩn danh).
  4. Bảng hàng của CTV và Quản lý không đổi hành vi; ngoại tuyến vẫn đọc bản lưu offline.
* **Ghi chú kỹ thuật:** đổi `optionalAuthMiddleware` → `authMiddleware` ở `apartment.routes.ts` và `search.routes.ts`. **✅ Đã chốt (Project Owner, 20/11/2026):** CTV vẫn được thấy `location.mapUrl` và `subListings[].sourceUrl` để dẫn khách — không đổi `maskApartment`.

---

### User Story 14.5: Gia Cố Đăng Nhập, Phiên & Upload
* **Là một:** Chủ hệ thống.
* **Tôi muốn:** Tài khoản không bị dò mật khẩu, đăng xuất là hết phiên thật, và CTV không vượt được giới hạn tải ảnh.
* **Để:** Giảm rủi ro chiếm tài khoản Quản lý (xem được SĐT chủ nhà) và đốt hạn mức Cloudinary miễn phí.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Giới hạn đăng nhập:** tối đa 10 lần sai / 15 phút theo SĐT và 30 lần / 15 phút theo IP; vượt → 429 kèm thời gian chờ. Đăng nhập đúng xóa bộ đếm của SĐT đó. Đăng ký: tối đa 5 tài khoản / giờ / IP.
  2. **Đăng xuất thu hồi refresh token:** **Given** đã đăng xuất trên máy A, **When** dùng lại refresh token cũ của máy A, **Then** 401. Các máy khác đang đăng nhập không bị ảnh hưởng.
  3. **Upload theo lượt:** **Given** CTV đã dùng hết 6 lượt/giờ, **Then** không tải thêm được file nào, kể cả bằng chữ ký xin trước đó (VD rút hạn chữ ký còn vài phút, hoặc kiểm tra số file khi gửi tin thay vì khi xin chữ ký).
* **Ghi chú kỹ thuật:** dùng lại `middlewares/rate-limit.ts` (đã có `key`). Thu hồi refresh token theo thiết bị: thêm `jti` vào refresh token và lưu danh sách `jti` đang hiệu lực trên User (giới hạn 10 thiết bị) — không dùng `tokenVersion` vì sẽ đăng xuất mọi máy. Cloudinary: đánh giá giữa chữ ký ngắn hạn và kiểm tra số lượng ở `submission.validation.ts` (đã giới hạn 20 file/tin).

---

### User Story 14.6: Báo Lỗi Tin Đóng Đúng Lúc & Điểm Tín Nhiệm Nhất Quán
* **Là một:** CTV báo lỗi tin / Quản lý xử lý.
* **Tôi muốn:** Báo lỗi chỉ được đóng khi Quản lý thật sự xử lý đúng vấn đề, và người báo đúng luôn được ghi công.
* **Để:** Cơ chế báo lỗi (Story 13.6) đáng tin, CTV có động lực báo.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Given** căn có báo lỗi "Không liên lạc được chủ", **When** Quản lý sửa tiêu đề / mô tả, **Then** báo lỗi vẫn mở.
  2. Sửa form chỉ tự đóng báo lỗi tương ứng: đổi giá → đóng `PRICE_CHANGED`; đổi ảnh → đóng `WRONG_PHOTOS`; đổi SĐT / tên chủ → đóng `UNREACHABLE`. Chuyển `DEPOSITED` / `RENTED` → đóng tất cả (giữ như hiện tại).
  3. Mọi lối đóng báo lỗi kiểu "đã xử lý" (form sửa, nút đổi trạng thái, hàng đợi) đều cộng +5 điểm cho người báo (trừ chính người xử lý) — dùng chung một hàm.
  4. **Given** căn bị xóa, **Then** mọi báo lỗi đang mở của căn chuyển `DISMISSED` (không trừ điểm); hàng đợi không còn bản ghi mồ côi.
* **Ghi chú kỹ thuật:** chuyển phần cộng / trừ điểm từ `ListingReportService.resolve` vào `reports/report-closing.ts`; `closeOpenReports` nhận thêm danh sách lý do cần đóng. Gọi từ `ApartmentService.update`, `updateStatus`, `delete`.

---

### User Story 14.7: Chat AI Hiểu Đúng Khu Vực & Ngân Sách, Chống Spam Khách Ảo
* **Là một:** CTV nhận khách từ link xem phòng.
* **Tôi muốn:** Khách chat được hiểu đúng khu vực và ngân sách (kể cả khách nước ngoài trả bằng USD), và không bị "khách ảo" làm đầy phễu.
* **Để:** Gợi ý căn trong chat và thông báo ghép căn (Story 11.1) thật sự đến với khách chat.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Given** khách nói "tìm căn ở Mỹ An", **Then** nhu cầu lưu `zones: ['Mỹ An']` (không lưu "Mỹ An" vào `districts`); tên quận hợp lệ lưu dạng chuẩn ("nhs" → "Ngũ Hành Sơn"); tên không thuộc Đà Nẵng bị bỏ.
  2. Khách chat có khu vực + ngân sách phù hợp được gợi ý căn trong chat và được ghép khi có căn mới (≥ 80%) giống khách CTV nhập tay.
  3. **Given** khách viết "budget $600/month", **Then** lưu `maxBudget: 600, budgetCurrency: 'USD'`; không còn quy tắc "số < 1.000 là triệu" cho trường hợp khách ghi rõ USD.
  4. **Chống spam:** mỗi IP tạo tối đa 5 phiên chat mới / giờ trên cùng link; khách chỉ được tạo trong CRM từ tin nhắn thứ 2 trở đi hoặc khi khách để lại SĐT.
* **Ghi chú kỹ thuật:** `chat-ai.ts` (prompt + `sanitize` thêm `zones`, `budgetCurrency`), `chat-session.model.ts` (thêm trường), `chat.service.ts` (`suggestApartments` lọc theo `zones`), `chat-lead.ts`. Dùng `canonicalDistrict`, `ZONES` có sẵn.

---

### User Story 14.8: Sửa Lỗi Nhỏ Tìm Kiếm, Hộp Thoại Trùng & Đồng Bộ Khách Đặt Cọc
* **Là một:** CTV / Quản lý dùng hằng ngày.
* **Tôi muốn:** Các thao tác nhỏ cho kết quả đúng như mong đợi.
* **Để:** Không mất thời gian vì kết quả tìm kiếm sai hoặc nút bấm không làm gì.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  1. **Xem căn đã có:** **Given** hộp thoại nghi trùng (Story 13.10), **When** bấm `[👁️ Xem căn đã có]`, **Then** tab mới mở Bảng hàng và tự mở chi tiết đúng căn đó (đọc `?id=` rồi xóa khỏi URL).
  2. **Bóc giá dự phòng:** "nhà 1 trệt 2 lầu dưới 15tr" → tối đa 15 triệu; "tầng 3 trở lên dưới 8tr" → tối đa 8 triệu; "studio dưới 6tr" → 6 triệu (đơn vị `tr` phải là nguyên từ).
  3. **Chip giá không chồng biên:** khoảng giá dùng `[min, max)` (VD 5–8tr = `≥ 5.000.000` và `< 8.000.000`), khớp với phân bố giá trên Dashboard Admin; căn đúng 8.000.000 chỉ thuộc "8–12tr".
  4. **Khách đặt cọc:** **Given** CTV chuyển khách sang "Đã đặt cọc" và chọn căn, **Then** Quản lý có quyền với căn đó nhận thông báo "CTV [tên] báo khách đã cọc căn [tiêu đề]" kèm nút mở căn; trạng thái căn **không** tự đổi (Quản lý xác nhận).
* **Ghi chú kỹ thuật:** `ApartmentsPage.tsx` (đọc query `id` như `openApartmentId`), `natural-search.service.ts` (thêm `(?![a-zà-ỹ])` sau đơn vị), `filter.builder.ts` (`$lt` cho cận trên), `lead.service.ts` + `NotificationService`.

---

## Định nghĩa Hoàn thành của Epic (Definition of Done)
* Cả 8 Story đạt toàn bộ Acceptance Criteria (Story chi tiết: `tasks/STORY-14.1` → `STORY-14.8`).
* `tsc --noEmit` backend & frontend sạch lỗi, `npm run build` frontend thành công.
* Kiểm thử thủ công trên điện thoại: CTV không thấy SĐT đầy đủ ở bất kỳ màn hình nào; người chưa đăng nhập chỉ xem được trang `/p/:slug`.
* Script chuẩn hóa SĐT (14.1) đã chạy thử, có số liệu báo cáo, và chỉ chạy thật khi được đồng ý.
