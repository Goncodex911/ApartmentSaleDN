# STORY 11.3: Lập lộ trình dẫn khách xem nhà (Epic 11)

**Bối cảnh:** `docs/stories/EPIC_11_SMART_BROKER_TOOLS_AND_REALTIME.md` Story 11.3, `EXTERNAL_CONFIG.md` mục 7.2.
Bạn chọn **Cách A: tối đa 4 căn mỗi lộ trình**. Theo tài liệu Google Maps URLs, link mở bằng trình duyệt điện thoại chỉ nhận **3 điểm dừng giữa đường**
(`waypoints`), và URL tối đa 2.048 ký tự. Vì vậy lộ trình gồm: điểm xuất phát (vị trí CTV) + tối đa 3 điểm dừng + 1 điểm đích = tối đa 4 căn.

## User Story
Là **CTV** chuẩn bị dắt khách đi xem vài căn trong một buổi, tôi muốn tích chọn các căn rồi để hệ thống tự xếp thứ tự đi gần nhất
và mở sẵn lộ trình trên Google Maps, để không phải đi vòng vèo qua lại cầu sông Hàn.

## Tiền điều kiện
- Không cần cấu hình, không thư viện mới, không tốn phí (không dùng Google Directions API).
- Căn phải có toạ độ. Căn chỉ có vị trí ước lượng (Story 11.2) vẫn chọn được nhưng có cảnh báo.

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Chế độ chọn nhiều căn**
- Given đang ở Bảng hàng (danh sách)
- When bấm nút **Lộ trình** trên thanh công cụ
- Then mỗi thẻ căn hiện ô tích. Bấm vào thẻ lúc này là tích / bỏ tích (không mở chi tiết).
- And thanh nổi ở đáy (phía trên menu đáy) hiện "Đã chọn X/4 căn", kèm nút **Tạo lộ trình** (cần ít nhất 2 căn) và nút **Hủy**.
- When tích căn thứ 5 → báo "Tối đa 4 căn mỗi lộ trình", không tích thêm.
- Căn không có toạ độ: ô tích bị khoá, có chú thích "Chưa có vị trí".
- Danh sách đã chọn giữ được khi gạt sang Bản đồ / đổi trang (`sessionStorage`). Thẻ xem nhanh trên bản đồ có nút **Thêm vào lộ trình**.

**AC2 — Xếp thứ tự gần nhất**
- When bấm **Tạo lộ trình**
- Then app xin vị trí hiện tại (`navigator.geolocation`, chờ tối đa 8 giây).
  - **Có vị trí:** xếp theo thuật toán "điểm gần nhất tiếp theo" (Nearest Neighbor) bắt đầu từ vị trí CTV, khoảng cách tính theo đường chim bay (haversine).
  - **Không có vị trí** (từ chối / hết giờ): bắt đầu từ căn đã chọn đầu tiên, và hiện dòng "Bật định vị để xếp đường chính xác hơn".
- Kết quả hiện trong 1 giây, xử lý hoàn toàn trên điện thoại, không gọi server.

**AC3 — Màn hình tóm tắt lịch trình**
- Hiện danh sách theo thứ tự xem, mỗi dòng gồm:
  - Số thứ tự, tên đường + khu vực, giá, loại căn.
  - Khoảng cách từ điểm trước.
  - **Giờ hẹn gợi ý**: giờ bắt đầu (mặc định là giờ hiện tại làm tròn lên 15 phút, sửa được) + thời gian di chuyển ước tính (xe máy 25 km/h theo đường chim bay × 1,3) + 20 phút xem mỗi căn.
- Ghi chú / SĐT chủ nhà hiện **theo quyền đang có**: CTV thấy SĐT đã che như hiện tại, Quản lý thấy đầy đủ. Không thêm quyền mới.
- Kéo để đổi thứ tự là ngoài phạm vi. Dùng nút ↑ ↓ (vùng bấm ≥ 44px) để đổi thứ tự thủ công.

**AC4 — Mở Google Maps**
- When bấm **Mở Google Maps**
- Then mở link `https://www.google.com/maps/dir/?api=1&origin=<vị trí CTV>&destination=<căn cuối>&waypoints=<các căn giữa, cách nhau bằng |>&travelmode=two-wheeler`.
  - Không có vị trí CTV: bỏ `origin` (Google Maps tự dùng vị trí hiện tại hoặc hỏi người dùng). Khi đó căn đầu tiên trở thành điểm dừng đầu.
  - Toạ độ viết dạng `vĩ độ,kinh độ`, giữ 6 chữ số thập phân, mã hoá URL đầy đủ.
- And trên điện thoại có cài Google Maps, link mở thẳng ứng dụng (link thường, `target="_blank"`, không dùng thư viện).

## Phạm vi kỹ thuật
| File | Thay đổi |
|---|---|
| `frontend/src/utils/tourRoute.ts` (mới) | Gồm `haversineKm`, `orderNearestNeighbor(start, stops)`, `buildGoogleMapsDirUrl(origin, stops)`, `suggestTimes(start, legs)`. Viết thành hàm thuần, chú thích tiếng Việt |
| `frontend/src/hooks/useTourSelection.ts` (mới) | Danh sách căn đã chọn (tối đa 4), lưu `sessionStorage` |
| `frontend/src/components/tour/TourBar.tsx` (mới) | Thanh nổi "Đã chọn X/4" |
| `frontend/src/components/tour/TourPlanSheet.tsx` (mới) | Màn hình tóm tắt, nút ↑↓, nút Mở Google Maps |
| `components/apartment/ApartmentCard.tsx` | Thêm prop `selectable` / `selected` / `onToggle` (ô tích), không đổi giao diện khi không ở chế độ chọn |
| `pages/ApartmentsPage.tsx` | Nút **Lộ trình**, gắn `TourBar` và `TourPlanSheet` |
| `components/map/MapQuickCard.tsx` (Story 11.2) | Nút **Thêm vào lộ trình** |

## Rủi ro
- Giới hạn 3 điểm dừng trên trình duyệt điện thoại: đã chốt tối đa 4 căn. Kiểm tra thật trên điện thoại khi làm.
- `travelmode=two-wheeler` (xe máy) không có ở mọi nơi; nếu Google không hỗ trợ sẽ tự chuyển sang ô tô, link vẫn chạy được.
- Đường chim bay không tính cầu / đường một chiều, nên thứ tự là gần đúng. Đã có nút ↑↓ để sửa tay.

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] Unit:
  - `orderNearestNeighbor` với 4 điểm mẫu ở Sơn Trà / Ngũ Hành Sơn / Hải Châu ra đúng thứ tự.
  - `buildGoogleMapsDirUrl` đúng định dạng: có / không có `origin`, tối đa 3 `waypoints`, URL dưới 2.048 ký tự.
- [ ] Puppeteer khung 390px trên bản local:
  - Bật chế độ chọn, tích 4 căn, căn thứ 5 bị chặn.
  - Tóm tắt hiện đủ giờ hẹn.
  - Link mở có đúng tham số.
  - Trang không tràn.
- [ ] Bạn thử trên điện thoại thật: bấm **Mở Google Maps** thì ứng dụng Google Maps mở đúng các điểm dừng.
- [ ] Build và lint không lỗi. Báo cáo, đề xuất commit `feat(tour): showing tour route planner with Google Maps deep link (Story 11.3)` chờ duyệt.
