# EPIC-20: Nâng Cấp Theo Phản Hồi Người Dùng — Nhập Tin AI, Bản Đồ & Form (User Feedback: Ingestion, Maps & Listing Form)

## Mục tiêu
Xử lý phản hồi của Quản lý / CTV ngày 28/11/2026 (ghi chú điện thoại + ảnh màn hình "Nhập tin bằng AI"):
1. Nhập tin AI **không gộp nhầm** các căn khác nhau trong cùng tòa / cùng môi giới.
2. **Tiêu đề** lấy đúng dòng đầu của tin mẫu (VD `1BR Apartment for rent – Son Tra`), không tự viết lại bằng tiếng Việt.
3. **Tìm địa chỉ ngay trên bản đồ** của form, không phải mở Google Maps rồi copy link — vẫn giữ vị trí chính xác.
4. **Chỉ đường** đi theo link Google Maps đã dán, không theo tọa độ ước lượng.
5. Form nhập nhanh hơn: Studio bỏ số phòng ngủ, số phòng chọn nhanh, thứ tự trường theo mẫu tin; lọc theo m²; xem ảnh ngay trên thẻ căn.

**Tiêu chí thành công của Epic:**
* Dán 2 tin khác căn (khác số phòng ngủ / diện tích) cùng SĐT, cùng đường → ra **2 căn riêng**, không bị gộp.
* Dán tin theo mẫu tiếng Anh → tiêu đề căn trùng nguyên văn dòng đầu của tin.
* Đặt vị trí căn mà không rời app, vị trí lưu là `EXACT`.
* Căn có link Google Maps → nút Chỉ đường mở đúng điểm của link.

---

## Phân tích phản hồi & hiện trạng (đã đối chiếu code 28/11/2026)

### A. Tin chung tòa có thông tin giống căn đã có — hệ thống đang xử lý thế nào?
Luồng **Nhập tin bằng AI** (`QuickPasteModal` → `ingestion.controller.ts` → `DedupService.processListing`, `dedup.service.ts`):

| Bước | Điều kiện | Kết quả |
| :--- | :--- | :--- |
| Tầng 1 — Trùng xác định | Cùng **SĐT chủ** + cùng **quận** + cùng **tên đường** (`sameStreet`, khóa đường chính xác từ CE-03) | **Tự gộp**: tin mới thành *nguồn phụ* (`subListings`) của căn Master |
| Tầng 2 — Trùng ảnh | ≥ 2 ảnh trùng dHash (1 ảnh nếu tin chỉ có 1 ảnh), cùng quận, căn cập nhật trong 180 ngày | **Tự gộp** như trên |
| Không trùng | — | Tạo căn mới. Nếu tin **không có tên đường** mà SĐT đã có căn → tạo mới + cờ "Có thể trùng" |

**Vấn đề:** Tầng 1 **không so** loại căn, số phòng ngủ, diện tích, số phòng / tầng, tên tòa. Môi giới thường đăng nhiều căn trong **cùng một tòa** (cùng SĐT, cùng đường "Mỹ An 7") → căn thứ 2 trở đi **bị gộp vào căn đầu tiên**:
* Tin mới **không được lưu thành căn riêng**: chỉ nằm trong `subListings`; giá, số phòng, diện tích, ảnh của tin mới **không** hiện trên Bảng hàng.
* Màn hình chỉ báo "Tin trùng — đã gộp vào căn có sẵn", **không nói gộp vào căn nào**, không có cách **hoàn tác / tách ra**.
* Ảnh màn hình phản hồi là đúng ca này: tin `1BR … Address: My An 7`, cùng SĐT → bị gộp.

→ Story **20.1** (luật trùng phải so "chữ ký căn") và **20.2** (cho người dùng thấy & quyết định).

### B. Tiêu đề tin AI
`gemini.prompt.ts` yêu cầu AI **tự viết tiêu đề tiếng Việt** ("Cho thuê căn 2PN …"). Tin mẫu của đội đã có tiêu đề chuẩn ở dòng đầu (`1BR Apartment for rent – Son Tra`) → bị thay mất. → Story **20.3**.

### C. Tìm địa chỉ trên bản đồ
`LocationPicker.tsx` (Story 17.4) hiện chỉ có: kéo bản đồ, nút Vệ tinh, GPS hiện tại, reverse geocoding — **không có ô tìm kiếm**. Muốn đúng vị trí, người dùng phải sang Google Maps tìm rồi copy link dán vào ô "Link Google Maps".
**Giữ độ chính xác bằng cách nào:** ô tìm kiếm chỉ dùng để **đưa bản đồ tới gần đúng chỗ**; vị trí lưu vẫn là **điểm ghim người dùng xác nhận** (`EXACT`), như hiện nay. Ngoài ra ô tìm kiếm nhận luôn **link Google Maps / Plus Code** → giải mã bằng `resolveMapCoordinates` có sẵn → bay đúng điểm. → Story **20.4**.

Hai phương án nguồn dữ liệu tìm kiếm (cần Project Owner chọn):

| | Phương án 1 — OSM (Nominatim/Photon) qua backend | Phương án 2 — Google Places Autocomplete |
| :--- | :--- | :--- |
| Chi phí | Miễn phí | Cần API key + bật billing Google Cloud (có hạn mức miễn phí, kiểm tra bảng giá hiện hành) |
| Độ phủ Đà Nẵng | Tốt với **tên đường**, điểm mốc; yếu với tên tòa căn hộ dịch vụ, số nhà trong kiệt | Tốt nhất: tên tòa, khách sạn, số nhà |
| Giới hạn | Nominatim ≤ 1 req/s, **cấm gợi ý theo từng phím** → tìm khi bấm Enter, có cache | Gợi ý theo từng phím |
| Độ chính xác cuối | Như nhau — đều phải ghim xác nhận | Như nhau |

**✅ Quyết định 28/11/2026 (Project Owner): chọn Phương án 1** — OSM Nominatim qua backend, miễn phí, dùng lại `street-geocoder.ts`, cộng với dán link Google Maps ngay trong ô tìm. Phương án 2 chỉ xem xét lại nếu người dùng vẫn thấy thiếu tên tòa.
**Cấu hình:** không cần API key. Dùng lại biến tùy chọn `NOMINATIM_USER_AGENT` đã có trong `.env.example` (định danh ứng dụng theo chính sách Nominatim); không khai báo thì dùng mặc định `RoomMaster-Danang/1.0`.

### D. "Bấm Chỉ đường thì theo tọa độ map lỏ dù đã dán link Google Maps"
* Mọi nút Chỉ đường dùng `location.coordinates` của căn (`MapQuickCard.tsx` `directionsUrl`, `NeighborhoodMap.tsx`, `tourRoute.ts`); chỉ nút "Mở Google Maps" trong chi tiết nội bộ mới ưu tiên `location.mapUrl`.
* `prepareLocation` (`apartment-location.ts`) chỉ đổi link → tọa độ khi link **giải mã được**; giải mã thất bại (link dạng tên địa điểm không kèm tọa độ, link hết hạn…) thì **lặng lẽ** rơi về tọa độ theo tên đường / tâm khu vực → Chỉ đường đưa tới vị trí ước lượng.
* Tin nhập bằng AI có link Google Maps trong nội dung **không được tách** ra `location.mapUrl`.
→ Story **20.5**.

### E. Các mục còn lại trong ghi chú
| Phản hồi | Hiện trạng | Story |
| :--- | :--- | :--- |
| Studio thì không cần nhập số phòng ngủ | Ô "Phòng ngủ" luôn hiện & bắt buộc (`ApartmentModal.tsx` ~dòng 122, 232) | 20.6 |
| Số phòng ngủ, phòng tắm thành lựa chọn cho nhanh | Đang là ô gõ số | 20.6 |
| Lọc theo m² | **Chưa có** (FilterSheet, `useApartmentSearch`, `filter.builder.ts` không có diện tích; dữ liệu có sẵn ở `attributes.area`) | 20.7 |
| Xem ảnh như Zalo, bấm thẳng vào ảnh không cần vào chi tiết | Thẻ căn là carousel 5 ảnh; bấm ảnh → mở chi tiết. Lightbox (`MediaLightbox`) chỉ có trong chi tiết | 20.8 |
| Gom các trường theo thứ tự của tin mẫu | Form: Ảnh → Tiêu đề + Giá → Vị trí → Căn hộ → Tiện ích → Biển & thời hạn → Phí → Chủ nhà | 20.9 |
| ~~Khoảng cách tới biển tự quy ra~~, ~~dán post tự điền form~~ | Người dùng đã gạch — đã có (`distanceToBeachM`, Nhập tin bằng AI) | — |

---

## Danh mục User Stories

Cột **Người làm**: theo quy ước dự án, việc **dễ** (sửa nhỏ, phạm vi 1–2 file, không đụng logic nghiệp vụ) giao **Antigravity** (`agy`), Claude kiểm tra diff + build trước khi báo cáo; việc **khó** do Claude làm.

| Story | Tên | Ưu tiên | Độ khó | Người làm | Ước lượng |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **20.1** | Không gộp nhầm căn khác nhau cùng tòa / cùng môi giới | P0 | Khó | Claude | 1,5 ngày |
| **20.2** | Màn kết quả nhập tin: thấy căn bị gộp, tách thành căn mới | P0 | Trung bình | Claude | 1 ngày |
| **20.3** | Tiêu đề lấy nguyên dòng đầu của tin mẫu | P0 | Dễ | Antigravity | 0,5 ngày |
| **20.4** | Ô tìm địa chỉ / dán link ngay trên bản đồ chọn vị trí | P1 | Khó | Claude | 1,5 ngày |
| **20.5** | Chỉ đường theo link Google Maps đã dán | P1 | Trung bình | Claude | 1 ngày |
| **20.6** | Studio ẩn phòng ngủ; chọn nhanh số phòng ngủ / tắm | P1 | Dễ | Antigravity | 0,5 ngày |
| **20.7** | Lọc theo diện tích m² | P1 | Trung bình | Claude | 1 ngày |
| **20.8** | Xem ảnh trực tiếp trên thẻ căn | P2 | Trung bình | Claude | 1 ngày |
| **20.9** | Sắp xếp form theo thứ tự tin mẫu | P2 | Dễ | Antigravity | 0,5 ngày |

**Tổng ước lượng:** ~9 ngày. **Thứ tự đề xuất:** 20.3 → 20.1 → 20.2 → 20.5 → 20.6 → 20.9 → 20.4 → 20.7 → 20.8.

---

## Chi tiết từng Story

### Story 20.1 — Không gộp nhầm căn khác nhau cùng tòa / cùng môi giới
**Là** Quản lý, **tôi muốn** các căn khác nhau trong cùng tòa của cùng môi giới được lưu thành căn riêng, **để** Bảng hàng không mất căn và CTV gửi khách đúng căn.
* **AC1:** Given đã có căn A (SĐT X, đường "Mỹ An 7", 1PN, 45 m²), When nhập tin B cùng SĐT X, cùng đường nhưng **khác số phòng ngủ** hoặc **diện tích lệch > 10%** hoặc **khác loại căn** (Studio / Căn hộ / Duplex…), Then tạo **căn mới** B, không gộp.
* **AC2:** Given tin B và căn A ghi **số phòng / tầng / tên tòa** khác nhau (VD "P.502" vs "P.803"), Then không gộp. AI bóc thêm trường `unitLabel` (số phòng / tầng / tên tòa nếu tin có ghi), không đoán.
* **AC3:** Given cùng SĐT + đường + loại căn + số phòng ngủ + diện tích lệch ≤ 10% (hoặc cả hai không có diện tích), Then vẫn gộp như hiện nay (đây là đăng lại cùng căn). **Giá khác nhau không phải lý do tách** (môi giới đổi giá).
* **AC4:** Given cùng SĐT + đường nhưng **thiếu dữ liệu để phân biệt** (một bên không có số phòng ngủ và diện tích), Then **không tự gộp**: tạo căn mới + cờ `needsReview` "Có thể trùng căn <tiêu đề A>" và trả kèm `possibleDuplicateOf` (mọi nguồn). Hộp chọn gộp / giữ riêng cho tin dán nhanh làm ở Story 20.2.
* **AC5:** Tầng 2 (trùng ảnh) cũng áp dụng loại trừ AC1 (khác số phòng ngủ / loại căn → không gộp dù ảnh giống — ảnh sảnh / hồ bơi chung tòa).
* **AC6:** Hàm so "chữ ký căn" là hàm thuần, có test ≥ 10 ca (cùng căn đăng lại, khác PN, khác m², lệch m² 8% / 15%, Studio vs 1PN, thiếu dữ liệu, khác số phòng P.502/P.803, ảnh chung tòa).
* **AC7:** Script rà soát (chỉ đọc, như `audit-street-dedup.ts`) liệt kê các căn Master có `subListings` khác số phòng ngủ / diện tích → nghi gộp nhầm trong quá khứ. Không tự tách.
* **Phạm vi:** `dedup.service.ts`, file mới `dedup/unit-signature.ts` (+ test), `gemini.prompt.ts` / `gemini.service.ts` (trường `unitLabel`), `dedup.types.ts`, script mới `src/scripts/audit-unit-merge.ts`.

### Story 20.2 — Màn kết quả nhập tin: thấy căn bị gộp, tách thành căn mới
**Là** Quản lý / CTV dán tin, **tôi muốn** biết tin của tôi bị gộp vào căn nào và đổi lại được nếu sai, **để** không mất căn.
* **AC1:** Kết quả "Tin trùng" hiện **tiêu đề + ảnh đại diện + lý do** (trùng SĐT & đường / trùng ảnh) của căn đã gộp, có nút **Xem căn** mở chi tiết.
* **AC2:** Nút **"Không phải căn này — tạo căn mới"**: tách nguồn phụ vừa gộp khỏi Master thành căn mới (dùng dữ liệu AI đã bóc), ghi Nhật ký `AI_IMPORT` với `split: true`. Chỉ người vừa nhập hoặc Quản lý được tách.
* **AC3:** Kết quả có `possibleDuplicateOf` (Story 20.1 AC4) hiện hộp chọn **"Giữ là căn riêng"** / **"Gộp vào căn <A>"** (tái dùng `DuplicateConfirmDialog` nếu phù hợp); chọn gộp → căn vừa tạo chuyển thành nguồn phụ của A và bị xóa mềm.
* **AC4:** Trạng thái loading / lỗi rõ ràng; nút ≥ 44px; chạy tốt trên điện thoại.
* **Phạm vi:** `QuickPasteModal.tsx`, `apartmentApi.ts` / API nhập tin, `ingestion.controller.ts` + route mới `POST /ingestion/:masterId/split` (hoặc tham số `forceCreate`), `dedup.service.ts`.

### Story 20.3 — Tiêu đề lấy nguyên dòng đầu của tin mẫu
**Là** Quản lý, **tôi muốn** tiêu đề căn giữ đúng dòng đầu của tin mẫu (VD `1BR Apartment for rent – Son Tra`), **để** đồng bộ với bài đăng của đội và khách nước ngoài đọc được.
* **AC1:** Given tin có dòng đầu (dòng khác rỗng đầu tiên) **không phải** dòng thông số (không bắt đầu bằng số / emoji số `1️⃣…🔟` / nhãn `Type:`, `Rooms:`, `Address:`…), Then `title` = dòng đó, giữ nguyên chữ hoa/thường và dấu `–`, chỉ cắt khoảng trắng thừa, tối đa 120 ký tự.
* **AC2:** Given tin không có dòng tiêu đề như AC1, Then dùng tiêu đề AI như hiện nay (fallback), không đổi hành vi cũ.
* **AC3:** Không lấy dòng chứa SĐT / link làm tiêu đề.
* **AC4:** Prompt AI bỏ yêu cầu "tiêu đề tiếng Việt": khi phải tự đặt tiêu đề thì **dùng cùng ngôn ngữ với tin**.
* **AC5:** Test hàm thuần `extractPostTitle` ≥ 6 ca: tin mẫu tiếng Anh ("1BR Apartment for rent – Son Tra", "1BR apartment in My An near river"), tin bắt đầu bằng `1️⃣ Type:`, tin tiếng Việt có dòng đầu, dòng đầu là SĐT, tin 1 dòng.
* **Phạm vi:** `gemini.service.ts` (gán `title` sau khi parse), file mới `ingestion/post-title.ts` (+ test), `gemini.prompt.ts` (dòng `title`).

### Story 20.4 — Ô tìm địa chỉ / dán link ngay trên bản đồ chọn vị trí
**Là** CTV / Quản lý, **tôi muốn** gõ địa chỉ hoặc dán link Google Maps ngay trên bản đồ "Đặt vị trí chính xác", **để** không phải chuyển app mà vị trí vẫn chính xác.
* **AC1:** `LocationPicker` có ô tìm kiếm phía trên bản đồ (chữ ≥ 16px để iPhone không tự phóng to). Bấm Enter / nút Tìm → gọi backend, hiện tối đa 5 kết quả trong Đà Nẵng; chọn 1 kết quả → bản đồ bay tới (zoom 18).
* **AC2:** Dán **link Google Maps** hoặc **Plus Code** vào ô → backend giải mã bằng `resolveMapCoordinates` / `decodePlusCode` → bay đúng điểm (zoom 19), báo "Đã định vị theo link Google Maps".
* **AC3:** Vị trí lưu luôn là tâm ghim khi bấm **Xác nhận vị trí** (`EXACT`) — kết quả tìm kiếm chỉ để di chuyển bản đồ, không tự lưu.
* **AC4:** Backend `GET /api/v1/geo/search?q=` (yêu cầu đăng nhập), Phương án 1 — Nominatim qua hàng đợi chung ≤ 1 req/s (dùng chung với `street-geocoder.ts`) + cache, giới hạn viewbox Đà Nẵng; không gửi SĐT / thông tin chủ. Rate limit theo người dùng. Không thêm biến môi trường mới (dùng lại `NOMINATIM_USER_AGENT`).
* **AC5:** Không có kết quả → "Không tìm thấy — thử tên đường hoặc dán link Google Maps"; lỗi mạng / Nominatim quá tải → báo lỗi, bản đồ vẫn kéo và ghim được.
* **Phạm vi:** `LocationPicker.tsx`, route + controller + service mới trong `modules/search/` (tái dùng `street-geocoder.ts`, `google-maps.ts`).

### Story 20.5 — Chỉ đường theo link Google Maps đã dán
**Là** CTV dẫn khách, **tôi muốn** nút Chỉ đường đưa tới đúng điểm của link Google Maps chủ nhà gửi, **để** không dẫn khách sai chỗ.
* **AC1:** Căn có `location.mapUrl` → mọi nút Chỉ đường / Mở Google Maps nội bộ (`MapQuickCard`, chi tiết căn, lộ trình nếu chỉ 1 căn) mở **link đã dán**; không có link → dùng tọa độ như hiện nay. Trang khách công khai `/p/:slug` **giữ nguyên** bán kính bảo mật (không lộ link chủ).
* **AC2:** Lưu căn với link Google Maps **không giải mã được** → API trả cảnh báo, form hiện "Không đọc được vị trí từ link — vui lòng ghim trên bản đồ" (không lặng lẽ dùng tọa độ ước lượng mà vẫn báo "chính xác").
* **AC3:** Nhập tin AI: link Google Maps trong nội dung tin được tách vào `location.mapUrl` và giải mã → `geoPrecision = EXACT` nếu thành công.
* **AC4:** Script chỉ đọc liệt kê căn có `mapUrl` nhưng `geoPrecision ≠ EXACT` (để Admin xử lý tại Map QA).
* **Phạm vi:** `MapQuickCard.tsx`, `ApartmentDetailModal.tsx`, `tourRoute.ts`, `apartment-location.ts`, `apartment.service.ts` (trả cảnh báo), `LocationSection.tsx`, `dedup.service.ts` (tách link), script mới.

### Story 20.6 — Studio ẩn phòng ngủ; chọn nhanh số phòng ngủ / tắm
**Là** người nhập căn trên điện thoại, **tôi muốn** chọn số phòng bằng 1 chạm và không phải nhập phòng ngủ cho Studio, **để** nhập nhanh hơn.
* **AC1:** Chọn Loại căn = Studio → ẩn ô Phòng ngủ, gửi `bedrooms = 0` (đúng quy ước Story 19.6); đổi sang loại khác → hiện lại, mặc định 1.
* **AC2:** Phòng ngủ là nhóm nút chọn `1 · 2 · 3 · 4 · 5+`; Phòng tắm `1 · 2 · 3 · 4+`. "5+" / "4+" mở ô nhập số. Nút ≥ 44px, có trạng thái đang chọn rõ ràng, dùng được bằng bàn phím.
* **AC3:** Sửa căn cũ có số ngoài danh sách (VD 6 PN) → hiển thị đúng ở "5+".
* **Phạm vi:** `ApartmentModal.tsx` (và `formFields.tsx` nếu tách component nhóm nút).

### Story 20.7 — Lọc theo diện tích m²
**Là** CTV, **tôi muốn** lọc căn theo diện tích, **để** đáp ứng khách cần căn rộng / nhỏ.
* **AC1:** FilterSheet có mục Diện tích với các mức nhanh (`< 30`, `30–50`, `50–80`, `> 80` m²) và ô tối thiểu / tối đa.
* **AC2:** API tìm kiếm nhận `minArea`, `maxArea` (validate số dương, min ≤ max) → lọc `attributes.area`; căn chưa có diện tích **không** hiện khi đang lọc diện tích.
* **AC3:** Có chip "Diện tích 30–50 m²" xóa được; giữ trên URL như các bộ lọc khác; áp dụng cả chế độ Bản đồ.
* **Phạm vi:** `FilterSheet.tsx`, `filterChips.ts`, `useApartmentSearch.ts`, `search.controller.ts`, `filter.builder.ts` (+ test).

### Story 20.8 — Xem ảnh trực tiếp trên thẻ căn
**Là** CTV, **tôi muốn** bấm vào ảnh trên thẻ căn là xem ảnh toàn màn hình ngay (như album Zalo), **để** lọc nhanh căn hợp khách mà không mở chi tiết.
* **AC1:** Bấm vào ảnh trong carousel thẻ căn → mở `MediaLightbox` đúng ảnh đang xem, vuốt xem tiếp toàn bộ ảnh / video của căn; bấm vào phần chữ của thẻ vẫn mở chi tiết.
* **AC2:** Vuốt ngang carousel không mở lightbox (giữ logic chống bấm nhầm hiện có); ảnh ẩn (`hiddenImages`) không hiện với CTV.
* **AC3:** Chế độ danh sách gọn: ảnh nhỏ hiện số ảnh "+N", bấm → lightbox.
* **AC4:** Đóng lightbox bằng vuốt xuống / nút X; tôn trọng `prefers-reduced-motion`.
* **Phạm vi:** `ApartmentCard.tsx`, `CardPhotoCarousel.tsx`, tái dùng `MediaLightbox`.

### Story 20.9 — Sắp xếp form theo thứ tự tin mẫu
**Là** người nhập căn, **tôi muốn** các trường trong form theo đúng thứ tự tin mẫu, **để** nhìn tin gốc nhập từ trên xuống không phải nhảy lên xuống.
* **AC1:** Thứ tự mới: Ảnh → Tiêu đề → **Loại căn → Phòng ngủ / tắm → Diện tích** → **Địa chỉ** (vị trí) → **Cách biển** → **Giá (VNĐ, USD)** → **Thuê tối thiểu** → **Ngày trống** (`availableDate`, nếu form đã có) → Tiện ích & điều kiện khác → Phí hàng tháng → Liên hệ (chủ nhà).
* **AC2:** Chỉ đổi vị trí hiển thị; validate, giá trị mặc định và dữ liệu gửi lên **không đổi**. Build frontend không lỗi.
* **Phạm vi:** `ApartmentModal.tsx`, `MarketFieldsSection.tsx` (tách "Cách biển" và "Giá USD / Thuê tối thiểu" để đặt đúng chỗ).

---

## Rủi ro & Ghi chú
* **20.1 thay đổi luật gộp**: có thể làm tăng số căn trùng thật (khi tin đăng lại thiếu số phòng / diện tích). Giảm thiểu bằng AC4 (cờ "Có thể trùng" + người dùng chọn), theo dõi số tin `MERGED_DUPLICATE` / `CREATED` trên Dashboard 1 tuần sau khi phát hành.
* **20.4 Nominatim**: chính sách cấm gợi ý theo từng phím → bắt buộc tìm khi bấm, qua backend có cache. Máy chủ công cộng giới hạn 1 req/s cho cả hệ thống → nhiều người tìm cùng lúc sẽ phải chờ vài giây.
* **Dữ liệu cũ**: các căn đã gộp nhầm trước đây chỉ được **liệt kê** (script 20.1 AC7), tách thủ công bằng nút ở 20.2 — không tự sửa DB.

## Định nghĩa Hoàn thành Toàn Epic (DoD)
* Mọi AC đạt; `npm run build` + `npm run test` ở backend và frontend không lỗi.
* Hàm thuần mới (`unit-signature`, `post-title`, bộ lọc diện tích) có test.
* Kiểm thử thật trên điện thoại: dán 2 tin cùng tòa khác căn → 2 căn; dán tin mẫu → đúng tiêu đề; tìm / dán link trên bản đồ → lưu `EXACT`; Chỉ đường mở đúng link.
* Story do Antigravity làm đã được Claude rà diff trước khi báo cáo; mọi commit do Project Owner duyệt.
