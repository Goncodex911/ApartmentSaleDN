# STORY 7.1: Chuyển hệ thống sang thị trường Đà Nẵng (P1 — Epic 7)

**Bối cảnh:** Toàn bộ dữ liệu địa lý (quận, điểm mốc, tâm quận), prompt AI và mặc định form đang viết cho Hà Nội.
Tin thật ở Đà Nẵng bị gán quận sai ("Cầu Giấy" mặc định), không có tọa độ, tìm theo quận/điểm mốc không chạy.

## User Story
Là **CTV ở Đà Nẵng**, tôi muốn gõ "căn hộ nhs gần cầu Rồng" hoặc chọn "ĐH Bách Khoa" và nhận đúng căn ở Đà Nẵng;
là **Quản lý**, tôi muốn tin Telegram/Zalo được AI gán đúng quận, phường và có tọa độ.

## Acceptance Criteria
1. **Khu vực Đà Nẵng:** Hải Châu, Thanh Khê, Sơn Trà, Ngũ Hành Sơn, Liên Chiểu, Cẩm Lệ, Hòa Vang, Hội An
   (Hội An đã thuộc TP Đà Nẵng từ 7/2025). Viết tắt: hc, tk, st, nhs, lc, cl, hv; gõ không dấu/viết liền đều nhận.
   - Dùng tên quận cũ làm "khu vực" vì tin đăng & CTV vẫn gọi theo quận cũ (sau sáp nhập 7/2025 cấp quận đã bỏ).
2. **Phường → quận:** tin có "Mỹ An", "Khuê Mỹ", "An Hải Bắc"... mà AI không ghi quận → tự suy ra quận và lưu `location.ward`.
3. **Kiểm tra quận AI trả về:** chỉ nhận quận trong danh sách (tin ở Đà Nẵng). Tìm câu tự nhiên: quận ngoài danh sách bị bỏ,
   chữ đó vẫn được lọc như từ khóa (VD "Mỹ An" không bị coi là quận).
4. **Điểm mốc Đà Nẵng** (~15): biển Mỹ Khê, Non Nước, cầu Rồng, cầu Sông Hàn, chợ Hàn, sân bay, ĐH Bách Khoa, Kinh tế,
   Sư phạm, Duy Tân, FPT, Vincom, Lotte Mart, BV Đà Nẵng, công viên Biển Đông. Tọa độ gần đúng (sai số vài trăm mét).
5. **Tọa độ khi nhập tin tự động:** tin từ Telegram/Zalo được gắn tọa độ (điểm mốc trong địa chỉ → tâm quận).
6. **Prompt AI:** bóc tin, tìm câu tự nhiên, chat tư vấn đều nói về Đà Nẵng; hiểu tin tiếng Anh (2BR, near the beach);
   KHÔNG đoán tiện ích không được ghi (VD "parking" chung chung ≠ ô tô đỗ cửa).
7. **Mặc định:** thành phố "Đà Nẵng"; form thêm căn không điền sẵn quận (có gợi ý danh sách); thiếu quận → "Chưa rõ" + cờ "Cần kiểm tra".
8. **Khoảng giá:** Dưới 5tr · 5–8tr · 8–12tr · 12–20tr · Trên 20tr.

## Giải pháp kỹ thuật
- `search/landmarks.data.ts`: `DANANG_DISTRICTS`, `DISTRICT_CENTROIDS`, `WARD_TO_DISTRICT`, `LANDMARKS` (Đà Nẵng).
- `search/slang.dictionary.ts`: `DISTRICT_SYNONYMS` Đà Nẵng; `search/district.ts`: `canonicalDistrict()`, `districtFromWard()`.
- `ingestion/gemini.prompt.ts` + `gemini.service.ts` (`sanitizeResult`): thêm `ward`, kiểm tra quận, bỏ mặc định Cầu Giấy.
- `dedup.service.ts`: lưu `ward`, gắn tọa độ.
- `natural-search.service.ts`, `chat/chat-ai.ts`: prompt Đà Nẵng.
- `filter.builder.ts`: bảng khoảng giá; model/validation: city mặc định "Đà Nẵng".
- Frontend: `ApartmentModal` (datalist quận), `FilterSheet` (khoảng giá), placeholder.

## Kiểm thử
- Tin mẫu Mỹ An qua Gemini → quận Ngũ Hành Sơn, phường Mỹ An, có tọa độ.
- Tìm: "studio hc dưới 6tr", "căn hộ nhs", "gần cầu rồng", "2BR near Dragon Bridge".
- `npm run build` backend & frontend.
