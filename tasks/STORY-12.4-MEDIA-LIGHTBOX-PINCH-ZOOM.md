# STORY 12.4: Xem ảnh / video toàn màn hình, vuốt & phóng to 2 ngón (Epic 12)

**Bối cảnh:** `docs/stories/EPIC_12_UI_UX_DESIGN_SYSTEM_AND_STANDARDIZATION.md` Story 12.4.

Hiện tại:
- Chi tiết căn (`ApartmentDetailModal`): 1 ảnh lớn 4:3 và dãy ảnh nhỏ để bấm đổi; video nằm ở mục riêng (`<video controls>`).
- Trang khách (`PhotoSlider`): vuốt ngang bằng `scroll-snap`, có số "1/12".
- Chưa có chế độ xem toàn màn hình, chưa phóng to được.

## User Story
Là **CTV hoặc khách thuê**, tôi muốn chạm vào ảnh để xem toàn màn hình nền đen, vuốt qua lại giữa ảnh và video, và phóng to bằng 2 ngón tay,
để soi kỹ điều hoà, sofa, máy giặt hay view ban công.

## Tiền điều kiện
- Không cần cấu hình.
- **Cần bạn chọn cách làm:**
  - **Cách A (đề xuất):** tự viết, không thêm thư viện.
    - Vuốt ngang bằng `scroll-snap`.
    - Phóng to bằng Pointer Events (2 ngón = phóng to quanh điểm giữa 2 ngón; khi đã phóng to thì kéo để di chuyển ảnh; chạm 2 lần = phóng to 2× / thu về).
    - Khoảng 180 dòng; cần thử kỹ trên iPhone.
  - **Cách B:** dùng `photoswipe` v5 (khoảng 20KB nén, chỉ tải khi mở trình xem). Cử chỉ đã được kiểm chứng nhiều năm, nhưng thêm 1 phụ thuộc và cần tự ghép phần video.

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Trình xem toàn màn hình**
- Given đang ở chi tiết căn (app) hoặc trang khách `/p/:slug`
- When chạm vào ảnh
- Then mở trình xem nền đen `bg-black/95`, che hết thanh trên, menu đáy và thanh liên hệ.
- Thanh trên trong suốt (chữ trắng, có lớp bóng để đọc được trên ảnh sáng), gồm:
  - Nút **Đóng** (X).
  - Số thứ tự "3/12".
  - Nút **Tải ảnh**: tải đúng ảnh đang xem bằng bản Cloudinary 1600px của Story 10.3.
- Đóng bằng: nút X, phím Esc, nút Back của Android / cử chỉ quay lại (dùng `history.pushState`), hoặc vuốt dọc xuống khi chưa phóng to.
- Trang khách chỉ hiện ảnh được phép gửi khách: bỏ ảnh có SĐT nguồn cũ, giữ quy tắc Story 5.2.

**AC2 — Cử chỉ**
- Vuốt ngang chuyển ảnh / video, có trượt dừng theo từng ảnh.
- Phóng to bằng 2 ngón, tối đa 3×. Chạm 2 lần: phóng to 2× tại điểm chạm, chạm 2 lần nữa thì thu về.
- Khi đang phóng to: kéo 1 ngón để di chuyển ảnh, không chuyển sang ảnh khác. Về 1× thì vuốt lại chuyển ảnh bình thường.
- Bàn phím (máy tính): mũi tên trái / phải đổi ảnh.
- Bật "giảm chuyển động": đổi ảnh không có hiệu ứng trượt.

**AC3 — Dải ảnh nhỏ ở đáy**
- Dải ảnh nhỏ cuộn ngang sát mép dưới (trên vùng an toàn iPhone). Ảnh đang xem có viền sáng; bấm để nhảy tới ảnh đó.
- Ảnh nhỏ dùng bản Cloudinary thu nhỏ.

**AC4 — Video**
- Video nằm chung dãy với ảnh, sau các ảnh.
- Ô video có ảnh bìa (`videoPoster` có sẵn) và nút Play lớn ở giữa. Bấm Play thì phát bằng trình phát gốc của điện thoại (`<video controls playsinline>`).
- Vuốt sang ảnh khác thì video tự dừng.

## Phạm vi kỹ thuật
| File | Thay đổi |
|---|---|
| `frontend/src/components/media/MediaLightbox.tsx` (mới, tải riêng khi mở) | Khung toàn màn hình, thanh trên, dải ảnh nhỏ, dãy ảnh / video, nút Back |
| `frontend/src/hooks/usePinchZoom.ts` (mới, Cách A) | Phóng to 2 ngón / chạm 2 lần / kéo khi đã phóng to, giới hạn 1–3×, giữ ảnh không lọt ra ngoài khung |
| `components/apartment/ApartmentDetailModal.tsx` | Chạm ảnh lớn / ảnh nhỏ → mở trình xem đúng ảnh đó |
| `components/public/PhotoSlider.tsx` | Chạm ảnh → mở trình xem |
| `utils/cloudinaryImage.ts` | `thumbSizeUrl(url)` cho ảnh nhỏ |

## Rủi ro
- Cử chỉ phóng to 2 ngón trên Safari iPhone dễ trùng với phóng to cả trang của trình duyệt. Phải chặn đúng chỗ (`touch-action: none` trong vùng ảnh) và thử trên máy thật.
  Nếu Cách A không đủ mượt thì chuyển sang Cách B.

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] Puppeteer 390px giả lập chạm:
  - Mở từ ảnh thứ 3 → hiện "3/N".
  - Vuốt chuyển ảnh; bấm ảnh nhỏ thì nhảy tới.
  - Chạm 2 lần phóng to 2×, chạm 2 lần nữa thu về.
  - Esc / Back thì đóng.
  - Trang khách không lộ ảnh có SĐT nguồn cũ.
- [ ] Giả lập 2 ngón (CDP `Input.dispatchTouchEvent`) phóng to tối đa 3×.
- [ ] Video: vuốt đi thì video dừng.
- [ ] Bạn thử trên điện thoại thật: phóng to mượt, không phóng cả trang.
- [ ] Build không lỗi; trình xem nằm ở file JS riêng. Báo cáo, đề xuất commit `feat(ui): fullscreen media lightbox with swipe and pinch zoom (Story 12.4)` chờ duyệt.
