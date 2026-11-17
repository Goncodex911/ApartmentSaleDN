# STORY 9.4: Chia sẻ hệ thống, kéo để làm mới & rung phản hồi (Epic 9)

**Bối cảnh:** `docs/stories/EPIC_09_PWA_MOBILE_APP.md` — Story 9.4. Hiện có 2 nút riêng: **Copy tin** (bài gửi khách VI / EN) và
**Tạo link** (trang xem phòng `/p/...`). Story này gộp thành 1 nút **Gửi khách** mở khay chia sẻ của điện thoại.

## User Story
Là **CTV đang tư vấn khách**, tôi muốn bấm 1 nút để mở khay chia sẻ của điện thoại (Zalo, Messenger...) và kéo màn hình để tải phòng mới,
để gửi phòng cho khách ngay mà không phải copy thủ công.

## Tiền điều kiện
- Story 9.1, 9.3 xong. Đã có: `buildShareText` / `buildShareTextEn`, `shareApi.getOrCreateLink`, `copyText`, `ShareLangToggle`.

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Gửi khách 1 chạm**
- Given điện thoại hỗ trợ `navigator.share`
- When bấm **Gửi khách** (thẻ căn và chi tiết căn)
- Then mở khay chia sẻ hệ thống với **bài gửi khách theo ngôn ngữ đang chọn + link trang xem phòng ở cuối bài**
  (gộp link vào nội dung chữ — Zalo trên iPhone thường chỉ nhận 1 trong 2 phần "chữ" hoặc "link").
- Given không hỗ trợ (máy tính, trình duyệt cũ) → copy bài + link vào clipboard, báo "Đã copy".
- Người dùng tự đóng khay chia sẻ (`AbortError`) → không báo lỗi.
- **Lưu ý iOS:** Safari chỉ cho mở khay chia sẻ ngay trong lúc bấm → link xem phòng phải được **tạo sẵn khi mở chi tiết căn**,
  không gọi API rồi mới chia sẻ. Thẻ căn chưa có link → lần bấm đầu tạo link, rồi chia sẻ (nếu iOS chặn thì tự chuyển sang copy).
- Căn "Đã thuê" → nút bị khóa như nút Copy hiện tại.

**AC2 — Kéo để làm mới (Bảng hàng, Tin đăng)**
- Given đang ở đầu danh sách (cuộn = 0), không mở form / hộp thoại
- When kéo xuống ≥ 70px rồi thả
- Then hiện vòng xoay và tải lại danh sách; kéo < 70px → bật về, không tải.
- Trong trình duyệt (chưa cài app) Chrome Android đã có kéo-làm-mới riêng → chỉ bật tính năng của app khi chạy dạng app (standalone),
  tránh tải 2 lần. Tôn trọng `prefers-reduced-motion` (bỏ hiệu ứng kéo giãn).

**AC3 — Rung phản hồi**
- Bấm chip lọc nhanh, copy / chia sẻ thành công → `navigator.vibrate(10)`.
- iPhone không hỗ trợ rung → bỏ qua, không lỗi (giới hạn của iOS, chấp nhận).

## Phạm vi kỹ thuật
| File | Thay đổi |
|---|---|
| `frontend/src/utils/haptics.ts` (mới) | `tapFeedback()` = `navigator.vibrate?.(10)` an toàn |
| `frontend/src/utils/share.ts` (mới) | `shareOrCopy({ text, url })`: `navigator.share` → `AbortError` bỏ qua → còn lại copy |
| `frontend/src/components/apartment/SendToCustomerButton.tsx` (mới) | Nút **Gửi khách** thay cặp Copy tin + Tạo link ở chi tiết căn; bản gọn (icon) trên thẻ căn |
| `ApartmentDetailModal.tsx` | Tạo sẵn link khi mở chi tiết; dùng nút mới; giữ `ShareLangToggle` |
| `ApartmentCard.tsx` | Thay `CopyShareButton` bằng bản gọn của nút mới |
| `frontend/src/hooks/usePullToRefresh.ts` (mới) | Theo dõi `touchstart/move/end` khi cuộn = 0, ngưỡng 70px, chỉ ở chế độ standalone |
| `ApartmentsPage.tsx`, `SubmissionsPage.tsx` | Gắn kéo-làm-mới + vòng xoay |
| `FilterSheet.tsx`, chip lọc nhanh trên Bảng hàng | Gọi `tapFeedback()` |
| `components/leads/MatchShareModal.tsx` | Đang dùng `CopyShareButton` + `ShareLinkButton` (gửi căn phù hợp cho khách — Epic 6) → chuyển sang nút Gửi khách |
| `CopyShareButton.tsx`, `ShareLinkButton.tsx` | Xóa sau khi 3 nơi trên đã chuyển hết (xóa file chỉ khi được duyệt) |

Không đổi backend, không thêm thư viện.

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] Puppeteer: giả lập `navigator.share` → bấm Gửi khách gọi đúng 1 lần với nội dung có bài + link `/p/...`, đúng ngôn ngữ; giả lập `AbortError` → không báo lỗi; không có `share` → nội dung vào clipboard.
- [ ] Bài gửi khách vẫn không có SĐT chủ, số nhà, link map (giữ quy tắc Story 5.1 / 8.3).
- [ ] Giả lập cảm ứng: kéo 40px → không tải; kéo 90px → gọi tải lại 1 lần; đang mở form → không kích hoạt.
- [ ] Sau deploy: gửi thử 1 căn qua Zalo và Messenger trên iPhone và Android — kiểm tra khách nhận đủ bài + link.
- [ ] Báo cáo, đề xuất commit `feat(pwa): one-tap share, pull to refresh and haptics (Story 9.4)` chờ duyệt.
