# STORY 11.2: Bản đồ căn hộ & bong bóng giá (Epic 11)

**Bối cảnh:** `docs/stories/EPIC_11_SMART_BROKER_TOOLS_AND_REALTIME.md` Story 11.2, `EXTERNAL_CONFIG.md` mục 7.1.
Bạn chọn **Cách A**: dùng thẳng tile OpenStreetMap (0 đồng, không cần key), ghi nguồn OSM, không lưu tile để xem offline.

Hiện tại:
- Bảng hàng (`ApartmentsPage`) chỉ có danh sách, tìm qua `GET /apartments/search` (tối đa 50 căn mỗi trang).
- Toạ độ `location.coordinates` = `[kinh độ, vĩ độ]`, lấy từ link Google Maps (Story 8.3) hoặc ước lượng theo địa chỉ / tâm quận.
- CTV đã thấy địa chỉ đầy đủ của căn (`maskApartment` chỉ che SĐT chủ nhà). Trang khách `/p/:slug` làm tròn vị trí khoảng 500 m.

## User Story
Là **CTV / Quản lý**, tôi muốn gạt bảng hàng sang chế độ **Bản đồ** để xem các căn dưới dạng bong bóng giá (`8.5tr`, `$600`),
để thấy ngay căn nằm ở đâu so với biển Mỹ Khê, sông Hàn hay nơi khách làm việc.

## Tiền điều kiện
- Không cần cấu hình mới (không API key, không biến môi trường).
- **Cần bạn duyệt cài thư viện:** `leaflet` (chạy trong app, ~40KB gzip) và `@types/leaflet` (chỉ lúc build).
  Không dùng `react-leaflet` và `leaflet.markercluster`: gọi Leaflet trực tiếp và tự gom cụm theo ô lưới (khoảng 30 dòng).

## Phạm vi đã chốt (bạn duyệt ngày 19/11/2026)
- Bản đồ **chỉ có trong app** (CTV / Quản lý / ADMIN) và dùng toạ độ thật, vì CTV vốn đã thấy địa chỉ đầy đủ.
- **Không làm** bản đồ công khai `/m/:ctvCode` (AC7 cũ đã bỏ). Trang khách `/p/:slug` giữ nguyên vòng tròn làm tròn khoảng 500 m như hiện tại,
  nên không cần làm lệch 50–80 m.

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Gạt Danh sách ↔ Bản đồ**
- Given đang ở Bảng hàng trên điện thoại
- When bấm nút gạt `Danh sách | Bản đồ` cạnh nút Bộ lọc
- Then hiện bản đồ Đà Nẵng toàn màn hình nội dung (giữa header và menu đáy), **dùng chung bộ lọc đang chọn**.
- And lựa chọn được nhớ trong phiên (`sessionStorage`); quay lại Danh sách giữ nguyên bộ lọc.
- And mã bản đồ được **tải riêng khi cần** (`React.lazy`), không làm chậm lần mở Bảng hàng đầu tiên.

**AC2 — Bong bóng giá**
- Mỗi căn có toạ độ là một bong bóng giá rút gọn:
  - Giá VNĐ hiện kiểu `8.5tr`, `14tr`.
  - Căn chỉ có giá USD hiện kiểu `$600`.
- Màu theo trạng thái: xanh = Trống (`AVAILABLE`), cam = Sắp trống (`UPCOMING`), xám = Đã cọc (`DEPOSITED`, chỉ khi bộ lọc có chọn trạng thái này).
- Căn có vị trí **ước lượng** (không có link Google Maps và toạ độ trùng tâm quận) hiện viền nét đứt.
  Dưới bản đồ có dòng ghi chú "Viền nét đứt: vị trí ước lượng".
- Căn không có toạ độ không hiện trên bản đồ. Góc bản đồ ghi "N căn chưa có vị trí".

**AC3 — Gom cụm khi thu nhỏ**
- When thu nhỏ bản đồ và nhiều ghim nằm gần nhau trên màn hình
- Then gom thành một vòng tròn ghi số căn (VD `12`); bấm vào vòng thì phóng to vào cụm đó.
- Gom theo ô lưới khoảng 60px trên màn hình, tính lại mỗi khi phóng to / thu nhỏ. Phóng to tối đa thì không gom nữa.

**AC4 — Thẻ xem nhanh**
- When chạm vào một bong bóng giá
- Then hiện thẻ ở đáy màn hình (`BottomSheet` có sẵn), gồm:
  - Ảnh đầu tiên
  - Tên đường + khu vực
  - Loại căn
  - Giá
- Thẻ có 2 nút:
  - **Xem chi tiết**: mở `ApartmentDetailModal` có sẵn.
  - **Chỉ đường**: mở Google Maps tới toạ độ căn, link dạng `https://www.google.com/maps/dir/?api=1&destination=<vĩ độ>,<kinh độ>`.
- Vuốt xuống / chạm ra ngoài để đóng.

**AC5 — Tuân thủ chính sách tile OSM**
- Dùng `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (không dùng kiểu cũ `{s}.tile...`).
- Bản đồ luôn ghi nguồn `© OpenStreetMap` (có link).
- **Service worker không cache tile OSM** (giữ nguyên `vite.config.ts`, không thêm quy tắc cho `tile.openstreetmap.org`).
- Mất mạng: bản đồ hiện thông báo "Cần có mạng để xem bản đồ", nút gạt về Danh sách vẫn dùng được (danh sách có bản offline của Story 9.1).

**AC6 — Trạng thái**
- Đang tải: khung xám có hiệu ứng nhấp nháy (skeleton).
- Lỗi: thông báo kèm nút Thử lại.
- Không có căn khớp bộ lọc: "Không có căn phù hợp bộ lọc" kèm nút Xóa bộ lọc.

## Phạm vi kỹ thuật
| File | Thay đổi |
|---|---|
| `backend/src/modules/search/map-pins.service.ts` (mới) | Lấy ghim theo **cùng bộ lọc** với tìm kiếm (`filter.builder.ts`). Chỉ trả dữ liệu nhẹ: `_id, price, priceUsd, status, coordinates, street, zone, district, propertyType, bedrooms, firstImage, approximate`. Tối đa 500 căn, không phân trang |
| `search.controller.ts`, `search.routes.ts` | Thêm `GET /apartments/search/pins` (đăng nhập). Không trả `ownerContact` và không trả căn `RENTED` cho CTV (giống quy tắc hiện tại) |
| `frontend/src/api/apartmentApi.ts` | `getMapPins(params)` |
| `frontend/src/hooks/useMapPins.ts` (mới) | Gọi API theo bộ lọc hiện tại, có trạng thái loading / error / empty |
| `frontend/src/components/map/ApartmentMap.tsx` (mới, lazy) | Khởi tạo Leaflet trong `useEffect`. Ghim là `L.divIcon` (bong bóng giá). Gom cụm theo lưới. Có dòng ghi nguồn OSM |
| `frontend/src/utils/mapCluster.ts` (mới) | `clusterPins(pins, map)`: gom theo ô lưới pixel. Viết thành hàm thuần để test được |
| `frontend/src/utils/priceShort.ts` (mới) | `8500000` → `8.5tr`; chỉ có giá USD thì hiện `$600` |
| `frontend/src/components/map/MapQuickCard.tsx` (mới) | Thẻ xem nhanh trong `BottomSheet` |
| `frontend/src/pages/ApartmentsPage.tsx` | Nút gạt Danh sách / Bản đồ, nhớ lựa chọn bằng `sessionStorage`. File đang 190 dòng, giữ dưới 250 bằng cách tách phần bản đồ ra component riêng |

## Rủi ro
- **Nhiều căn chỉ có toạ độ tâm quận** nên ghim chồng lên nhau. Đã xử lý bằng gom cụm và viền nét đứt; cách sửa tận gốc là dán link Google Maps cho căn (Story 8.3).
- **Chính sách OSM cấm dùng tải nặng.** Một nhóm CTV nhỏ thì ổn. Khi đông người dùng, chuyển sang MapTiler / Mapbox (cần `VITE_MAP_TILE_KEY` giới hạn theo tên miền) bằng cách đổi 1 dòng URL tile.

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] API: chưa đăng nhập → 401. Bộ lọc khu vực / giá áp dụng đúng. CTV không nhận căn `RENTED` và không nhận SĐT chủ nhà. Trả tối đa 500 căn.
- [ ] Unit: `priceShort` (8.5tr / 14tr / $600); `clusterPins` gom đúng khi các ghim gần nhau và tách ra khi phóng to.
- [ ] Puppeteer khung 390px trên bản local:
  - Gạt sang Bản đồ hiện ghim và dòng nguồn OSM.
  - Chạm ghim mở thẻ xem nhanh.
  - Trang không tràn (`innerWidth === 390`).
  - Service worker không cache tile OSM.
- [ ] Build và lint frontend, backend không lỗi. Kiểm tra mã bản đồ nằm ở file JS riêng (lazy).
- [ ] Báo cáo, đề xuất commit `feat(map): interactive apartment map with price pills and clustering (Story 11.2)` chờ duyệt.
