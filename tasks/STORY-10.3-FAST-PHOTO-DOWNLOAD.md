# STORY 10.3: Tải ảnh nhanh — bỏ in SĐT, tải ảnh gốc từ Cloudinary (Epic 10)

**Bối cảnh:** `docs/stories/EPIC_10_MOBILE_FEEDBACK_POLISH.md` mục F. Nút **Tải ảnh** hiện gọi server: server tải từng ảnh về, in
"Tel/Zalo: SĐT CTV" lên ảnh (Story 5.2) rồi gửi lại qua Netlify proxy → chậm trên Render gói miễn phí.
Project Owner quyết định **bỏ in SĐT lên ảnh**.

## User Story
Là **CTV**, tôi muốn bấm Tải ảnh là có ngay bộ ảnh căn hộ trên điện thoại,
để gửi khách nhanh mà không phải chờ.

## Tiền điều kiện
- Ảnh căn nằm trên Cloudinary (đã kiểm tra: Cloudinary trả header CORS → trình duyệt tải trực tiếp được).

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Điện thoại**
- When bấm **Tải ảnh**
- Then app tải ảnh **thẳng từ Cloudinary**, bản nén vừa đủ nét (cạnh dài 1600px, chất lượng tự động — Cloudinary tự xử lý qua link),
  rồi mở khay **Lưu ảnh / Chia sẻ** của điện thoại (giữ cách làm hiện tại của `DownloadPhotosButton`).
- And ảnh **không có** chữ SĐT.

**AC2 — Máy tính**
- Tải 1 file `.zip` tạo ngay trên trình duyệt (không qua server), tên `can-ho-<tên căn>.zip`.

**AC3 — Giữ quy tắc an toàn**
- Không gửi các ảnh trong `hiddenImages` (ảnh có SĐT nguồn cũ — Story 5.2) và không gửi video.
- Căn "Đã thuê" → nút bị khóa như hiện tại.

## Phạm vi kỹ thuật
| File | Thay đổi |
|---|---|
| `frontend/src/utils/cloudinaryImage.ts` (mới) | `downloadSizeUrl(url)`: chèn `w_1600,q_auto,f_jpg` sau `/upload/` (ảnh ngoài Cloudinary giữ nguyên link) |
| `frontend/src/utils/zip.ts` (mới) | Tạo zip "store" (không nén — ảnh JPEG đã nén sẵn) ~60 dòng, chuyển từ `backend/src/utils/zip.ts` |
| `components/apartment/DownloadPhotosButton.tsx` | Tải song song tối đa 4 ảnh từ Cloudinary; điện thoại → `navigator.share({ files })`; máy tính → zip |
| `api/shareApi.ts` | Bỏ `getPhoto`, `downloadPhotosZip` |
| Backend `share/photo.service.ts`, `share/watermark.util.ts`, `utils/zip.ts`, 2 route `/share/apartments/:id/photos*` | **Đề xuất xóa** (không còn nơi dùng) — chỉ xóa sau khi bạn duyệt trong báo cáo |

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] Puppeteer (giả lập điện thoại có `navigator.share`): bấm Tải ảnh → `share` nhận đúng số ảnh (trừ ảnh ẩn, trừ video), không request nào tới `/share/apartments/.../photos`.
- [ ] Máy tính: tải file zip mở được, đúng số ảnh.
- [ ] Đo thời gian 10 ảnh trước / sau (bản thật, có mạng 4G nếu được).
- [ ] Báo cáo, đề xuất commit `perf(share): download original photos directly from Cloudinary without phone watermark (Story 10.3)` chờ duyệt.
