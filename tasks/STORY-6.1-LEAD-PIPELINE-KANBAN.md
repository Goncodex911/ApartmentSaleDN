# STORY-6.1: Quản lý Phễu Khách hàng (Lead Pipeline Kanban)

## 1. Mô tả Story (User Story)
* **Là một:** CTV (hoặc Quản lý) đang chăm sóc nhiều khách thuê cùng lúc, chủ yếu trên điện thoại.
* **Tôi muốn:** Một bảng Kanban chia khách theo giai đoạn, chuyển giai đoạn bằng 1 chạm và ghi chú nhanh tiến trình.
* **Để:** Biết hôm nay cần gọi ai, ai sắp đi xem phòng, ai đang phân vân, và không bỏ quên khách.

---

## 2. Tiền điều kiện (Pre-conditions)
1. Đăng nhập JWT + refresh token (Story 1.1) hoạt động.
2. Khách tạo tự động từ AI Chat (Story 6.2) dùng chung model `Lead` của story này.

---

## 3. Tiêu chí Chấp nhận (Acceptance Criteria - Gherkin)

### AC1: 5 giai đoạn khách hàng
| Mã | Hiển thị | Ràng buộc khi chuyển vào |
|---|---|---|
| `NEW` | MỚI LIÊN HỆ | — |
| `CONSULTING` | ĐANG TƯ VẤN | — |
| `VIEWING` | HẸN XEM PHÒNG | **Bắt buộc** `viewingAt` (ngày giờ hẹn) |
| `DEPOSITED` | ĐÃ ĐẶT CỌC | Tùy chọn: căn đã chốt (`depositedApartmentId`) |
| `LOST` | HỦY / KHÔNG HỢP | **Bắt buộc** `lostReason` |

### AC2: Chuyển giai đoạn dễ dàng trên mọi thiết bị
* **Điện thoại:** chạm vào thẻ khách → Modal chi tiết có các nút giai đoạn → chạm để chuyển. Chuyển sang `VIEWING` hoặc `LOST` thì hiện ô nhập ngày giờ / lý do trước khi lưu.
* **Máy tính:** kéo-thả thẻ giữa các cột bằng HTML5 Drag & Drop. Thả vào `VIEWING`/`LOST` thì mở Modal để nhập thông tin bắt buộc.
* Không cài thêm thư viện. Các cột cuộn ngang theo kiểu snap trên điện thoại.
* Mỗi lần chuyển giai đoạn tự ghi 1 ghi chú hệ thống (VD: `→ HẸN XEM PHÒNG 18:00 20/11`).

### AC3: Ghi chú nhanh (Quick note)
* Trong Modal chi tiết: ô nhập + nút Lưu; danh sách ghi chú mới nhất ở trên, kèm thời gian.
* Tối đa 1000 ký tự/ghi chú, giữ 200 ghi chú gần nhất mỗi khách.

### AC4: Thêm khách thủ công & phân quyền
* Nút `+ Thêm khách`: tên (bắt buộc), SĐT, khu vực mong muốn, ngân sách tối đa, ghi chú đầu tiên.
* Mỗi người **chỉ thấy và sửa khách của mình** (`ctvId = user.id`). Thao tác trên khách người khác → `404`.
* Thẻ khách hiển thị: tên, SĐT (nút gọi `tel:` / Zalo), khu vực, ngân sách, lịch hẹn, nguồn (`Thủ công` / `AI Chat`), thời gian hoạt động gần nhất.

---

## 4. Phạm vi Kỹ thuật (Technical Implementation Scope)

### A. Backend — `backend/src/modules/leads/`
```plaintext
lead.model.ts        # Lead { ctvId, name, phone, source, stage, viewingAt, lostReason, depositedApartmentId,
                     #        requirements { districts[], maxBudget, moveInDate, bedrooms, allowPets, carParking },
                     #        notes [{ content, isSystem, createdAt }], lastActivityAt }  index (ctvId, stage)
lead.validation.ts   # create / update / changeStage (refine VIEWING→viewingAt, LOST→lostReason) / addNote
lead.service.ts      # list, create, update, changeStage, addNote, delete — luôn lọc theo ctvId
lead.controller.ts
lead.routes.ts       # mount /api/v1/leads (authMiddleware)
```
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/leads` | Danh sách khách của tôi (sắp theo `lastActivityAt`) |
| POST | `/api/v1/leads` | Thêm khách thủ công |
| PATCH | `/api/v1/leads/:id` | Sửa tên/SĐT/nhu cầu |
| PATCH | `/api/v1/leads/:id/stage` | Chuyển giai đoạn |
| POST | `/api/v1/leads/:id/notes` | Thêm ghi chú |
| DELETE | `/api/v1/leads/:id` | Xóa khách |

### B. Frontend
```plaintext
api/leadApi.ts
pages/LeadsPage.tsx                    # Kanban 5 cột, cuộn ngang snap (mobile), drag-drop (desktop)
components/leads/LeadCard.tsx
components/leads/LeadDetailModal.tsx   # chuyển giai đoạn, ghi chú, gọi/Zalo
components/leads/LeadFormModal.tsx     # thêm khách
App.tsx + Navbar.tsx                   # route /leads (ProtectedRoute) + link "Khách hàng"
```

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
- [ ] Chuyển `NEW → VIEWING` không có `viewingAt` → `400`; có → thành công, tự sinh ghi chú hệ thống.
- [ ] Chuyển sang `LOST` không có lý do → `400`.
- [ ] CTV A không xem/sửa được khách của CTV B (`404`).
- [ ] Điện thoại: chạm thẻ → đổi giai đoạn. Máy tính: kéo-thả giữa cột.
- [ ] Đủ 3 trạng thái giao diện: Loading (skeleton), Lỗi, Rỗng.
- [ ] Build backend/frontend thành công, mọi file ≤ 250 dòng, không commit khi chưa được phép.
