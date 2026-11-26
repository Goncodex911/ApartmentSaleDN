# EPIC-19: Khắc Phục Kết Quả QA Audit (QA Audit Fixes & Hardening)

## Mục tiêu
Sửa dứt điểm các lỗi trong [`docs/QA_AUDIT_REPORT.md`](../QA_AUDIT_REPORT.md) (đã xác minh lại ngày 26/11/2026 — Phụ lục A) và 6 vấn đề báo cáo còn thiếu (GAP-01…06), ưu tiên các lỗi làm **hỏng luồng kiếm tiền** (link chia sẻ cho khách), **rò rỉ dữ liệu / bảo mật**, rồi tới thuật toán khử trùng, định vị và hiệu năng.

**Tiêu chí thành công của Epic:**
* Mọi link khách nhận từ Zalo / WhatsApp mở được trang căn, không lộ số nhà, không quảng cáo tiện ích căn không có.
* Không còn đường nào gửi token đăng nhập Telegram ra dịch vụ ngoài.
* Rà soát bản đồ, kết nối Telegram, tìm kiếm trên bản đồ chạy ổn định trên điện thoại.
* Có bộ test tự động cho các hàm thuần quan trọng (khóa tên đường, Plus Code, link chia sẻ, bộ lọc).

---

## Bảng ánh xạ lỗi → Story

| Story | Tên | Mục báo cáo | Ưu tiên | Ước lượng |
| :--- | :--- | :--- | :---: | :---: |
| **19.1** | Link chia sẻ Zalo / WhatsApp đúng & nội dung trung thực | CRIT-01, CRIT-02, MED-02 | P0 | 1,5 ngày |
| **19.2** | Hoàn thiện kết nối Telegram & chặn rò rỉ token | CRIT-03, CRIT-04 (phần còn lại), HIGH-06, GAP-01, GAP-02 | P0 | 1,5 ngày |
| **19.3** | Rà soát bản đồ (Map QA) ổn định | CRIT-05 | P0 | 1 ngày |
| **19.4** | Khóa tên đường giữ số hiệu, chống gộp nhầm | HIGH-01 | P1 | 1 ngày |
| **19.5** | Plus Code đúng cho phía Nam Đà Nẵng | HIGH-02 | P1 | 0,5 ngày |
| **19.6** | Căn Studio (0 phòng ngủ) đúng ở AI & bộ lọc | HIGH-03 | P1 | 0,5 ngày |
| **19.7** | Tìm kiếm trên chế độ Bản đồ đúng & không gọi thừa | HIGH-04, PERF-03 | P1 | 1 ngày |
| **19.8** | Thẻ căn: menu chia sẻ không bị cắt, modal không mở nhầm | HIGH-05 | P1 | 0,5 ngày |
| **19.9** | Gia cố bảo mật vận hành | GAP-03, GAP-04, PERF-04 (cache) | P1 | 1 ngày |
| **19.10** | Sửa lỗi UX & đồng bộ trạng thái | MED-01, 03, 04, 05, 06, 07, 08 | P2 | 1,5 ngày |
| **19.11** | Hiệu năng tải trang & thuật toán | PERF-01, PERF-02 | P2 | 1 ngày |
| **19.12** | Bộ test tự động tối thiểu & dọn nợ kỹ thuật | PERF-04 (test), GAP-05, GAP-06 | P2 | 1 ngày |

**Tổng ước lượng:** ~12 ngày. **Thứ tự đề xuất:** 19.2 (bảo mật Telegram, nhỏ) → 19.1 → 19.3 → 19.8 → 19.4–19.7 → 19.9 → 19.10–19.12.

---

## Chi tiết từng Story

### Story 19.1 — Link chia sẻ Zalo / WhatsApp đúng & nội dung trung thực
**Là** CTV, **tôi muốn** bài đăng Zalo / WhatsApp chứa link mở được và chỉ nói đúng những gì căn có, **để** khách tin tưởng và lượt xem / khách chat được tính cho tôi.
* **AC1 (CRIT-01):** Given CTV mở Zalo 1-chạm / Zalo Studio / WhatsApp 1-chạm / WhatsApp Preview, When nội dung được tạo, Then link trong bài là link chia sẻ hợp lệ `/p/<slug>-<mã 8 ký tự>` lấy từ `POST /api/v1/share/links` (tái dùng `shareApi.createLink`), mở ra trang căn và ghi nhận lượt xem cho CTV. Trong lúc tạo link, nút hiện trạng thái đang tạo; lỗi tạo link → báo lỗi, không đăng bài với link hỏng.
* **AC2 (CRIT-02):** Bài **không bao giờ** chứa `location.address` hay `houseNumber`; chỉ dùng `location.street` + khu vực. Thiếu tên đường → chỉ ghi khu vực, không in "Đang cập nhật địa chỉ".
* **AC3 (CRIT-02):** Tiện ích sinh từ dữ liệu thật (`attributes.furnishing`, thang máy, máy giặt, ban công, `includedServices`) qua `utils/amenities.ts`; căn không có thì không ghi.
* **AC4 (CRIT-02):** Giá USD dùng tỷ giá cấu hình hệ thống (như các màn khác), bỏ `USD_RATE = 25000` ghi cứng; danh mục khu vực của spintax theo `ZONES` chuẩn (`danang.ts`).
* **AC5 (MED-02):** Zalo 1-chạm đếm đúng số ảnh tải thành công; mở Zalo ngay trong thao tác bấm (giữ user-gesture), tải ảnh không chặn việc mở app.
* **Phạm vi:** `frontend/src/utils/zaloPostGenerator.ts`, `whatsappFormatter.ts`, `spintax.ts`, `shareChannel.ts`, `components/apartment/ZaloPostStudioModal.tsx`, `WhatsAppPreviewModal.tsx`, `MultiChannelSharePopover.tsx`.

### Story 19.2 — Hoàn thiện kết nối Telegram & chặn rò rỉ token
**Là** Quản lý / Admin, **tôi muốn** kết nối Telegram không bị mất bước nhập mã, được báo đúng khi phiên lỗi, và không có token nào bị gửi ra ngoài, **để** dùng cào tin an toàn.
* **AC1 (CRIT-03):** Given đang chờ nhập mã OTP, When tải lại trang trên máy tính, Then trang mở thẳng bước nhập mã; tab QR **không** tự tạo mã khi đang có phiên chờ OTP (chọn tab sau khi `session` tải xong).
* **AC2 (CRIT-04 còn lại):** `ingestion.controller.ts` ghi Nhật ký `AI_IMPORT` có `title` cả khi gộp trùng (`DedupService` trả kèm `apartment` = căn master ở nhánh trùng). *Phần cào tin / chuyển tiếp đã sửa ở commit `fa4a252`.*
* **AC3 (HIGH-06):** `getStatus` chỉ coi là "vẫn kết nối" với lỗi mạng tạm thời; lỗi giải mã phiên / thiếu cấu hình → trả `isConnected: false` + thông điệp rõ.
* **AC4 (HIGH-06):** Thông báo "Kết nối Telegram đã bị ngắt" đưa Quản lý tới `/telegram-scraper`, Admin tới `/admin/telegram-scraper` (không vào `/admin/health`) — dùng loại thông báo riêng hoặc trường đường dẫn.
* **AC5 (GAP-01):** Khi Netlify có credit: deploy lại Netlify từ `main` (bỏ `api.qrserver.com`) **hoặc** deploy bản chỉ chuyển hướng sang `pages.dev`. Trước đó: thông báo Quản lý không dùng "Xác nhận 1-chạm" trên link `netlify.app`.
* **AC6 (GAP-02):** Bộ đón tin thời gian thực lưu cấu hình (nhóm, người đăng) vào DB, tự bật lại khi máy chủ khởi động; nếu không bật lại được → báo chuông cho người đã bật.
* **Phạm vi:** `TelegramConnectCard.tsx`, `telegram-userbot.service.ts`, `NotificationBell.tsx`, `telegram-harvest.service.ts`, `dedup.service.ts`, `ingestion.controller.ts`, `server.ts`.

### Story 19.3 — Rà soát bản đồ (Map QA) ổn định
**Là** Admin, **tôi muốn** trang Rà soát bản đồ hiện ảnh, không sập và đếm đúng, **để** chuẩn hóa vị trí hàng loạt nhanh.
* **AC1:** Danh sách chờ hiện ảnh đại diện (`.select(...)` lấy `images`, không phải `media`).
* **AC2:** Căn có `coordinates` rỗng / thiếu không làm sập bản đồ (kiểm tra `length === 2` ở `MapQAPage` và `LocationPicker`); lọc căn thiếu tọa độ bằng `'location.coordinates.1': { $exists: false }`.
* **AC3:** `PATCH` hiệu chỉnh vị trí validate bằng Zod (2 số hữu hạn) → sai kiểu trả 400, không 500.
* **AC4:** Đổi bộ lọc khu vực → tự chọn căn đầu của danh sách mới, thanh Lưu không biến mất; số đếm tổng / đã chuẩn theo khu vực đang lọc.
* **AC5:** Thanh thao tác đáy không tràn màn hình < 480px.
* **Phạm vi:** `apartment.service.ts` (`getMapQAPending`, `calibrateLocation`), `apartment.controller.ts`, `apartment.validation.ts`, `MapQAPage.tsx`, `LocationPicker.tsx`.

### Story 19.4 — Khóa tên đường giữ số hiệu, chống gộp nhầm
**Là** hệ thống khử trùng, **tôi muốn** phân biệt "An Thượng 1" với "An Thượng 38" và hiểu "Đường 2/9", **để** không gộp nhầm căn khác đường và định vị đúng.
* **AC1:** `streetKey` giữ token số **thuộc tên đường** (số đứng sau tên: "an thuong 1", "my an 3"; dạng ngày "2/9", "30/4"), vẫn bỏ số nhà đứng đầu / sau tiền tố K, H, Số, Kiệt.
* **AC2:** `streetKey(ADDRESS_PLACEHOLDER) === ''`; script `geocode-streets.ts` bỏ căn đã xóa (`deletedAt: null`) và chuỗi giữ chỗ.
* **AC3:** Ghi chú di trú: khóa `Geocache` cũ ("an thuong|…") không còn khớp → script chạy lại geocode cho các đường có số.
* **AC4:** Bảng test ≥ 12 ca (An Thượng 1/38, Mỹ An 3, 2/9, 30/4, "K12/5 Lê Quang Đạo", placeholder…).
* **Phạm vi:** `dedup/street-key.ts`, `utils/street.ts`, `scripts/geocode-streets.ts`, test mới.

### Story 19.5 — Plus Code đúng cho phía Nam Đà Nẵng
* **AC1:** Mã Plus Code rút gọn (4 hoặc 6 ký tự trước dấu `+`) khôi phục theo thuật toán *recover nearest* của Open Location Code với điểm tham chiếu tâm Đà Nẵng (16,054; 108,202) — không ghép cứng `7P8C`.
* **AC2:** Test: mã khu FPT City / Hòa Hải / Hội An cho tọa độ < 16,0°N nằm trong biên Đà Nẵng; mã Hải Châu vẫn đúng như cũ.
* **Phạm vi:** `backend/src/utils/google-maps.ts`, `scripts/test-google-maps.ts`.

### Story 19.6 — Căn Studio (0 phòng ngủ) đúng ở AI & bộ lọc
* **AC1:** AI bóc tách `bedrooms: 0` → lưu 0 (chỉ mặc định 1 khi giá trị không phải số).
* **AC2:** Chat AI và `FilterBuilder` lọc được `bedrooms = 0` (`!== undefined && !== null`).
* **AC3:** Test hàm chuẩn hóa: 0 → 0, "2" → 2, null → mặc định.
* **Phạm vi:** `gemini.service.ts`, `chat.service.ts`, `search/filter.builder.ts`.

### Story 19.7 — Tìm kiếm trên chế độ Bản đồ đúng & không gọi thừa
**Là** CTV, **tôi muốn** gõ "studio Hải Châu dưới 6tr" ở chế độ Bản đồ và thấy đúng các căn thỏa điều kiện, **để** không phải chuyển qua danh sách.
* **AC1:** `/apartments/map-pins` hiểu câu tự nhiên (giá, phòng ngủ, khu vực) giống danh sách — dùng chung bộ phân tích của tìm kiếm tự nhiên; kết quả ghim khớp danh sách.
* **AC2:** Ở chế độ Bản đồ, `useApartmentSearch` tạm dừng (không gọi danh sách / Gemini); chuyển về danh sách mới tải.
* **AC3:** Số căn hiển thị ở chế độ bản đồ lấy từ số ghim.
* **Phạm vi:** `map-pins.service.ts`, `search.service.ts`, `useApartmentSearch.ts`, `useMapPins.ts`, `ApartmentsPage.tsx`.

### Story 19.8 — Thẻ căn: menu chia sẻ không bị cắt, modal không mở nhầm
* **AC1:** Modal Zalo Studio / WhatsApp Preview render qua `createPortal` ra `document.body`; bấm trong modal **không** mở chi tiết căn / không chọn căn vào Tour.
* **AC2:** Menu chia sẻ hiển thị trọn trên màn 360–390px (portal hoặc tự chọn hướng mở theo không gian còn lại), không bị `overflow-hidden` của thẻ cắt.
* **Phạm vi:** `ApartmentCard.tsx`, `MultiChannelSharePopover.tsx`, `ZaloPostStudioModal.tsx`, `WhatsAppPreviewModal.tsx`.

### Story 19.9 — Gia cố bảo mật vận hành
* **AC1 (GAP-03):** IP khách lấy đúng cho cả 2 đường vào: ưu tiên header do hạ tầng Render đặt (VD `CF-Connecting-IP` / `True-Client-IP` của lớp Cloudflare phía Render — cần xác minh trên Render) thay vì đếm tầng `X-Forwarded-For`; giả `X-Forwarded-For` không đổi được IP ghi Nhật ký / bộ giới hạn.
* **AC2 (GAP-04):** Thêm `Content-Security-Policy` cho bản Cloudflare (`_headers`): `script-src 'self'`, `connect-src` chỉ backend Render + Cloudinary + CARTO + Nominatim, `frame-ancestors 'none'` — kiểm tra không vỡ bản đồ / upload / PWA.
* **AC3 (PERF-04):** Cache ngoại tuyến danh sách căn gắn với người dùng (khóa theo user / xóa khi đổi người đăng nhập hoặc đổi quyền ở lần `/auth/me` kế tiếp).
* **Phạm vi:** `backend/src/app.ts`, `utils/request-context.ts`, `frontend/public/_headers`, `vite.config.ts`, `utils/offlineCache.ts`.

### Story 19.10 — Sửa lỗi UX & đồng bộ trạng thái
* **AC1 (MED-01):** Xóa trống SĐT Zalo / Lời chào rồi Lưu → giá trị cũ bị xóa (gửi `null` / chuỗi rỗng, backend chấp nhận để xóa); `TelegramLinkSection` tự kiểm tra lại trạng thái khi quay về tab (`visibilitychange`).
* **AC2 (MED-03):** Chỉ ghi chú CRM "Đã gửi căn gợi ý" khi CTV thực sự bấm gửi / chia sẻ, không ghi khi mở xem; `LeadDetailModal` cập nhật ngay.
* **AC3 (MED-04):** "Tải thêm" bỏ qua khi đang tải, khử trùng theo `_id`; kéo để làm mới không kích hoạt khi chạm trong vùng cuộn con.
* **AC4 (MED-05):** Dọn media tin bị từ chối kiểm tra cả `data.videos`; thu hồi thông báo chung lỗi → hiện thông báo.
* **AC5 (MED-06):** `inferDanangZone` trả đủ `An Hải`, `Khuê Mỹ`, `Hòa Xuân`; ranh giới Sơn Trà không lấn bờ Tây sông Hàn; sửa comment User-Agent.
* **AC6 (MED-07):** Hộp chi tiết căn nhận cập nhật realtime cả khi mở từ bản đồ (nghe sự kiện `APARTMENT_REALTIME` theo `_id` căn đang mở).
* **AC7 (MED-08):** Ô giá kiểm duyệt cảnh báo giá < 500.000đ ("Bạn nhập 6 — có phải 6 triệu?"); `estimateMonthlyCost` chặn `usdRate <= 0`, phân biệt `fees.water === 0` (miễn phí) với chưa nhập.

### Story 19.11 — Hiệu năng tải trang & thuật toán
* **AC1 (PERF-01):** Các trang Admin, Cào tin Telegram, Kiểm duyệt, Rà soát bản đồ tải theo nhu cầu (`React.lazy` + `Suspense` có skeleton); bundle chính < 500 kB (trước gzip), không còn cảnh báo Vite.
* **AC2 (PERF-02):** Tìm theo bán kính dự phòng: lọc căn có tọa độ, sắp theo khoảng cách bằng truy vấn địa lý (không `limit(100)` ngẫu nhiên).
* **AC3 (PERF-02):** So khớp ảnh ghép 1-1 (mỗi ảnh cũ chỉ khớp 1 ảnh mới); giới hạn tập so sánh (VD 500 căn mới nhất cùng khu).

### Story 19.12 — Bộ test tự động tối thiểu & dọn nợ kỹ thuật
* **AC1:** Thêm `vitest` (devDependency) và script `npm test` cho backend + frontend; test cho `streetKey`, `decodePlusCode`, `buildPhoneRegex` / `matchesTargetListing`, `toTelegramError`, `zaloPostGenerator`, `FilterBuilder` (bedrooms 0), link chia sẻ.
* **AC2 (GAP-05):** Sau khi Netlify deploy lại bản mới: xóa trường `logs` tương thích cũ trong `TelegramScrapeTaskService.toPublic`.
* **AC3 (GAP-06):** Quyết định giấy phép bản đồ: chuyển key CARTO sang gói thương mại **hoặc** đổi sang nguồn bản đồ cho phép dùng thương mại miễn phí; cập nhật `EXTERNAL_CONFIG.md`.

---

## Rủi ro & lưu ý
* **Story 19.4** đổi khóa tên đường → các căn đã lưu có thể không còn gộp như trước; chạy thử trên DB phát triển và so sánh số cặp trùng trước khi deploy.
* **Story 19.9 AC2 (CSP)** dễ làm vỡ bản đồ / upload nếu thiếu tên miền → kiểm tra kỹ trên điện thoại.
* **Story 19.2 AC5** phụ thuộc credit Netlify (tháng sau) — trước đó chỉ giảm thiểu bằng thông báo.

## Ngoài phạm vi
* Chuyển backend khỏi Render.
* Thiết kế lại giao diện Bảng hàng.
