# STORY 10.2: Tải video thẳng lên Cloudinary, lưu & phát video riêng (Epic 10)

**Bối cảnh:** `docs/stories/EPIC_10_MOBILE_FEEDBACK_POLISH.md` mục E. Hiện tại:
1. Video tải lên bị nhét vào danh sách **ảnh** (`images`) và hiển thị bằng thẻ `<img>` → vỡ hình (trường `videos` có sẵn nhưng không dùng).
2. File đi điện thoại → **Netlify proxy** (ngắt request sau ~26 giây) → **Render** (giới hạn 25MB, giữ cả file trong RAM) → Cloudinary.
   Video quay bằng điện thoại thường > 25MB và tải lâu hơn 26 giây trên 4G.

## User Story
Là **Quản lý / CTV**, tôi muốn tải video căn hộ quay bằng điện thoại lên được và xem lại ngay trong chi tiết căn,
để khách xem phòng trực quan hơn.

## Tiền điều kiện
- Cloudinary đang dùng (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) — **không cần cấu hình mới**.
- Gói Cloudinary miễn phí: video tối đa **100MB / file**.

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Tải thẳng lên Cloudinary**
- Given đang ở form Thêm căn / Sửa căn / Đăng tin
- When chọn ảnh hoặc video
- Then điện thoại xin **chữ ký tải lên** từ server (`POST /apartments/upload-signature`) rồi gửi file **thẳng tới Cloudinary**
  (không qua Netlify / Render) → hết lỗi 26 giây / 25MB.
- And có **thanh tiến độ %** cho từng file; lỗi 1 file không làm hỏng các file khác.
- Chữ ký chỉ cấp cho người đã đăng nhập, hết hạn sau ~1 giờ, cố định thư mục (`apartment_sale/apartments` cho Quản lý,
  `apartment_sale/submissions` cho CTV — giữ quy tắc dọn ảnh của Story 8.6); CTV vẫn bị giới hạn 6 lần / giờ.

**AC2 — Giới hạn rõ ràng**
- Video > 100MB hoặc file không phải ảnh / video → báo ngay "Video tối đa 100MB" trước khi tải, không gửi đi.

**AC3 — Video lưu và hiển thị riêng**
- Video lưu vào `videos`, ảnh vào `images`. Form hiện video bằng khung có biểu tượng Play (không phải thẻ ảnh), xóa được như ảnh.
- Chi tiết căn có mục **Video** phát được ngay (`<video controls playsinline>`); thẻ danh sách vẫn dùng ảnh đầu tiên.
- **Căn cũ** đã lỡ lưu video trong `images`: tự nhận ra theo link Cloudinary `/video/upload/` → hiển thị như video, không cần chạy script.

## Phạm vi kỹ thuật
| File | Thay đổi |
|---|---|
| `backend/src/config/cloudinary.ts` | `signUploadParams(folder)`: ký `{ timestamp, folder }` bằng `api_secret` (thư viện `cloudinary` có sẵn) |
| `apartments/apartment.routes.ts`, `apartment.controller.ts` | `POST /apartments/upload-signature` (đăng nhập; CTV qua `ctvUploadLimit`); trả `{ cloudName, apiKey, timestamp, signature, folder }` — KHÔNG trả `api_secret` |
| `frontend/src/api/mediaUpload.ts` (mới) | Tải file thẳng lên `https://api.cloudinary.com/v1_1/<cloud>/auto/upload` bằng `XMLHttpRequest` (có tiến độ) |
| `frontend/src/utils/media.ts` (mới) | `isVideoUrl(url)` (link `/video/upload/`), tách ảnh / video cho căn cũ |
| `components/apartment/PhotoUploader.tsx` | Tải thẳng + tiến độ + kiểm tra 100MB; ảnh vào `images`, video vào `videos`; khung video có Play |
| `ApartmentModal.tsx` | Gửi thêm `videos` |
| `ApartmentDetailModal.tsx` | Mục Video (`<video controls playsinline preload="metadata">`) |
| `/apartments/upload-media` | Giữ lại cho extension / client cũ (không xóa) |

## Rủi ro
- Cloudinary gói miễn phí giới hạn dung lượng / băng thông tháng (25 credits) — video tốn nhiều hơn ảnh. Đề xuất: Cloudinary tự nén khi phát (`q_auto`).

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] API: chưa đăng nhập → 401; chữ ký đúng thư mục theo vai trò; CTV gọi lần 7 trong giờ → 429; phản hồi không chứa `api_secret`.
- [ ] Bản local (Cloudinary thật, được bạn đồng ý như lần trước): tải 1 video ~40MB + 2 ảnh → thanh tiến độ chạy, lưu đúng `videos` / `images`, chi tiết căn phát được video; **xóa file thử trên Cloudinary sau khi thử**.
- [ ] Căn cũ có video trong `images` → hiển thị đúng là video.
- [ ] File 120MB → báo lỗi, không gửi.
- [ ] Báo cáo, đề xuất commit `feat(media): direct Cloudinary upload with progress and separate videos (Story 10.2)` chờ duyệt.
