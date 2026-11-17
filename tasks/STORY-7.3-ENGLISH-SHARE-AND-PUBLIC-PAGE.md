# STORY 7.3: Bài gửi khách & Trang xem phòng tiếng Anh (P3 — Epic 7)

**Bối cảnh:** Khách thuê ở Đà Nẵng có nhiều người nước ngoài. Hiện bài gửi khách (Story 5.1) và trang xem phòng công khai (Story 5.3)
chỉ có tiếng Việt; tiêu đề căn do AI viết bằng tiếng Việt ("Cho thuê căn 2PN...").

## User Story
Là **CTV**, tôi muốn chọn gửi khách bằng **English** thì bài copy và link xem phòng đều là tiếng Anh;
là **khách nước ngoài**, tôi muốn mở link thấy trang tiếng Anh và đổi qua lại Việt/Anh được.

## Acceptance Criteria
1. **Chọn ngôn ngữ khi gửi khách:** chi tiết căn có nút chọn "Tiếng Việt | English" ngay trên hàng nút chia sẻ.
   Lựa chọn được nhớ trên máy CTV (localStorage, an toàn khi bị chặn); nút copy nhanh trên thẻ danh sách và màn ghép khách dùng cùng lựa chọn.
2. **Bài copy tiếng Anh** (chỉ dùng trường trong danh sách trắng như 5.1, không lộ chủ nhà/địa chỉ):
   - Tiêu đề tự sinh từ dữ liệu, KHÔNG dùng tiêu đề tiếng Việt: "2BR APARTMENT FOR RENT – MY AN, NGU HANH SON".
   - Tên địa danh bỏ dấu cho khách nước ngoài dễ đọc (Mỹ An → My An).
   - Giá "20,000,000 VND/month (≈ $760)", cọc "Deposit: 1 month", phí, nội thất, tiện ích tiếng Anh
     (Elevator, Pool, 600m to the beach, Free wifi...), "Minimum stay: 1 month", ngày trống "Available from".
   - Liên hệ: số điện thoại dạng quốc tế "+84 911 000 111" (khách nước ngoài bấm gọi/WhatsApp được).
3. **Link xem phòng tiếng Anh:** khi chọn English, link copy có thêm `?lang=en`.
4. **Trang xem phòng song ngữ:**
   - Ngôn ngữ: `?lang=` trên link → lựa chọn đã lưu của khách → ngôn ngữ trình duyệt (en → English) → mặc định Tiếng Việt.
   - Nút đổi "VI / EN" trên trang; đổi xong nhớ cho các căn khác (VD bấm căn gợi ý trong chat).
   - Toàn bộ chữ trên trang, thanh liên hệ và khung chat AI đổi ngôn ngữ; tiêu đề tiếng Anh tự sinh như AC2.
   - Lời chào riêng của CTV (CTV tự viết tiếng Việt) chỉ hiện ở trang tiếng Việt; trang tiếng Anh dùng lời chào tiếng Anh mặc định.
     Chat AI vốn đã trả lời tiếng Anh khi khách viết tiếng Anh (Story 7.1).
5. Không đổi backend, không đổi dữ liệu.

## Giải pháp kỹ thuật
- `utils/shareLang.ts`: đọc/ghi lựa chọn ngôn ngữ (try/catch), `withLang(url, lang)`.
- `utils/listingEn.ts`: tiêu đề, nhãn tiện ích/nội thất/phí tiếng Anh, bỏ dấu, SĐT quốc tế — dùng chung cho bài copy & trang khách.
- `utils/shareTextEn.ts`: mẫu bài gửi khách tiếng Anh.
- `components/apartment/ShareLangToggle.tsx`; `CopyShareButton`, `ShareLinkButton` nhận `lang`.
- `utils/publicCopy.ts` + `hooks/usePublicLang.ts`: chữ song ngữ của trang khách; `PublicListingPage`, `CtvContactBar`, `ChatWidget` dùng.

## Kiểm thử
- Sinh bài tiếng Anh từ căn mẫu Mỹ An; kiểm tra không có chữ tiếng Việt, không có địa chỉ/SĐT chủ nhà.
- Mở trang khách với `?lang=en`, đổi VI/EN, chụp màn hình điện thoại.
- `npm run build` frontend.
