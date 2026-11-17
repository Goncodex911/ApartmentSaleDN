# STORY 7.2: Trường dữ liệu đặc thù thị trường Đà Nẵng (P2 — Epic 7)

**Bối cảnh:** Tin Đà Nẵng (nhiều khách nước ngoài) luôn ghi khoảng cách tới biển, hồ bơi, giá USD, thời gian thuê tối thiểu,
dịch vụ bao gồm (wifi, dọn phòng) và chỗ để xe. Hệ thống hiện bỏ mất các thông tin này khi nhập, không lọc và không hiển thị được.

## User Story
Là **CTV**, tôi muốn lọc "Gần biển (<1km)" và "Hồ bơi", thấy "Cách biển 600m · Hồ bơi · Bao wifi · Thuê tối thiểu 1 tháng"
trên tin và trong bài gửi khách; là **Quản lý**, tôi muốn AI tự bóc các thông tin này từ tin Telegram/Zalo.

## Acceptance Criteria
1. **Trường mới** (đều không bắt buộc):
   - `attributes.distanceToBeachM` (mét), `attributes.pool`, `attributes.motorbikeParking` (chỗ để xe máy; ô tô vẫn là `carParking`).
   - `priceUsd` (giá USD nếu tin ghi), `minLeaseMonths` (số tháng thuê tối thiểu), `includedServices` ⊂ {WIFI, CLEANING, ELECTRICITY, WATER, LAUNDRY}.
2. **AI bóc tin:** "less than 600m to the sea" → 600; "pool"/"hồ bơi" → pool; "760 USD" → priceUsd 760 (giá VNĐ vẫn ưu tiên số VNĐ);
   "Minimum rental period: 1 months" → 1; "Free wifi, clean 1 a week" → WIFI, CLEANING; "parking" chung chung → chỗ để xe máy.
   Không ghi → để trống, không đoán.
3. **Bộ lọc:** thêm chip "Gần biển (<1km)" và "Hồ bơi". Căn cũ chưa có số liệu vẫn được tính nếu tiêu đề/mô tả ghi "gần biển"/"hồ bơi".
4. **Tìm câu tự nhiên:** "gần biển", "sát biển", "near the beach", "hồ bơi", "pool" được hiểu thành bộ lọc tương ứng (không bắt buộc chữ "biển" xuất hiện).
5. **Hiển thị:** thẻ danh sách có "cách biển Xm" (khi ≤ 2km); chi tiết, trang công khai và bài gửi khách có các thông tin mới;
   giá USD hiển thị kèm "≈ $760".
6. **Form Quản lý:** nhập được các trường mới.
7. Sửa kèm: bài gửi khách ghi "Huyện Hòa Vang", "TP Hội An" thay vì "Quận Hòa Vang/Hội An".

## Giải pháp kỹ thuật
- Model + zod validation: thêm trường; DTO công khai (`public-listing.util.ts`) thêm vào danh sách trắng.
- `gemini.prompt.ts` / `gemini.service.ts` / `dedup.service.ts`: bóc và lưu.
- `slang.dictionary.ts`: điều kiện `NEAR_BEACH_CONDITION`, `POOL_CONDITION` (số liệu HOẶC chữ trong tin) dùng chung cho FilterBuilder và QueryAnalyzer.
- `natural-search.service.ts`: `nearBeach`, `pool` (heuristic + Gemini + nhãn).
- Frontend: `utils/apartmentLabels.ts` (nhãn dùng chung cho chi tiết, trang công khai, bài gửi khách), FilterSheet, thẻ, form (tách `MarketFieldsSection`).

## Kiểm thử
- Tin mẫu Mỹ An qua Gemini → distanceToBeachM 600, pool, priceUsd 760, minLeaseMonths 1, WIFI + CLEANING.
- Lọc Gần biển / Hồ bơi trên DB thử (gồm căn cũ chỉ có chữ trong mô tả); "2BR near the beach with pool".
- `npm run build` backend & frontend.
