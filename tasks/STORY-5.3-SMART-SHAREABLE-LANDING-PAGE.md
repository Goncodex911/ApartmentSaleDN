# STORY-5.3: Sinh Landing Page xem phòng tức thì (Smart Shareable Link)

## 1. Mô tả Story (User Story)
* **Là một:** CTV.
* **Tôi muốn:** Tạo một đường link ngắn cho căn hộ, ví dụ `<CLIENT_URL>/p/studio-full-do-hoang-quoc-viet-k7f2m9qa`.
* **Để:** Gửi cho khách mở xem trực tiếp trên điện thoại, giao diện chuyên nghiệp, có thông tin liên hệ của tôi, và biết được khách đã mở link hay chưa.

---

## 2. Tiền điều kiện (Pre-conditions)
1. Story 5.2 đã có `hiddenImages` (ảnh có SĐT nguồn cũ không được hiển thị công khai).
2. Hồ sơ CTV có `name`, `avatarUrl`, `phone`, `zaloPhone`, `zaloLink`, `greetingMessage` (Story 1.3).
3. Biến môi trường `CLIENT_URL` (đã có) là tên miền frontend dùng để sinh link.

---

## 3. Tiêu chí Chấp nhận (Acceptance Criteria - Gherkin)

### AC1: Tạo link chia sẻ theo từng CTV
* **Given:** CTV đã đăng nhập, mở Modal chi tiết căn hộ.
* **When:** CTV chạm `Tạo link xem phòng`.
* **Then:**
  * Backend tìm hoặc tạo bản ghi `ShareLink` duy nhất cho cặp (căn hộ, CTV), với `code` ngẫu nhiên 8 ký tự `[a-z0-9]` (`crypto.randomBytes`). Bấm lại thì vẫn trả về **cùng một link**.
  * Link có dạng `${CLIENT_URL}/p/<slug-tiêu-đề>-<code>`:
    * Slug là tiêu đề bỏ dấu, tối đa 6 từ, đã xóa các chuỗi giống số điện thoại. Slug chỉ để link dễ đọc; hệ thống tra cứu căn hộ bằng `code`.
    * Không dùng `?ref=CTV_CODE` như ví dụ trong Epic vì `code` đã xác định được CTV. Như vậy khách không thể sửa `ref` để đổi sang CTV khác.
  * Giao diện hiện link, số lượt xem (`👁 N lượt xem · lần cuối HH:mm dd/MM`), nút `Copy link` và `Mở thử`.
    * Copy là lần chạm thứ 2 vì iOS không cho ghi Clipboard sau khi đã chờ API trả về.

### AC2: Khách mở link không cần đăng nhập
* **Given:** Khách mở link trên điện thoại.
* **When:** Trang `/p/:slug` tải dữ liệu từ `GET /api/v1/share/public/:code`.
* **Then:** Trang hiển thị bình thường dù không có tài khoản. `code` không tồn tại hoặc căn đã bị xóa → trang "Link không còn hiệu lực".

### AC3: Giao diện chuẩn Mobile
* Ảnh dạng slide **vuốt ngang** (CSS scroll-snap, không cần thư viện), có chấm chỉ số ảnh `2/8`.
* Giá thuê, tiền cọc, phí điện/nước/dịch vụ/gửi xe rõ ràng. Các tiện ích hiển thị dạng chip.
* **Bản đồ khu vực chung:**
  * Nhúng bản đồ OpenStreetMap (iframe, không cần API key).
  * Tâm bản đồ là tọa độ đã **làm tròn theo lưới ~500m**, có vòng tròn mờ ở giữa. Không cắm ghim đúng vị trí nhà.
  * Không có tọa độ → bỏ bản đồ, chỉ ghi phường, quận.
* **Thanh dưới cùng (Bottom Bar)** cố định:
  * Ảnh đại diện + tên CTV.
  * Nút `Gọi ngay` (`tel:`).
  * Nút `Chat Zalo`: dùng `zaloLink` nếu có, nếu không thì `https://zalo.me/<zaloPhone|phone>`.
* Có 3 trạng thái: Loading (skeleton), Lỗi/404, và căn `RENTED` (banner "Căn đã cho thuê – liên hệ CTV để xem căn tương tự").

### AC4: Ẩn hoàn toàn thông tin chủ nhà & nguồn
* API công khai chỉ trả về một đối tượng dữ liệu (DTO) gồm các trường trong **danh sách trắng**: tiêu đề (đã xóa SĐT), giá, cọc, phí, thuộc tính, phường, quận, thành phố, tâm bản đồ đã làm tròn, **ảnh hiển thị** (bỏ `hiddenImages`), trạng thái, ngày trống, và thông tin CTV.
* **Không trả về:** `ownerContact`, `subListings`, `commission`, `description` (mô tả gốc có thể chứa SĐT chủ), `location.address`, tọa độ gốc, `managerId`, `imageHashes`.

### AC5: Đếm lượt truy cập
* Mỗi lần gọi API công khai → `views += 1` và cập nhật `lastViewedAt` (lệnh `$inc` nguyên tử, không bị đếm sai khi nhiều người mở cùng lúc).
* **Không đếm** khi chính CTV sở hữu link mở thử: request có token hợp lệ với `user.id = ctvId`.

---

## 4. Phạm vi Kỹ thuật (Technical Implementation Scope)

### A. Backend
```plaintext
backend/src/modules/share/
├── share-link.model.ts      # [MỚI] { code (unique), apartmentId, ctvId, views, lastViewedAt }, unique index (apartmentId, ctvId)
├── share-link.service.ts    # [MỚI] getOrCreateLink, getPublicListing (DTO whitelist + $inc views)
├── public-listing.util.ts   # [MỚI] slugify, stripPhoneNumbers, làm tròn tọa độ
├── share.controller.ts      # [SỬA] + createLink, getPublicListing
└── share.routes.ts          # [SỬA] + POST /links, GET /public/:code
backend/src/app.ts           # [SỬA] app.use('/api/v1/share', shareRoutes)
```

**API Endpoints:**
| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/v1/share/links` `{ apartmentId }` | Bắt buộc | Tìm/tạo link → `{ url, code, views, lastViewedAt }` |
| GET | `/api/v1/share/public/:code` | Không (optional) | DTO công khai + tăng lượt xem |

### B. Frontend
```plaintext
frontend/src/
├── App.tsx                                  # [SỬA] route công khai /p/:slug
├── api/shareApi.ts                          # [MỚI] createShareLink, getPublicListing, ảnh (chuyển từ 5.2 sang đây)
├── utils/clipboard.ts                       # [MỚI] tách copyText từ CopyShareButton (giờ dùng ở 2 nơi)
├── pages/PublicListingPage.tsx              # [MỚI] trang xem phòng công khai
├── components/public/PhotoSlider.tsx        # [MỚI] slide ảnh scroll-snap
├── components/public/CtvContactBar.tsx      # [MỚI] bottom bar CTV
└── components/apartment/ShareLinkButton.tsx # [MỚI] tạo link + lượt xem + copy, gắn vào ApartmentDetailModal
```

---

## 5. Danh sách Kiểm thử & Định nghĩa Hoàn thành (Definition of Done)
- [ ] Test 1: CTV bấm `Tạo link` 2 lần → cùng một URL.
- [ ] Test 2: Mở link ở cửa sổ ẩn danh → trang hiển thị, `views` tăng 1.
- [ ] Test 3: CTV đang đăng nhập bấm `Mở thử` → `views` không tăng.
- [ ] Test 4: Response của `GET /public/:code` không chứa `ownerContact`, `subListings`, `commission`, `description`, `address`, tọa độ gốc.
- [ ] Test 5: Code không tồn tại → trang "Link không còn hiệu lực".
- [ ] Test 6: Trên điện thoại: vuốt ảnh được, nút `Gọi ngay` mở trình gọi, `Chat Zalo` mở Zalo.
- [ ] `npm run build` backend & frontend thành công. Mọi file ≤ 250 dòng.
- [ ] Tuân thủ [WORKING_RULES.md](../WORKING_RULES.md): không tự ý commit/push.
