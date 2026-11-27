# STORY 20.8: Xem Ảnh Trực Tiếp Trên Thẻ Căn (Card Photo Lightbox)

**Bối cảnh:** `docs/stories/EPIC_20_USER_FEEDBACK_INGESTION_MAP_FORM.md` (mục E, Story 20.8). Phản hồi: "Show ra list ảnh như zalo luôn, bấm trực tiếp vào xem ảnh chứ không cần bấm vào detail".
Đã kiểm tra trên `main` ee1fdfe:
* `ApartmentCard.tsx` (169 dòng): chế độ `card` dùng `CardPhotoCarousel` (73 dòng, khung 4:3, vuốt ngang, tối đa 5 ảnh, chấm chỉ báo, badge số ảnh); chế độ `list` hiện 1 ảnh `photos[0]`.
* Bấm ảnh → `onOpen(apartment)` mở **chi tiết** (hoặc tích chọn khi đang lập lộ trình).
* Vuốt carousel không kích hoạt click (`CardPhotoCarousel.tsx` dòng 9–10).
* `frontend/src/components/media/MediaLightbox.tsx` có sẵn (đang dùng ở chi tiết căn và trang khách).

**Độ khó:** Trung bình (cử chỉ chạm / vuốt, nhiều chế độ thẻ) — **Claude làm**.

---

## 1. Mô tả Story (User Story)
* **Là một:** CTV lướt danh sách căn.
* **Tôi muốn:** Bấm vào ảnh trên thẻ là xem ảnh toàn màn hình ngay, như album Zalo.
* **Để:** Lọc nhanh căn hợp khách mà không phải mở chi tiết từng căn.

---

## 2. Tiền điều kiện (Pre-conditions)
* Không có.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Chế độ thẻ (carousel)
* **Given** danh sách ở chế độ thẻ
* **When** **chạm** (không vuốt) vào ảnh thứ i của carousel
* **Then** mở `MediaLightbox` tại ảnh i, vuốt xem **toàn bộ** ảnh / video của căn (không chỉ 5 ảnh của carousel).
* **And** chạm vào phần chữ của thẻ (tiêu đề, giá, địa chỉ) vẫn mở **chi tiết** như cũ.
* **And** vuốt ngang carousel vẫn chỉ chuyển ảnh, không mở lightbox.

### AC2 — Chế độ danh sách gọn
* **Then** ảnh nhỏ có badge "+N" (N = số ảnh còn lại); chạm ảnh → lightbox từ ảnh đầu.

### AC3 — Quyền & ảnh ẩn
* **Then** ảnh trong `hiddenImages` (ảnh dán SĐT nguồn) **không** hiện với CTV trong lightbox — cùng luật lọc ảnh với chi tiết căn.
* **And** đang ở chế độ chọn căn lập lộ trình → chạm ảnh vẫn là **tích chọn**, không mở lightbox.

### AC4 — Đóng & chuyển động
* **Then** đóng bằng nút X (≥ 44px), phím Esc, hoặc vuốt xuống (theo hành vi `MediaLightbox` hiện có); tôn trọng `prefers-reduced-motion`.
* **And** đóng lightbox → danh sách giữ nguyên vị trí cuộn.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Frontend
* **`frontend/src/components/apartment/CardPhotoCarousel.tsx`**: thêm prop `onPhotoTap(index)`; chặn lan sự kiện lên thẻ khi chạm ảnh.
* **`frontend/src/components/apartment/ApartmentCard.tsx`**: state mở lightbox + chỉ số ảnh; render `MediaLightbox` (lazy import để không tăng bundle trang danh sách); badge "+N" ở chế độ list.
* Dùng lại hàm lọc ảnh hiển thị (bỏ `hiddenImages`) đang dùng ở `ApartmentDetailModal.tsx` — tách ra `utils/` nếu đang viết lặp.
* Không đổi backend (dữ liệu danh sách đã có `images`; kiểm tra danh sách có trả đủ ảnh, không chỉ 5 ảnh đầu — nếu không đủ thì mở lightbox với ảnh đang có và ghi lại để xử lý sau).

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] `npm run build` (frontend) đạt.
* [ ] Thử thật trên iPhone / Android: chạm ảnh → lightbox đúng ảnh; vuốt carousel không mở; chạm chữ → chi tiết; chế độ chọn lộ trình không bị ảnh hưởng.
* [ ] File ≤ 300 dòng, không `console.log`.
