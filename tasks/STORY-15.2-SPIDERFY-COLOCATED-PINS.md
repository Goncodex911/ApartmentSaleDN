# STORY 15.2: Tản Ghim Trùng Tọa Độ (Spiderfy Colocated Pins)

**Bối cảnh:** Epic 15. Bản đồ hiện gom ghim theo ô lưới 60px (`utils/mapCluster.ts`). Nhóm căn **trùng vị trí** (cùng tòa nhà, hoặc vị trí ước lượng dồn về tâm quận) dù phóng to tối đa vẫn là 1 cụm; bấm vào chỉ mở **danh sách** (`MapQuickCard` nhiều căn), không thấy được từng ghim giá trên bản đồ.

---

## 1. Mô tả Story (User Story)
* **Là một:** CTV / Quản lý đang lướt bản đồ.
* **Tôi muốn:** Khi phóng to, các căn trùng vị trí tự tản ra quanh điểm gốc để chạm chọn từng căn.
* **Để:** Thấy đủ giá từng căn ngay trên bản đồ, không bị ghim đè nhau.

---

## 2. Tiền điều kiện (Pre-conditions)
* Có `clusterPoints`, `pillIcon`, `MapQuickCard` (Story 11.2). Không thêm thư viện (không dùng `OverlappingMarkerSpiderfier`).
* Nên làm sau 15.1 (cùng sửa `ApartmentMap.tsx`), không phụ thuộc kỹ thuật.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Nhận diện nhóm trùng vị trí
* Nhóm "trùng vị trí" = mọi căn trong cụm cách nhau < **15m**.
* **Given** mức phóng to ≥ **16** và có nhóm trùng vị trí
* **Then** nhóm hiện là 1 huy hiệu số lượng (như cụm hiện tại).
* **When** bấm huy hiệu → các ghim giá **tản ra** quanh điểm gốc.
* Mức phóng to < 16: giữ hành vi hiện tại (bấm cụm → phóng to vào cụm).

### AC2 — Bố cục tản
* ≤ 6 căn: chia đều trên **vòng tròn** bán kính 30px, bắt đầu từ hướng 12 giờ.
* 7–20 căn: **xoắn ốc** tỏa dần ra ngoài, các ghim không chạm nhau.
* \> 20 căn (thường là căn ước lượng dồn tâm quận): không tản; giữ hành vi mở **danh sách** như hiện tại (tản 40 bong bóng sẽ phủ kín màn hình).
* Mỗi ghim đã tản nối với điểm gốc bằng 1 đường mảnh, màu xám mờ; điểm gốc có chấm nhỏ.

### AC3 — Thao tác
* Chạm 1 ghim đã tản → mở thẻ xem nhanh `MapQuickCard` của căn đó; ghim được tô chọn như hiện tại.
* Chạm vùng trống trên bản đồ, phóng to / thu nhỏ, hoặc bấm nhóm khác → các ghim **thu về** điểm gốc.
* Real-time (Story 11.4): căn đổi giá / trạng thái trong lúc đang tản → ghim cập nhật, không tự thu lại.

### AC4 — Chuyển động (apple-design)
* Tản ra và thu về đi **cùng một đường** (từ tâm ra và về tâm), khoảng 200ms, dạng lò xo không nảy, chỉ dùng `transform` / `opacity`.
* Bấm thu về giữa lúc đang tản → đổi hướng ngay, không chờ xong.
* `prefers-reduced-motion` → hiện / ẩn ngay, không chuyển động.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Frontend:
* **`frontend/src/utils/spiderfy.ts` (mới, hàm thuần):** `spiderfyOffsets(count): { x: number; y: number }[]` — vòng tròn (≤ 6) hoặc xoắn ốc Archimedes (7–20). Không phụ thuộc Leaflet để kiểm thử độc lập.
* **`frontend/src/components/map/ApartmentMap.tsx`:**
  - State `expandedKey` (id căn đầu của nhóm đang tản).
  - Khi vẽ cụm: nhóm trùng vị trí + zoom ≥ 16 → bấm thì đặt `expandedKey`.
  - Nhóm đang tản → vẽ ghim tại `map.unproject(center + offset)` + `L.polyline` chân.
  - `map.on('click' | 'zoomstart')` → bỏ tản.
  - Ngưỡng 15m thay cho `samePlace < 30m` hiện tại. Giữ nhánh "> 20 căn → danh sách".
  - Chuyển động: đặt CSS custom property cho vị trí đích trên phần tử ghim + `transition: transform`; giảm chuyển động thì không đặt transition.
* **`frontend/src/index.css`:** class chuyển động cho ghim tản (có nhánh `prefers-reduced-motion`).

### Backend:
* Không đổi.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Kiểm thử hàm `spiderfyOffsets` (tsx, scratchpad):
  - count 1–6 → cùng bán kính 30px, góc đều.
  - count 7–20 → khoảng cách giữa 2 ghim liên tiếp ≥ 24px.
* [ ] Chrome headless 390px với DB thử:
  - 5 căn cùng tọa độ → zoom 17, bấm huy hiệu → 5 ghim giá tản đều; bấm 1 ghim → thẻ xem nhanh đúng căn; chạm vùng trống → thu về.
  - 30 căn dồn tâm quận → bấm cụm vẫn mở danh sách.
* [ ] Giảm chuyển động → không có transition.
* [ ] `tsc` + `npm run build` frontend không lỗi.
* [ ] Báo cáo và đề xuất commit, chờ duyệt.

---

## 6. Rủi ro & lựa chọn
* **Ngưỡng 20 căn** là đề xuất (Epic chỉ nói "> 6 → xoắn ốc"). Tản nhiều hơn khó chạm chính xác trên điện thoại; Story 15.6 (định vị theo tên đường) sẽ giảm hẳn số căn dồn tâm quận.
* Không thêm thư viện; hàm toán ~25 dòng.
