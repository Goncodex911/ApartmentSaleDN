# STORY CE-03.2: Siết Quy Tắc Bộ 3 Khi Kiểm Tra Trùng (Triplet Match Tightening)

**Bối cảnh:** `docs/stories/coverEpic.md` (CE-03, AC2 — phát hiện C).
Đã kiểm tra `backend/src/modules/dedup/similar-apartment.ts`, hàm `checkTripletMatch` (dòng 29–56):
* Điều kiện "cùng loại căn" dùng `||`: chỉ cần **trùng loại căn HOẶC trùng số phòng ngủ HOẶC tiêu đề giống ≥ 50%**. Hai căn hộ 1PN khác nhau cùng đường, cùng giá ±5% gần như luôn bị báo trùng.
* Không xét số nhà / tên tòa nhà. `16 Mỹ An 22` với `40 Mỹ An 22` vẫn bị coi là trùng.
* Không loại trường hợp **SĐT chủ khác nhau**. Bước 1 (SĐT + đường) đã không khớp, nhưng bộ 3 vẫn báo trùng.
* `Apartment.find(query).limit(200)` không sắp xếp và không `select`. Khi kho lớn sẽ lấy 200 căn ngẫu nhiên, tải cả document nặng (ảnh, mô tả).

Bộ 3 chỉ dùng ở luồng **có người xác nhận** (Quản lý tạo căn, CTV đăng tin, duyệt tin). Vì vậy siết lại sẽ giảm cảnh báo nhầm mà không làm mất căn.

---

## 1. Mô tả Story (User Story)
* **Là một:** Quản lý / CTV tạo căn mới.
* **Tôi muốn:** Chỉ bị cảnh báo trùng khi căn kia thật sự giống (cùng đường, cùng loại, cùng số phòng, không có dấu hiệu khác nhà).
* **Để:** Không phải bỏ qua cảnh báo nhầm liên tục rồi bỏ sót cảnh báo đúng.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story CE-03.1 đã xong (`sameStreet` so bằng nhau).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Dấu hiệu khác nhà thì không trùng
* **Given** căn mới và căn ứng viên cùng quận, cùng đường, giá lệch ≤ 5%
* **When** cả 2 đều có số nhà và số nhà (đã chuẩn hóa: bỏ `số`/`kiệt`/khoảng trắng, chữ thường) **khác nhau**
* **Or** cả 2 đều có tên tòa nhà (`buildingName`) và tên **khác nhau**
* **Or** cả 2 đều có SĐT chủ (`toVnPhone`) và SĐT **khác nhau**
* **Then** không coi là trùng.

### AC2 — Cùng loại VÀ cùng số phòng
* **Then** chỉ coi là trùng khi **cùng loại căn VÀ cùng số phòng ngủ** (khi cả 2 bên có giá trị).
* **And** nếu một bên thiếu loại căn hoặc số phòng thì cần tiêu đề giống ≥ 0.6 (Jaccard) mới coi là trùng.

### AC3 — Truy vấn gọn
* **Then** truy vấn ứng viên dùng `.sort({ updatedAt: -1 }).limit(300).select('title price location attributes ownerContact.phone managerId images createdAt updatedAt')` cùng `.lean()` nếu `summarizeDuplicate` vẫn chạy được với object thường.

### AC4 — Lý do rõ ràng
* **Then** `reason` trả về nêu đủ các tiêu chí đã khớp, VD: *"Cùng đường Mỹ An 22, giá lệch 3%, cùng loại Căn hộ 1PN"*. Câu này dùng cho banner ở Story CE-03.3.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend
* **`backend/src/modules/dedup/similar-apartment.ts`:**
  - `TripletInput` thêm `houseNumber?`, `buildingName?`, `phone?`.
  - `findSimilarApartment` truyền `location.houseNumber`, `location.buildingName`, `ownerContact.phone` vào.
  - Tách hàm thuần `isTripletDuplicate(input, apt): { match: boolean; reason?: string }` để test được mà không cần DB.
  - Tên loại căn trong `reason` lấy từ bảng nhãn tiếng Việt sẵn có (nếu có ở `listing-taxonomy.ts`).
* Kiểm tra `ListingLike.location` đã có `buildingName`. Nếu chưa thì thêm vào interface (schema `Apartment` đã có trường này thì không đổi model).
* Không thêm biến môi trường.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Unit test `isTripletDuplicate`: khác số nhà → false; khác tòa → false; khác SĐT → false; cùng loại khác số PN → false; đủ điều kiện → true kèm `reason`.
* [ ] `npm test` backend đạt; `tsc --noEmit` không lỗi.
* [ ] Thử tay: tạo căn 1PN ở `40 Mỹ An 22` khi kho đã có căn 1PN ở `16 Mỹ An 22` cùng giá → không cảnh báo.
