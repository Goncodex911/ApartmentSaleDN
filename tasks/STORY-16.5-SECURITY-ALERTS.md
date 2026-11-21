# STORY 16.5: Cảnh Báo Bảo Mật & Hành Vi Bất Thường (Security Alerts)

**Bối cảnh:** Epic 16. Có nhật ký đầy đủ (16.2) nhưng Admin phải tự soi mới phát hiện được:
* cào nguồn hàng (xem SĐT chủ hàng loạt);
* dò mật khẩu;
* phá dữ liệu.

**Đã chốt (Q4):** ngưỡng mặc định **≥ 30 lần xem SĐT chủ / 1 giờ / người**; Admin chỉnh được trong Cấu hình.

---

## 1. Mô tả Story (User Story)
* **Là một:** Admin.
* **Tôi muốn:** Được báo ngay khi có dấu hiệu bất thường.
* **Để:** Phát hiện sớm việc cào nguồn hàng, dò mật khẩu hoặc phá dữ liệu.

---

## 2. Tiền điều kiện (Pre-conditions)
* Story 16.2: mọi hành động đi qua `AuditService.log`.
* Story 16.4: phiên có `userAgent`, dùng cho quy tắc "thiết bị lạ".
* Story 16.3: trang Hồ sơ 360°.
* `createCounter` (Story 14.5), `NotificationService.notify`, gửi Telegram (Story 6.2).

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Quy tắc phát hiện (bản đầu)
| Mã | Điều kiện | Mức độ |
| :--- | :--- | :---: |
| `OWNER_CONTACT_SCRAPE` | 1 người có ≥ ngưỡng (mặc định 30) `UNMASK_OWNER_CONTACT` trong 1 giờ | Bảo mật |
| `LOGIN_BRUTE_FORCE` | 1 SĐT có ≥ 10 `LOGIN_FAILED` trong 15 phút, hoặc có `LOGIN_BLOCKED` | Bảo mật |
| `MASS_DELETE` | 1 người có ≥ 5 `DELETE_APARTMENT` trong 10 phút | Quan trọng |
| `NEW_DEVICE_PRIVILEGED` | Admin / Quản lý `LOGIN` từ cặp "hệ điều hành · trình duyệt" chưa có trong các phiên đang lưu | Quan trọng |

* Phát hiện **chạy ngay tại điểm ghi nhật ký** (hook trong `AuditService.log`), không quét định kỳ.
* Bộ đếm nằm trong bộ nhớ (`createCounter`). **Chấp nhận:** Render ngủ / khởi động lại thì bộ đếm về 0, vì hệ thống chỉ có 1 máy chủ.

### AC2 — Chống spam
* Cùng quy tắc + cùng người (hoặc cùng SĐT) chỉ tạo **1 cảnh báo / giờ**.
* Trong giờ đó nếu vẫn vi phạm thì tăng `count` của cảnh báo đang mở, không tạo cảnh báo mới.

### AC3 — Nội dung cảnh báo
* Mỗi cảnh báo gồm: mức độ, quy tắc, người liên quan (hoặc SĐT đã che), mô tả tiếng Việt ("Nguyễn A đã xem SĐT chủ 34 lần trong 1 giờ"), thời điểm, số lần, link tới Hồ sơ 360° và nhật ký đã lọc sẵn.

### AC4 — Trang Cảnh báo `/admin/alerts`
* Mục **Cảnh báo** được thêm vào `adminNav` (16.1), kèm **badge số chưa xử lý**. Trên điện thoại, mục này thay vị trí "Kiểm duyệt" trên menu đáy; Kiểm duyệt chuyển vào "Thêm".
* Có tab Chưa xử lý / Đã xử lý.
* Các nút trên mỗi cảnh báo:
  * `[Đánh dấu đã xử lý]`;
  * `[Khóa tài khoản]` (gọi API 13.2, có xác nhận);
  * `[Đăng xuất tất cả thiết bị]` (16.4, có xác nhận).
* Đủ trạng thái: skeleton, lỗi, trống ("Chưa có cảnh báo nào — hệ thống bình thường").

### AC5 — Thông báo
* Cảnh báo mức **Bảo mật** gửi ngay thông báo trong app cho mọi Admin, và gửi Telegram cho Admin đã liên kết.
* Trang Tổng quan (13.1) có ô "Cảnh báo chưa xử lý"; bấm vào thì mở trang Cảnh báo.

### AC6 — Cấu hình ngưỡng
* Trang Cấu hình có mục "Ngưỡng cảnh báo": số lần xem SĐT chủ / giờ (5–500), số căn xoá / 10 phút (2–50).
* Đổi ngưỡng thì ghi `UPDATE_SETTINGS` (16.2).
* Ngưỡng có hiệu lực ngay, không cần khởi động lại (đọc qua cache cấu hình sẵn có).

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend
* **`backend/src/modules/security/security-alert.model.ts` (mới):** `rule`, `severity`, `userId?`, `subject` (SĐT che / tên), `message`, `count`, `windowStart`, `resolvedAt?`, `resolvedBy?`. TTL 180 ngày trên `createdAt`; index `{ resolvedAt: 1, createdAt: -1 }`.
* **`backend/src/modules/security/alert-rules.ts` (mới):** bảng quy tắc + bộ đếm `createCounter` cho từng quy tắc; hàm `evaluate(entry)` được `AuditService.log` gọi sau khi ghi, chạy nền.
* **`backend/src/modules/security/security-alert.service.ts`:**
  * `raise()` dùng upsert theo `{ rule, key, windowStart: đầu giờ }` để chống trùng.
  * `list()`, `resolve()`, `countOpen()`.
* **`backend/src/modules/admin/admin.routes.ts`:** `GET /admin/alerts`, `PATCH /admin/alerts/:id/resolve`, `GET /admin/alerts/count`.
* **`system-config.model.ts` / `.service.ts`:** `alertThresholds: { ownerContactPerHour: 30, deletesPer10Min: 5 }`.
* **`notification.model.ts`:** loại `SECURITY_ALERT`.
* **`admin.service.ts` (dashboard-stats):** thêm `openAlerts`.

### Frontend
* **`frontend/src/pages/AdminAlertsPage.tsx`, `components/admin/AlertCard.tsx` (mới).**
* **`adminNav.ts`:** mục Cảnh báo + badge (gọi `GET /admin/alerts/count`, làm mới khi có thông báo `SECURITY_ALERT` qua realtime 11.4).
* **`AdminSettingsPage.tsx`:** mục ngưỡng cảnh báo.
* **`AdminDashboardPage.tsx`:** ô cảnh báo chưa xử lý.

---

## 5. Kiểm thử & Định nghĩa hoàn thành (DoD)
* [ ] Giả lập 31 lần xem SĐT chủ / giờ thì có đúng 1 cảnh báo với `count` tăng dần. Lần thứ 29 thì chưa có cảnh báo.
* [ ] 10 lần đăng nhập sai thì có cảnh báo `LOGIN_BRUTE_FORCE` với SĐT đã che.
* [ ] 5 lần xoá / 10 phút thì có cảnh báo. Admin đăng nhập bằng userAgent mới thì có cảnh báo; bằng userAgent cũ thì không.
* [ ] Đổi ngưỡng có hiệu lực ngay và được ghi nhật ký.
* [ ] Nút khóa / đăng xuất trên cảnh báo hoạt động và có xác nhận.
* [ ] Lỗi trong khâu phát hiện không làm hỏng thao tác chính.
* [ ] `tsc --noEmit` hai phía sạch, build frontend thành công. Giao diện đạt checklist ở 390px / 1280px.
