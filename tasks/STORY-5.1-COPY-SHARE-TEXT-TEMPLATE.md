# STORY-5.1: Copy Văn bản Mẫu Gửi Khách (1-Click Text Template)

## 1. Mô tả Story (User Story)
* **Là một:** Cộng tác viên môi giới (CTV) đang tư vấn khách qua Zalo/Messenger trên điện thoại.
* **Tôi muốn:** Bấm một nút "Copy tin gửi khách" trên bất kỳ căn hộ nào (ở Card và ở Modal chi tiết).
* **Để:** Dán ngay vào khung chat của khách một bài tư vấn hoàn chỉnh, có emoji, mang thông tin liên hệ của chính tôi, và **không bao giờ lộ** số điện thoại, ghi chú riêng hay địa chỉ chính xác của chủ nhà.

---

## 2. Tiền điều kiện (Pre-conditions)
1. Model `Apartment` (Story 2.1) đã có các trường: `title`, `price`, `deposit` (VNĐ), `location.ward`, `location.district`, `attributes.*` (`bedrooms`, `area`, `furnishing`, `washingMachine`, `elevator`, `carParking`, `allowPets`, `balcony`, `pcccStandard`), `fees.*`, `status`, `availableDate`.
2. Data Masking (Story 1.2) đang hoạt động: API trả về cho CTV đã che SĐT chủ nhà và xóa `ownerContact.note`.
3. Hồ sơ CTV (Story 1.3) có `name`, `phone`, `zaloPhone`; `ApartmentsPage` đã có `currentUser` lấy từ `GET /api/v1/auth/me` và được cập nhật lại khi CTV sửa hồ sơ.

---

## 3. Tiêu chí Chấp nhận (Acceptance Criteria - Gherkin)

### AC1: Copy vào Clipboard trong 1 chạm
* **Given:** CTV đã đăng nhập và đang xem danh sách căn hộ hoặc Modal chi tiết căn hộ.
* **When:** CTV chạm nút `📋 Copy tin gửi khách`.
* **Then:**
  * Toàn bộ nội dung bài tư vấn được ghi vào Clipboard **ngay trong lần chạm đó**, không cần mở thêm hộp thoại hay bấm xác nhận.
  * Nút đổi sang trạng thái `✓ Đã copy` (màu xanh) trong 2 giây rồi tự trở về như cũ.
  * Việc bấm nút trên Card **không** mở Modal chi tiết (chặn sự kiện click lan ra ngoài).

### AC2: Hoạt động trên trình duyệt điện thoại (iOS Safari, Chrome Android, Zalo in-app browser)
* **Given:** CTV dùng điện thoại, kể cả khi truy cập qua `http://` trong mạng LAN (không có `navigator.clipboard`).
* **When:** CTV chạm nút copy.
* **Then:**
  * Nội dung được tạo **đồng bộ** (synchronous) từ dữ liệu đã có sẵn trên màn hình, không gọi API trước khi copy (iOS Safari từ chối ghi Clipboard nếu có `await` mạng trước đó).
  * Thứ tự thử: `navigator.clipboard.writeText` → fallback `textarea` + `document.execCommand('copy')`.
  * Nếu cả hai cách đều thất bại: hiển thị khung xem trước (textarea đã bôi đen sẵn toàn bộ nội dung) để CTV nhấn giữ và copy thủ công.

### AC3: Định dạng bài viết tự động kèm emoji
* **Given:** Căn hộ "1N1K ban công siêu thoáng", Cầu Giấy, giá 7.200.000, cọc 7.200.000, Full đồ, máy giặt riêng, có thang máy và ô tô đỗ cửa. CTV tên "Hải", Zalo `0987654321`.
* **When:** CTV chạm nút copy.
* **Then:** Nội dung trong Clipboard có dạng:
  ```text
  🏢 [QUẬN CẦU GIẤY] - CĂN 1N1K BAN CÔNG SIÊU THOÁNG
  📍 Khu vực: Phường Dịch Vọng, Cầu Giấy
  📐 Diện tích: 30m² · 1 phòng ngủ
  💵 Giá thuê: 7.200.000 VNĐ/tháng (Cọc 1 tháng)
  ⚡ Phí: Điện 3.800đ/kWh · Nước 100.000đ/người · Dịch vụ 150.000đ
  🛋 Nội thất: Full đồ, máy giặt riêng
  🚗 Tiện ích: Thang máy, ô tô đỗ cửa
  📞 Liên hệ xem phòng trực tiếp: Hải - 0987654321 (Zalo)
  ```
* **Quy tắc sinh từng dòng:**

  | Dòng | Nguồn dữ liệu | Quy tắc |
  |---|---|---|
  | 🏢 Tiêu đề | `location.district`, `title` | Viết HOA. Thêm tiền tố `QUẬN` nếu `district` chưa bắt đầu bằng `Quận`/`Huyện`/`Thị xã`. Tiêu đề được làm sạch theo AC4. |
  | 📍 Khu vực | `location.ward`, `location.district` | **Chỉ phường + quận**, không bao giờ dùng `location.address` (số nhà, ngõ). |
  | 📐 Diện tích | `attributes.area`, `attributes.bedrooms` | `bedrooms = 0` → "Studio". Bỏ phần diện tích nếu không có `area`. |
  | 💵 Giá thuê | `price`, `deposit` | Định dạng `vi-VN`. Nếu `deposit` chia hết cho `price` → `(Cọc N tháng)`; nếu khác → `(Cọc 5.000.000 VNĐ)`; nếu `deposit = 0` → bỏ phần cọc. |
  | ⚡ Phí | `fees.electricity`, `fees.water`, `fees.service` | Chỉ liệt kê phí có giá trị; bỏ cả dòng nếu không có phí nào. |
  | 🛋 Nội thất | `attributes.furnishing`, `attributes.washingMachine` | `FULL` → "Full đồ", `BASIC` → "Đồ cơ bản", `EMPTY` → "Nhà trống"; thêm "máy giặt riêng/chung" nếu có. **Không tự bịa** danh sách đồ (giường, tủ...) vì model không lưu. |
  | 🚗 Tiện ích | `elevator`, `carParking`, `allowPets`, `balcony`, `pcccStandard` | Chỉ liệt kê tiện ích `true`; bỏ cả dòng nếu không có tiện ích nào. |
  | 🗓 Ngày trống | `status`, `availableDate` | Chỉ thêm khi `status = UPCOMING`: `🗓 Trống từ: 01/12/2026`. |
  | 📞 Liên hệ | `currentUser.name`, `currentUser.zaloPhone` | Dùng `zaloPhone`; nếu trống thì dùng `phone` của CTV. |

### AC4: Tuyệt đối không lộ thông tin chủ nhà & thông tin nội bộ
* **Given:** Bất kỳ căn hộ nào, kể cả khi người bấm là ADMIN/MANAGER (dữ liệu chưa bị masking).
* **When:** Nội dung tin được sinh ra.
* **Then:**
  * Bộ sinh tin dùng **danh sách trắng (whitelist)** các trường ở AC3; **không đọc** `ownerContact`, `subListings`, `commission`, `description`, `location.address`, `images`, `sourceUrl`.
  * `title` được làm sạch: xóa mọi chuỗi giống số điện thoại Việt Nam (9–11 chữ số, chấp nhận dấu cách/chấm/gạch giữa các số, có hoặc không có `+84`) trước khi đưa vào tin.
  * Số điện thoại duy nhất xuất hiện trong tin là số của CTV đang đăng nhập.

### AC5: Trạng thái nút theo tình trạng căn hộ & hồ sơ CTV
* **Given:** Căn hộ có `status = RENTED`.
* **Then:** Nút copy bị vô hiệu hóa, tooltip "Căn đã cho thuê".
* **Given:** `currentUser` chưa tải xong.
* **Then:** Nút ở trạng thái disabled (không cho copy tin thiếu dòng liên hệ).

---

## 4. Phạm vi Kỹ thuật (Technical Implementation Scope)

> **Quyết định kỹ thuật:** Sinh tin **ở Frontend** bằng hàm thuần (pure function), **không thêm API Backend**.
> * Lý do: dữ liệu căn hộ (đã masking) và hồ sơ CTV đã có sẵn trên màn hình; sinh tin đồng bộ giữ được "user gesture" để iOS Safari cho phép ghi Clipboard (AC2).
> * An toàn: whitelist trường + làm sạch tiêu đề (AC4) là lớp bảo vệ thứ hai, bên cạnh Data Masking của Backend.

### A. Backend
Không thay đổi.

### B. Frontend
```plaintext
frontend/src/
├── utils/
│   ├── shareText.ts            # [MỚI] buildShareText(apartment, ctv): string + stripPhoneNumbers(text) — hàm thuần, comment tiếng Việt cho quy tắc cọc/phí/làm sạch SĐT
│   └── clipboard.ts            # [MỚI] copyToClipboard(text): Promise<boolean> — navigator.clipboard → fallback execCommand
├── components/apartment/
│   ├── CopyShareButton.tsx     # [MỚI] Nút copy: trạng thái idle / "✓ Đã copy" (2s) / fallback khung xem trước; stopPropagation; disabled theo AC5
│   ├── ApartmentCard.tsx       # [SỬA] Thêm prop currentUser, gắn CopyShareButton vào hàng nút thao tác
│   └── ApartmentDetailModal.tsx# [SỬA] Thêm prop currentUser, gắn CopyShareButton (bản lớn, full-width trên mobile)
└── pages/
    └── ApartmentsPage.tsx      # [SỬA] Truyền currentUser xuống ApartmentCard & ApartmentDetailModal
```

### C. Chữ ký hàm dự kiến
```ts
// frontend/src/utils/shareText.ts
type ShareContact = Pick<User, 'name' | 'phone' | 'zaloPhone'>;
export function buildShareText(apartment: Apartment, ctv: ShareContact): string;
export function stripPhoneNumbers(text: string): string;
```

---

## 5. Danh sách Kiểm thử & Định nghĩa Hoàn thành (Definition of Done)
- [ ] Test Kịch bản 1: Căn mẫu ở AC3 → nội dung dán vào Zalo khớp đúng 8 dòng, emoji hiển thị đúng.
- [ ] Test Kịch bản 2: Căn có `deposit = 2 × price` → hiển thị `(Cọc 2 tháng)`; `deposit = 5.000.000`, `price = 7.200.000` → `(Cọc 5.000.000 VNĐ)`; `deposit = 0` → không có phần cọc.
- [ ] Test Kịch bản 3: Căn không có phí và không có tiện ích nào → dòng ⚡ và 🚗 bị bỏ, không còn dòng trống.
- [ ] Test Kịch bản 4: Tiêu đề `"Studio full đồ LH 0912.345.678"` → tin copy không còn số `0912.345.678`.
- [ ] Test Kịch bản 5: Đăng nhập ADMIN (dữ liệu không masking) → tin copy không chứa SĐT, tên, ghi chú chủ nhà, địa chỉ số nhà, hoa hồng.
- [ ] Test Kịch bản 6: CTV chưa khai `zaloPhone` → dòng liên hệ dùng `phone`; sau khi cập nhật `zaloPhone` trong Hồ sơ → lần copy tiếp theo dùng số mới (không cần F5).
- [ ] Test Kịch bản 7: Truy cập qua `http://<IP LAN>` trên điện thoại → copy vẫn thành công nhờ fallback; nếu thất bại thì hiện khung xem trước.
- [ ] Test Kịch bản 8: Bấm nút copy trên Card không mở Modal chi tiết; căn `RENTED` có nút bị vô hiệu hóa.
- [ ] `npm run build` ở `frontend/` chạy thành công, không lỗi TypeScript.
- [ ] Tuân thủ Ponytail: Toàn bộ file tạo mới hoặc sửa đổi đều ≤ 250 dòng, không `console.log` thừa, không unused imports.
- [ ] Tuân thủ [WORKING_RULES.md](../WORKING_RULES.md): Không tự ý commit hoặc push mã nguồn khi chưa được người dùng cho phép.
