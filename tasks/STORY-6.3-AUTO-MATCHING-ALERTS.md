# STORY-6.3: Ghép căn tự động khi có hàng mới về (Auto-Matching Alerts)

## 1. Mô tả Story (User Story)
* **Là một:** CTV đang có nhiều khách chưa tìm được phòng ưng ý.
* **Tôi muốn:** Khi hệ thống có căn mới hợp tầm giá và khu vực của khách, tôi được báo ngay và gửi cho khách bằng 1 chạm.
* **Để:** Là người đầu tiên gửi căn mới cho khách, tăng tỷ lệ chốt cọc.

---

## 2. Tiền điều kiện (Pre-conditions)
1. `Lead.requirements` (Story 6.1/6.2) có `districts`, `maxBudget`, `bedrooms`, `allowPets`, `carParking`.
2. `Notification` + Telegram notify (Story 6.2).
3. Copy tin gửi khách (5.1) và link xem phòng (5.3).

---

## 3. Tiêu chí Chấp nhận (Acceptance Criteria - Gherkin)

### AC1: Thuật toán so khớp
* **Khi:** Có căn Master **mới** ở trạng thái `AVAILABLE`/`UPCOMING`, do Quản lý tạo tay (`ApartmentService.create`) hoặc do pipeline nhập tin (`DedupService`).
* **Thì:** So với mọi Lead đang mở (`NEW`, `CONSULTING`, `VIEWING`) có ít nhất khu vực hoặc ngân sách:
  * Khu vực: quận của căn khớp 1 trong `requirements.districts` (so sánh bỏ dấu, không phân biệt hoa thường).
  * Ngân sách: `price ≤ maxBudget × 1.05` (cho phép vượt 5%).
  * Nếu khách yêu cầu: `allowPets`, `carParking` phải `true`; `bedrooms` phải khớp.
  * Tiêu chí khách chưa khai thì bỏ qua (không loại căn).
* Việc so khớp chạy **nền**, không làm chậm việc tạo căn. Lỗi so khớp không làm hỏng việc tạo căn.

### AC2: Thông báo đẩy trong app (+ Telegram nếu đã liên kết)
* Mỗi cặp (khách, căn) chỉ báo 1 lần: *"Có căn mới 1N1K Cầu Giấy 6.8tr rất hợp với khách [Anh Nam] của bạn. Bấm để gửi ngay!"*
* Chuông thông báo trên Navbar: số chưa đọc. Hỏi server mỗi 30 giây (chỉ khi tab đang mở), danh sách 30 thông báo gần nhất, "Đánh dấu đã đọc tất cả".

### AC3: Bấm 1 lần để gửi cho khách
* Bấm thông báo ghép căn → Modal gồm: ảnh, giá và khu vực căn, tên khách và các nút:
  * `Copy tin gửi khách` (5.1), `Tạo link xem phòng` (5.3).
  * `Mở Zalo khách` (`https://zalo.me/<SĐT khách>`) nếu khách có SĐT.
* Mở Modal sẽ tự ghi chú vào Lead: *"Đã xem căn gợi ý: <tiêu đề>"*, và đánh dấu thông báo đã đọc.
* Thông báo khách mới từ AI Chat (6.2) → bấm vào chuyển tới trang `/leads`.

---

## 4. Phạm vi Kỹ thuật (Technical Implementation Scope)

### A. Backend
```plaintext
modules/leads/lead-matching.service.ts   # matchNewApartment(apartment): tìm Lead khớp → notify
modules/apartments/apartment.service.ts  # gọi matching sau create (fire-and-forget)
modules/dedup/dedup.service.ts           # gọi matching sau khi tạo Master mới
modules/notifications/*                  # GET /api/v1/notifications, PATCH /:id/read, PATCH /read-all
```

### B. Frontend
```plaintext
api/notificationApi.ts
components/layout/NotificationBell.tsx     # chuông + danh sách, poll 30s
components/leads/MatchShareModal.tsx       # gửi căn khớp cho khách bằng 1 chạm
```

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
- [ ] Khách cần "Cầu Giấy, ≤ 7tr, nuôi pet" + căn mới Cầu Giấy 6.8tr cho nuôi pet → có thông báo.
- [ ] Căn 8tr hoặc không cho pet → không có thông báo.
- [ ] Khách `LOST`/`DEPOSITED` → không nhận ghép căn.
- [ ] Tạo căn vẫn thành công khi so khớp bị lỗi.
- [ ] Chuông cập nhật số chưa đọc trong ≤ 30 giây; bấm → mở Modal gửi khách.
- [ ] Build thành công, file ≤ 250 dòng, không commit khi chưa được phép.
