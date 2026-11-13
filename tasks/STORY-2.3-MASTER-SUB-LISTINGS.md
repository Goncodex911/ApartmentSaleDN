# STORY-2.3: Mô hình Căn hộ Gốc & Nguồn tham chiếu (Master - Sub Listings)

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý hệ thống hoặc Quản lý kho hàng.
* **Tôi muốn:** Gom các bài đăng cùng một căn phòng từ nhiều nguồn khác nhau (Telegram, Zalo, Facebook) vào một **Căn hộ gốc (Master Apartment)**.
* **Để:** Bảng hàng không bị rác/trùng lặp, đồng thời Quản lý và CTV có thể so sánh chênh lệch giá, ảnh và thông tin giữa các nguồn để chốt deal tốt nhất.

---

## 2. Tiền điều kiện (Pre-conditions)
1. **[STORY-2.1](file:///d:/CODE/AppartmentSaleProject/tasks/STORY-2.1-APARTMENT-CRUD.md)** và **[STORY-2.2](file:///d:/CODE/AppartmentSaleProject/tasks/STORY-2.2-AVAILABILITY-STATUS.md)** đã hoàn thành: Đã có bảng hàng căn hộ, phân trang và data masking.
2. Token xác thực JWT của Quản lý / Admin.

---

## 3. Tiêu chí Chấp nhận (Acceptance Criteria - Gherkin)

### AC1: Cấu trúc Dữ liệu Nguồn Tham chiếu (`subListings`)
* **Given:** Căn hộ gốc (Master Apartment).
* **Then:** Chứa một mảng `subListings` lưu vết các nguồn đăng khác nhau, mỗi sub-listing gồm:
  * `sourceType`: `'TELEGRAM' | 'ZALO' | 'FACEBOOK' | 'MANUAL'`
  * `sourceName`: Tên nhóm nguồn (Ví dụ: *"Hội Cho Thuê Phòng Cầu Giấy"* hoặc *"Zalo Đầu Chủ"*).
  * `sourceUrl`: Link bài đăng gốc hoặc link tin nhắn.
  * `price`: Giá do nguồn đó chào (Ví dụ: Nguồn Tele chào 6.5tr, Nguồn Zalo chào 6.2tr).
  * `ownerContact`: `{ name, phone, note }` của nguồn đó.
  * `images`: Danh sách ảnh từ nguồn đó cung cấp.
  * `rawContent`: Nội dung text gốc của bài đăng.
  * `postedAt`: Thời điểm bài đăng được tạo.

### AC2: Đính kèm Nguồn Tham chiếu vào Căn Master (`POST /:id/sub-listings`)
* **Given:** Quản lý (hoặc bot tự động ở Epic 3) phát hiện một bài đăng trùng với Căn Master ID `X`.
* **When:** Gửi request `POST /api/v1/apartments/:id/sub-listings` với thông tin bài đăng mới.
* **Then:** Hệ thống thêm bài đăng đó vào mảng `subListings` của căn Master mà không tạo thêm bản ghi căn hộ mới gây rác kho hàng.

### AC3: Chọn Giá và Ảnh Đại diện Chuẩn cho Căn Master
* **Given:** Căn Master có 3 nguồn đăng với các mức giá: 6.5tr, 6.2tr, 6.4tr.
* **When:** Quản lý chọn mức giá tối ưu (6.2tr) làm giá đại diện `price` của Căn Master.
* **Then:** Bảng hàng chung hiển thị mức giá đại diện 6.2tr, kèm huy hiệu: *"Có 3 nguồn tham chiếu"*.

### AC4: Xem Đối chiếu Đa nguồn & Bảo toàn Data Masking cho CTV
* **Given:** CTV hoặc Quản lý xem chi tiết căn hộ `GET /api/v1/apartments/:id`.
* **When:** Server xử lý dữ liệu trả về.
* **Then:**
  * **Với Quản lý/Admin:** Hiển thị trọn vẹn số điện thoại của tất cả các nguồn trong `subListings`.
  * **Với CTV:** Vẫn **tự động che SĐT của tất cả các nguồn** (dạng `0912***678`), giúp CTV chỉ biết có nguồn chênh lệch giá để báo quản lý đàm phán mà không bị lộ số đầu mối gốc.

### AC5: Gỡ bỏ Nguồn Tham chiếu khỏi Căn Master (`DELETE /:id/sub-listings/:subId`)
* **Given:** Quản lý phát hiện 1 sub-listing bị gom nhầm vào Căn Master.
* **When:** Gửi request `DELETE /api/v1/apartments/:id/sub-listings/:subId`.
* **Then:** Xóa sub-listing đó ra khỏi mảng của Căn Master, trả về HTTP 200.

---

## 4. Phạm vi Kỹ thuật (Technical Implementation Scope)

### A. Cập nhật Model `apartment.model.ts`:
```typescript
interface ISubListing {
  _id?: Types.ObjectId;
  sourceType: 'TELEGRAM' | 'ZALO' | 'FACEBOOK' | 'MANUAL';
  sourceName?: string;
  sourceUrl?: string;
  price?: number;
  ownerContact?: {
    name?: string;
    phone?: string;
    note?: string;
  };
  images?: string[];
  rawContent?: string;
  postedAt?: Date;
}

// Bổ sung vào IApartment:
subListings: ISubListing[];
```

### B. Backend Files cần triển khai:
1. `backend/src/modules/apartments/apartment.validation.ts`:
   * Bổ sung Zod schema: `addSubListingSchema`.
2. `backend/src/modules/apartments/apartment.service.ts`:
   * `addSubListing(apartmentId, data, user)`
   * `removeSubListing(apartmentId, subListingId, user)`
   * Cập nhật hàm `maskApartment()`: Duyệt qua toàn bộ mảng `subListings` và che SĐT chủ của từng nguồn đối với CTV.
3. `backend/src/modules/apartments/apartment.controller.ts`:
   * Bổ sung controller: `addSubListing`, `removeSubListing`.
4. `backend/src/modules/apartments/apartment.routes.ts`:
   * `POST /:id/sub-listings`
   * `DELETE /:id/sub-listings/:subId`

---

## 5. Danh sách Kiểm thử & Định nghĩa Hoàn thành (Definition of Done)
- [ ] Thêm mới thành công sub-listing vào căn hộ gốc Master.
- [ ] Xóa bỏ thành công sub-listing bị gom nhầm.
- [ ] Kiểm thử tự động Data Masking: SĐT trong mảng `subListings` cũng tự động bị che khi trả về cho CTV.
- [ ] Chạy `npm run build` (`tsc`) biên dịch 0 lỗi.
- [ ] Tuân thủ [WORKING_RULES.md](file:///d:/CODE/AppartmentSaleProject/WORKING_RULES.md): Không tự ý chạy lệnh git nếu chưa được phép.

