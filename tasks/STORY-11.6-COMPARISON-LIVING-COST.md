# STORY 11.6: So sánh căn & ước tính chi phí sinh hoạt (Epic 11)

**Bối cảnh:** `docs/stories/EPIC_11_SMART_BROKER_TOOLS_AND_REALTIME.md` Story 11.6.
Story này dùng chung **chế độ chọn nhiều căn** của Story 11.3 (lộ trình), nên làm sau 11.3.

Hiện tại:
- Căn có `fees.electricity` (đ/kWh), `fees.water`, `fees.service`, `fees.parkingMotor`.
- Căn có `includedServices` (WIFI, CLEANING, ELECTRICITY, WATER, LAUNDRY) và `priceUsd` (nếu tin có ghi giá USD).
- Tỷ giá `USD_VND_RATE` chỉ dùng ở backend (mặc định 25.000), frontend chưa biết.
- Trang khách `/p/:slug` có tiếng Việt / English (Story 7.3).

## User Story
Là **khách thuê** (nhất là khách nước ngoài) hoặc **CTV đang tư vấn**, tôi muốn đặt 2–3 căn cạnh nhau để so sánh,
và tự ước tính tổng chi phí mỗi tháng (tiền thuê + điện + nước + dịch vụ), để chốt nhanh hơn mà không lo chi phí ẩn.

## Tiền điều kiện
- Không cần cấu hình, không thư viện mới.
- Muốn tỷ giá sát thực tế thì đặt `USD_VND_RATE` trên Render (tùy chọn).

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Bảng so sánh (trong app)**
- Given CTV đang ở chế độ chọn căn (Story 11.3) và đã chọn 2–3 căn
- When bấm **So sánh** trên thanh nổi (nút này chỉ bật khi chọn 2–3 căn; chọn 4 căn thì chỉ còn nút Lộ trình)
- Then hiện bảng so sánh toàn màn hình:
  - Mỗi căn một cột.
  - Cột tên tiêu chí dính bên trái. Trên điện thoại cuộn ngang mượt, cột căn rộng khoảng 70% màn hình, dừng gọn theo từng cột (`scroll-snap`).
- Các dòng so sánh:
  - Giá (VNĐ và USD).
  - Khu vực + tên đường; khoảng cách tới biển.
  - Diện tích, loại căn, số phòng ngủ / phòng tắm.
  - Tiện ích, ghi Có / Không / Chưa rõ: hồ bơi, thang máy, ban công, máy giặt riêng, nuôi thú cưng, gym.
  - Phí: điện / kWh, nước, dịch vụ, gửi xe; dịch vụ đã bao gồm (wifi, dọn phòng...).
  - **Tổng ước tính / tháng** theo mặc định 2 người, dùng điều hoà mức Vừa.
- Ô tốt nhất mỗi dòng được tô nhẹ: giá thấp nhất, gần biển nhất, tổng ước tính thấp nhất.
  Màu không phải dấu hiệu duy nhất: có thêm chữ "Tốt nhất".
- Có nút gạt `Tiếng Việt | English` (dùng `listingEn.ts` có sẵn), vì CTV thường đưa điện thoại cho khách nước ngoài xem.

**AC2 — Ước tính chi phí trên trang khách `/p/:slug`**
- Trang khách có mục **Ước tính chi phí / Estimated monthly cost**, gồm:
  - Chọn **số người**: 1–4 (nút bấm, vùng bấm ≥ 44px).
  - Chọn **mức dùng điều hoà**: Ít (4–6 giờ/ngày) / Vừa (8–10 giờ) / Nhiều (14–18 giờ).
- Kết quả cập nhật ngay, dạng `Tổng dự kiến: ~10.450.000 đ/tháng ($410/mo)`, kèm bảng nhỏ: tiền thuê, điện, nước, dịch vụ.
- Có dòng ghi chú "Ước tính tham khảo, thực tế tuỳ cách dùng".
- **Công thức** (một file `livingCost.ts`, chú thích tiếng Việt, dùng chung cho AC1):
  - Điện (kWh/tháng) = 50 kWh nền + 25 kWh × (số người − 1) + 0,9 kW × số giờ điều hoà (Ít 5 / Vừa 9 / Nhiều 16) × 30 ngày.
    Nhân với `fees.electricity`. Căn đã bao điện (`ELECTRICITY`) → 0đ. Không có giá điện → dùng 3.500 đ/kWh và ghi "giá điện tham khảo".
  - Nước:
    - `fees.water` ≥ 50.000 → hiểu là đ/người/tháng, nhân số người.
    - Nhỏ hơn → hiểu là đ/m³, mỗi người 4 m³/tháng.
    - Căn đã bao nước (`WATER`) → 0đ. Không có giá → 100.000 đ/người, ghi "tham khảo".
  - Dịch vụ = `fees.service` (cố định). Gửi xe chỉ tính khi bật "Có xe máy".
  - USD = tổng / `usdRate`, làm tròn tới $5. Căn có `priceUsd` thì phần tiền thuê dùng đúng số USD đó.
- Căn chưa có thông tin phí nào → vẫn hiện, ghi rõ các dòng "tham khảo".

## Phạm vi kỹ thuật
| File | Thay đổi |
|---|---|
| `frontend/src/utils/livingCost.ts` (mới) | `estimateMonthlyCost(listing, { people, acLevel, motorbike }, usdRate)` trả từng khoản + tổng VNĐ / USD + danh sách khoản "tham khảo". Viết thành hàm thuần |
| `share/public-listing.util.ts` | Trả thêm `usdRate` (từ `USD_VND_RATE`, mặc định 25.000) |
| `backend/src/config/currency.ts` (mới) | Gom hàm đọc tỷ giá dùng chung. `gemini.service.ts` đổi sang dùng hàm này (bỏ bản sao) |
| `auth/auth.controller.ts` (`me`) hoặc API cấu hình nhẹ | Gửi `usdRate` cho app (bảng so sánh) |
| `frontend/src/components/public/LivingCostEstimator.tsx` (mới) | Nút chọn số người / mức điều hoà, kết quả VI / EN |
| `pages/PublicListingPage.tsx` (195 dòng) | Gắn `LivingCostEstimator` dưới mục phí, giữ file dưới 250 dòng |
| `frontend/src/components/tour/CompareSheet.tsx` (mới) | Bảng so sánh, cột tiêu chí dính, cuộn ngang theo cột |
| `components/tour/TourBar.tsx` (Story 11.3) | Thêm nút **So sánh** |

## Rủi ro
- Đơn vị `fees.water` không thống nhất trong dữ liệu (lúc theo người, lúc theo m³), nên quy tắc ngưỡng 50.000 là đoán.
  Cách sửa tận gốc (nếu cần): thêm ô "đơn vị nước" vào form căn, làm thành story riêng.
- Ước tính chỉ để tham khảo, nên ghi rõ trên trang khách để tránh khách hiểu là cam kết.

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] Unit `estimateMonthlyCost`:
  - 2 người, mức Vừa, điện 3.800 đ/kWh → đúng số theo công thức.
  - Căn bao điện + nước → chỉ còn tiền thuê + dịch vụ.
  - Nước 100.000/người với nước 15.000/m³ cho kết quả đúng.
  - Có `priceUsd` → phần thuê bằng đúng giá USD.
- [ ] Puppeteer 390px:
  - Chọn 3 căn → bảng so sánh cuộn ngang theo cột, có chữ "Tốt nhất", trang không tràn (`innerWidth === 390`).
  - Trang `/p/:slug` đổi số người / mức điều hoà → tổng cập nhật; bản English hiện `$…/mo`.
- [ ] Build và lint không lỗi. Báo cáo, đề xuất commit `feat(compare): apartment comparison matrix and living cost estimator (Story 11.6)` chờ duyệt.
