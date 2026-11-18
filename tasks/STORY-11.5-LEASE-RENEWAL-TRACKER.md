# STORY 11.5: Ghi nhận hợp đồng thuê & nhắc tái ký (Epic 11)

**Bối cảnh:** `docs/stories/EPIC_11_SMART_BROKER_TOOLS_AND_REALTIME.md` Story 11.5, `EXTERNAL_CONFIG.md` mục 7.4.
Bạn chọn **Cách A**: không dùng `node-cron`, vì Render gói free ngủ sau 15 phút không có truy cập nên lịch 08:00 sẽ không chạy.
Thay vào đó, máy chủ **quét khi có người dùng app lần đầu trong ngày** (theo giờ Việt Nam). Nhắc nhở là thông báo trong app,
vốn chỉ thấy khi mở app, nên cách này đủ dùng.

Hiện tại:
- Đổi trạng thái qua `StatusBadge` → `PATCH /apartments/:id/status`. Chỉ Quản lý / ADMIN được đổi.
- CTV không bao giờ thấy căn `RENTED`.
- Thông báo trong app: `NotificationService.notify` / `notifyManagers`, tự xoá sau 30 ngày.
- Việc dọn ảnh tin CTV (`submission-cleanup.ts`) chạy bằng `setInterval` mỗi 24 giờ, cũng không chạy khi Render ngủ.

## User Story
Là **Quản lý**, khi chốt cho thuê một căn tôi muốn ghi lại ngày bắt đầu và thời hạn hợp đồng, để hệ thống nhắc tôi và CTV chốt căn trước khi hết hạn 30 ngày và 15 ngày.
Nhờ đó tôi chủ động hỏi khách có gia hạn không, hoặc mở bán lại căn đúng lúc.

## Tiền điều kiện
- Không cần cấu hình, không thư viện mới.
- Nhắc qua Telegram **ngoài phạm vi**: muốn nhắc đúng giờ thì cần dịch vụ hẹn giờ ngoài và `CRON_SECRET` (Cách B), làm sau nếu bạn muốn.

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Ghi hợp đồng khi chuyển sang Đã cho thuê**
- Given Quản lý chọn trạng thái `Đã cho thuê` trong `StatusBadge`
- When bảng nhập hiện ra, gồm:
  - **Ngày bắt đầu** (mặc định hôm nay)
  - **Thời hạn**: 1 / 3 / 6 / 12 tháng
  - **CTV chốt căn**: tùy chọn, chọn từ danh sách CTV
  - **Tên khách**, **SĐT khách**: tùy chọn
- Then lưu vào `lease` và tự tính `endDate` = ngày bắt đầu + số tháng.
- Bấm "Bỏ qua" vẫn đổi được trạng thái mà không lưu hợp đồng, để không làm chậm Quản lý.
- **Bảo mật:** tên / SĐT khách chỉ ADMIN, Quản lý của căn và CTV chốt căn xem được. `maskApartment` xoá `lease` với các vai trò khác.
  API trả cho CTV chốt căn chỉ gồm ngày hết hạn và tên khách, qua thông báo.

**AC2 — Quét nhắc hạn mỗi ngày một lần**
- Given là ngày mới theo giờ `Asia/Ho_Chi_Minh` và chưa quét lần nào
- When có request đã đăng nhập đầu tiên trong ngày (gắn vào `GET /auth/me`, app gọi khi mở)
- Then máy chủ chạy quét **ở chế độ nền** (không làm chậm request).
  - Một bản ghi khoá trong Mongo (`job_runs`, `findOneAndUpdate` theo ngày) bảo đảm chỉ quét 1 lần / ngày, kể cả khi nhiều người mở app cùng lúc.
- Các căn `RENTED` có `lease.endDate` còn ≤ 30 ngày (chưa nhắc mốc 30), hoặc còn ≤ 15 ngày (chưa nhắc mốc 15):
  - Gửi thông báo `LEASE_EXPIRING` cho Quản lý của căn và CTV chốt căn, VD: "Căn 2PN đường Hà Bổng hết hạn thuê ngày 20/12 (còn 30 ngày). Hãy hỏi khách có gia hạn không."
  - Đánh dấu `lease.reminded30At` / `lease.reminded15At` để không nhắc lặp.
  - Căn quá hạn mà vẫn `RENTED`: gửi 1 lần "đã hết hạn", để Quản lý cập nhật.
- Cùng cơ chế này chạy luôn **việc dọn ảnh tin CTV** (thay `setInterval` hiện tại), để việc dọn không phụ thuộc vào việc máy chủ thức.

**AC3 — Gia hạn hoặc mở bán lại**
- Trong chi tiết căn `RENTED` (Quản lý), mục **Hợp đồng** hiện:
  - Ngày bắt đầu, ngày hết hạn, số ngày còn lại.
  - CTV chốt; tên / SĐT khách (nếu có).
- Có 2 nút:
  - **Gia hạn**: chọn thêm 1 / 3 / 6 / 12 tháng → `endDate` cộng thêm, xoá dấu đã nhắc.
  - **Khách không gia hạn → Sắp trống**: chuyển sang `UPCOMING`, `availableDate` mặc định = `lease.endDate` (sửa được).
    Căn hiện lại trên bảng hàng cho CTV (và phát sự kiện realtime nếu Story 11.4 đã xong).
- Thẻ căn `RENTED` trong danh sách của Quản lý hiện nhãn nhỏ "Còn 12 ngày" khi còn ≤ 30 ngày.

## Phạm vi kỹ thuật
| File | Thay đổi |
|---|---|
| `apartments/apartment.model.ts` | `lease?: { startDate, durationMonths, endDate, closedBy (User), tenantName, tenantPhone, reminded30At, reminded15At, expiredNotifiedAt }`; index `{ status: 1, 'lease.endDate': 1 }` |
| `apartments/apartment.validation.ts` | `updateStatusSchema` nhận thêm `lease` (chỉ khi `RENTED`); thêm `renewLeaseSchema` |
| `apartments/apartment.service.ts` | `updateStatus` lưu `lease` khi `RENTED` (tính `endDate`); `renewLease(id, months)`; `maskApartment` xoá `lease` với vai trò không có quyền |
| `apartment.routes.ts`, `apartment.controller.ts` | `PATCH /apartments/:id/lease/renew` (Quản lý / ADMIN của căn) |
| `backend/src/modules/jobs/daily-jobs.ts` (mới) | `runDailyJobsIfDue()`: khoá theo ngày Việt Nam qua collection `job_runs`, chạy `scanLeaseReminders()` + `cleanupSubmissionMedia()`. Lỗi chỉ ghi log, không làm sập request |
| `backend/src/modules/jobs/lease-reminder.service.ts` (mới) | Truy vấn căn sắp hết hạn, gửi thông báo, đánh dấu đã nhắc |
| `notifications/notification.model.ts` | Thêm loại `LEASE_EXPIRING` |
| `auth/auth.controller.ts` (`me`) | Gọi `runDailyJobsIfDue()` không chờ (`void`) |
| `submissions/submission-cleanup.ts`, `server.ts` | Bỏ `setInterval`, chuyển sang daily-jobs |
| `frontend/src/components/apartment/LeaseFormSheet.tsx` (mới) | Bảng nhập hợp đồng (ô chữ ≥ 16px, nút 44px) |
| `components/apartment/StatusBadge.tsx` (205 dòng) | Mở `LeaseFormSheet` khi chọn `RENTED`; giữ file dưới 250 dòng |
| `frontend/src/components/apartment/LeaseSection.tsx` (mới) | Mục Hợp đồng trong `ApartmentDetailModal` + nút Gia hạn / Sắp trống |
| `api/apartmentApi.ts`, `ApartmentCard.tsx`, `NotificationBell.tsx` | Gửi `lease`, gọi API gia hạn; nhãn "Còn N ngày"; bấm thông báo `LEASE_EXPIRING` mở chi tiết căn |
| `users/user.routes.ts`, `user.controller.ts`, `user.service.ts` | Thêm `GET /users/collaborators` (Quản lý / ADMIN), chỉ trả `_id`, tên, mã CTV của CTV đang hoạt động. Lý do: `GET /users` hiện chỉ cho ADMIN gọi |

## Rủi ro
- **Không ai mở app trong ngày thì hôm đó không quét.** Hôm sau quét bù, vì quét theo "còn ≤ N ngày" chứ không phải "đúng N ngày", nên không bỏ sót.
- Dữ liệu cũ: căn `RENTED` hiện có không có `lease`, nên không được nhắc. Quản lý có thể mở chi tiết và bấm **Nhập hợp đồng** để bổ sung. Không chạy script sửa dữ liệu.

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] API:
  - `RENTED` kèm `lease` thì lưu đúng `endDate` (VD 31/01 + 1 tháng → 28/02 hoặc 29/02).
  - CTV khác / khách không nhận `lease`.
  - Gia hạn thì cộng đúng và xoá dấu đã nhắc.
- [ ] Quét:
  - 2 request đồng thời chỉ chạy 1 lần.
  - Căn còn 29 ngày → nhắc mốc 30; chạy lại không nhắc lặp; còn 14 ngày → nhắc mốc 15.
  - Ngày được tính theo giờ Việt Nam (thử với mốc 23:30 UTC).
- [ ] Puppeteer 390px trên bản local:
  - Chọn Đã cho thuê → nhập hợp đồng → chi tiết hiện mục Hợp đồng.
  - Bấm Sắp trống → căn hiện lại cho CTV.
- [ ] Việc dọn ảnh tin CTV vẫn chạy (thử với tin bị từ chối quá 30 ngày trên DB local).
- [ ] Build và lint không lỗi. Báo cáo, đề xuất commit `feat(lease): lease tracking with daily renewal reminders (Story 11.5)` chờ duyệt.
