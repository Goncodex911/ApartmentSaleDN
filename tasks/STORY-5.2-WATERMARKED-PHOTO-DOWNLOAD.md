# STORY-5.2: Tải trọn bộ ảnh & Tự động chèn Watermark CTV

## 1. Mô tả Story (User Story)
* **Là một:** CTV gửi ảnh căn hộ cho khách qua Zalo/Messenger.
* **Tôi muốn:** Bấm "Tải toàn bộ ảnh" để nhận tất cả ảnh của căn hộ, mỗi ảnh tự động có số điện thoại của tôi ở góc dưới.
* **Để:** Khách không thể lấy ảnh đem hỏi môi giới khác hoặc chủ nhà khác.

---

## 2. Tiền điều kiện (Pre-conditions)
1. `Apartment.images` lưu URL ảnh (Cloudinary hoặc nguồn ingestion).
2. `sharp` đã có trong backend (Story 3.2). `GEMINI_API_KEY` đã cấu hình (Story 3.1).
3. Hồ sơ CTV có `phone` / `zaloPhone` (Story 1.3).

---

## 3. Tiêu chí Chấp nhận (Acceptance Criteria - Gherkin)

### AC1: Tải ảnh mượt trên điện thoại & máy tính
* **Given:** CTV mở Modal chi tiết của căn hộ có ảnh.
* **When:** CTV chạm `Tải toàn bộ ảnh`.
* **Then:**
  * **Điện thoại hỗ trợ chia sẻ file** (`navigator.canShare({ files })`): hệ thống chuẩn bị ảnh (có hiển thị tiến trình), sau đó hiện nút `Lưu / Gửi N ảnh`. Chạm nút này sẽ mở bảng chia sẻ của máy (Lưu vào Ảnh, gửi Zalo...).
    * Lý do phải tách 2 lần chạm: iOS chỉ cho mở bảng chia sẻ ngay khi người dùng vừa chạm, không cho mở sau khi đã chờ tải ảnh.
  * **Máy tính / trình duyệt không hỗ trợ chia sẻ file:** tải về 1 file `can-ho-<id>.zip`.
  * Có lỗi (mạng, ảnh hỏng) → hiện thông báo lỗi, nút trở về trạng thái ban đầu.

### AC2: Watermark số điện thoại của chính CTV đăng nhập (sharp)
* **Given:** CTV `Hải` có `zaloPhone = 0987654321`.
* **When:** Backend trả ảnh qua API tải ảnh.
* **Then:**
  * Góc dưới bên phải mỗi ảnh có dòng chữ `Tel/Zalo: 0987654321`, chữ trắng, viền tối và hơi trong suốt (≈85%). Cỡ chữ tỉ lệ theo chiều rộng ảnh.
    * Chỉ dùng ký tự ASCII để không bị lỗi font tiếng Việt trên server Linux.
  * Không có `zaloPhone` thì dùng `phone`.
  * Ảnh trả về dạng JPEG. Ảnh gốc trên Cloudinary/DB không bị thay đổi.
  * API yêu cầu đăng nhập (mọi role). Không có token → `401`.

### AC3: Lọc bỏ ảnh có dán SĐT của nguồn cũ (Gemini Vision lúc nhập tin)
* **Given:** Tin nhập qua pipeline ingestion (Telegram / Webhook / Extension / Quick Paste) có ảnh.
* **When:** Pipeline tạo căn Master mới.
* **Then:**
  * Backend gửi các ảnh (đã thu nhỏ ≤ 768px) trong **1 request** Gemini Vision. Gemini trả về chỉ số các ảnh chứa số điện thoại hoặc watermark môi giới.
  * URL các ảnh đó được lưu vào trường mới `Apartment.hiddenImages`.
  * API tải ảnh (AC1, AC2) chỉ dùng **ảnh hiển thị** = `images` − `hiddenImages`.
  * Gemini lỗi hoặc quá thời gian chờ → **không chặn** việc nhập tin, `hiddenImages = []` (fail-open, tức vẫn cho đi tiếp).
  * Ảnh mỗi URL chỉ tải 1 lần, dùng chung cho cả tính pHash (Story 3.2) và Gemini Vision.
  * Modal chi tiết hiển thị `Đã ẩn N ảnh có SĐT nguồn cũ` khi `hiddenImages` không rỗng.

### AC4: An toàn khi server tải ảnh
* Chỉ tải URL `http(s)`, timeout 8 giây, giới hạn 15MB/ảnh. Ảnh lỗi trong file ZIP thì bỏ qua, không làm hỏng cả file.

---

## 4. Phạm vi Kỹ thuật (Technical Implementation Scope)

### A. Backend
```plaintext
backend/src/
├── utils/fetch-image.ts                    # [MỚI] fetchImageBuffer(url): tải ảnh http(s), timeout, giới hạn dung lượng
├── modules/apartments/apartment.model.ts   # [SỬA] + hiddenImages: string[]
├── modules/ingestion/gemini.service.ts     # [SỬA] getApiKey/getModel → public để tái sử dụng
├── modules/ingestion/gemini-vision.service.ts # [MỚI] detectImagesWithPhone(buffers): Promise<number[]>
├── modules/dedup/dedup.service.ts          # [SỬA] tải ảnh 1 lần → pHash + Gemini Vision → lưu hiddenImages
└── modules/share/
    ├── watermark.util.ts                   # [MỚI] addPhoneWatermark(buffer, text): sharp + SVG overlay
    ├── photo.service.ts                    # [MỚI] getVisibleImages, renderWatermarkedPhoto, streamPhotosZip (archiver)
    ├── share.controller.ts                 # [MỚI] (dùng chung với Story 5.3)
    └── share.routes.ts                     # [MỚI] mount tại /api/v1/share
```

**API Endpoints:**
| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/v1/share/apartments/:id/photos/:index` | Bắt buộc | 1 ảnh (theo thứ tự ảnh hiển thị) đã watermark, `image/jpeg` |
| GET | `/api/v1/share/apartments/:id/photos.zip` | Bắt buộc | Toàn bộ ảnh hiển thị đã watermark, `application/zip` |

**Package mới:** `archiver` + `@types/archiver` (đã được duyệt).

### B. Frontend
```plaintext
frontend/src/
├── api/apartmentApi.ts                         # [SỬA] + hiddenImages; getWatermarkedPhoto, downloadPhotosZip
└── components/apartment/
    ├── DownloadPhotosButton.tsx                # [MỚI] luồng share sheet (2 chạm) / ZIP
    └── ApartmentDetailModal.tsx                # [SỬA] gắn nút + dòng "Đã ẩn N ảnh"
```

---

## 5. Danh sách Kiểm thử & Định nghĩa Hoàn thành (Definition of Done)
- [ ] Test 1: Gọi API ảnh đơn với token CTV → ảnh JPEG có `Tel/Zalo: <SĐT CTV>` ở góc dưới phải.
- [ ] Test 2: Gọi API không có token → `401`.
- [ ] Test 3: Tải ZIP trên máy tính → mở được, số ảnh = `images.length − hiddenImages.length`.
- [ ] Test 4: Trên iPhone/Android → bảng chia sẻ mở ra, lưu được ảnh vào Thư viện.
- [ ] Test 5: Nhập tin có ảnh dán SĐT qua Quick Paste → ảnh đó nằm trong `hiddenImages`, không có trong ZIP.
- [ ] Test 6: Tắt mạng tới Gemini / sai key → tin vẫn được tạo, `hiddenImages = []`.
- [ ] `npm run build` backend & frontend thành công. Mọi file ≤ 250 dòng.
- [ ] Tuân thủ [WORKING_RULES.md](../WORKING_RULES.md): không tự ý commit/push.
