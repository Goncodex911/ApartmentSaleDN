# STORY 11.1: Ghép khách tự động theo điểm phù hợp (Epic 11)

**Bối cảnh:** `docs/stories/EPIC_11_SMART_BROKER_TOOLS_AND_REALTIME.md` Story 11.1.
Phần lớn tính năng **đã có từ Story 6.1 / 6.3**:
- Form tạo khách: `LeadFormModal`, đang hỏi tên, SĐT, khu vực gõ tay, ngân sách...
- CTV chỉ thấy khách của mình.
- `LeadMatchingService` ghép căn mới với khách.
- Thông báo `APARTMENT_MATCH`; bấm vào mở `MatchShareModal` để gửi khách 1 chạm.

Story này **nâng cấp** chứ không làm lại. Hiện tại còn thiếu:
1. Ghép kiểu "đạt hết / trượt hết" (`isLeadMatch`), chưa có điểm %.
2. Khu vực so theo **quận** (`districts` gõ tay), chưa dùng **khu vực** (`zone`, Story 8.4).
3. Chưa có loại căn, chưa có tiện ích bắt buộc (hồ bơi, máy giặt riêng, thang máy), chưa có ngân sách USD.
4. Chỉ ghép khi **tạo căn mới**. Căn `UPCOMING` chuyển sang `AVAILABLE` thì không ghép.

## User Story
Là **CTV** có khách đang tìm phòng mà kho chưa có căn hợp, tôi muốn lưu nhu cầu khách,
để khi có căn mới phù hợp ≥ 80% thì hệ thống báo ngay cho tôi chào khách trước người khác.

## Tiền điều kiện
- Không cần cấu hình, không thư viện mới. Tỷ giá USD dùng `USD_VND_RATE` có sẵn (mặc định 25.000).

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Form nhu cầu gọn trên điện thoại**
- Given CTV mở **Thêm khách**
- Then form có:
  - Tên khách (bắt buộc), SĐT (tùy chọn).
  - **Khu vực**: chọn nhiều chip theo danh sách `ZONES` có sẵn (Mỹ An, Sơn Trà, Hải Châu, An Hải, Khuê Mỹ, Ngũ Hành Sơn, Hòa Xuân, Khác).
  - **Loại căn**: chọn nhiều chip theo `PROPERTY_TYPES`, và số phòng ngủ.
  - **Ngân sách tối đa**: ô số kèm nút gạt `VNĐ | USD`.
  - **Tiện ích bắt buộc**: Hồ bơi, Nuôi thú cưng, Máy giặt riêng, Thang máy.
  - **Ngày dọn vào**.
- Mặc định chỉ hiện 4 nhóm đầu. "Thêm tiêu chí" mở phần còn lại, để form ban đầu dưới 5 ô.
- Ô chữ ≥ 16px, vùng bấm ≥ 44px.
- Khách cũ còn `districts` gõ tay vẫn sửa được: phần đó hiện ở mục "Khu vực cũ" và vẫn được dùng khi ghép.

**AC2 — Chấm điểm phù hợp**
- Điểm = tổng trọng số của các tiêu chí **khách có khai**, chia cho tổng trọng số của các tiêu chí đó (tiêu chí không khai thì không tính):

  | Tiêu chí | Trọng số | Cách tính |
  |---|---|---|
  | Khu vực | 35% | Căn thuộc 1 trong các khu vực khách chọn. Khách cũ: so theo quận như hiện tại |
  | Giá | 35% | ≤ ngân sách → đủ điểm; vượt ≤ 5% → nửa điểm; vượt hơn → 0. Ngân sách USD quy ra VNĐ; căn có `priceUsd` thì so trực tiếp bằng USD |
  | Loại căn | 20% | Đúng loại căn **hoặc** đúng số phòng ngủ |
  | Tiện ích | 10% | Tỷ lệ tiện ích bắt buộc mà căn có |

- **Ghép khi điểm ≥ 80%.** Khách phải khai ít nhất khu vực hoặc ngân sách (giữ quy tắc cũ).
- Nuôi thú cưng là điều kiện **bắt buộc thật**: căn không cho nuôi thì không ghép, dù đủ điểm.
- Hàm chấm điểm `scoreLeadMatch(requirements, apartment)` trả `{ score, reasons }` để hiển thị lý do khớp.

**AC3 — Thời điểm ghép**
- Khi tạo căn mới (Quản lý nhập tay, duyệt tin CTV, bot nhập tin): như hiện tại.
- **Mới:** khi căn chuyển sang `AVAILABLE` qua `updateStatus` (VD Sắp trống → Trống, Story 11.5 mở bán lại).
- Mỗi cặp (khách, căn) chỉ báo 1 lần. Index duy nhất đã có trong `notification.model.ts`.

**AC4 — Thông báo có điểm %**
- Nội dung thông báo dạng: "Có căn mới phù hợp 90% với khách [Chị Lan – 2PN An Thượng] của bạn". Không dùng emoji làm icon.
  Icon `Target` của `lucide-react` hiện trong danh sách thông báo.
- Bấm vào thông báo → `MatchShareModal` (có sẵn) hiện thêm:
  - Điểm %.
  - Dòng lý do: "Đúng khu vực · Trong ngân sách · Có hồ bơi".
  - Nút **Copy bài gửi khách** (đã có).
- Trang chi tiết khách có mục **Căn phù hợp** (`GET /leads/:id/matches`): liệt kê các căn đang trống có điểm ≥ 80%, sắp theo điểm, tối đa 10 căn.

## Phạm vi kỹ thuật
| File | Thay đổi |
|---|---|
| `leads/lead.model.ts` | `requirements` thêm `zones[]`, `propertyTypes[]`, `budgetCurrency: 'VND' \| 'USD'`, `amenities[]` (`pool`, `allowPets`, `privateWasher`, `elevator`). Giữ `districts` cho khách cũ |
| `leads/lead.validation.ts` | Kiểm tra các trường mới theo `ZONES` / `PROPERTY_TYPES` có sẵn |
| `leads/lead-matching.service.ts` | Thay `isLeadMatch` bằng `scoreLeadMatch` (trọng số khai báo trong 1 hằng số, chú thích tiếng Việt). Lọc thô ở DB như hiện tại. Thêm `matchesForLead(leadId)` |
| `apartments/apartment.service.ts` | `updateStatus`: khi chuyển sang `AVAILABLE` thì gọi `LeadMatchingService.runInBackground` |
| `leads/lead.controller.ts`, `lead.routes.ts` | `GET /leads/:id/matches` (chỉ CTV chủ khách / ADMIN) |
| `chat/chat-lead.ts` | Khách tạo từ chat AI vẫn chạy được (chỉ có `districts`), không phải đổi logic |
| `frontend/src/components/leads/LeadFormModal.tsx` | Chip khu vực / loại căn / tiện ích, nút gạt VNĐ/USD, "Thêm tiêu chí". Giữ dưới 250 dòng, tách `LeadRequirementFields.tsx` nếu cần |
| `components/leads/MatchShareModal.tsx`, `LeadDetailModal.tsx`, `leadStages.ts` | Điểm %, lý do khớp, mục Căn phù hợp; `summarizeRequirements` hiện khu vực / loại căn mới |
| `api/leadApi.ts`, `components/layout/NotificationBell.tsx` | Gọi `getMatches`; icon `Target` |

## Rủi ro
- **Thay đổi cách ghép** làm số thông báo khác trước. Ví dụ khách cũ khai số phòng ngủ mà căn lệch 1 phòng: trước đây trượt hẳn, nay có thể đạt 80%.
  Unit test sẽ so kết quả cũ và mới trên dữ liệu mẫu để bạn thấy khác biệt.

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] Unit `scoreLeadMatch`:
  - Đủ 4 tiêu chí → 100%; sai loại căn → 80% (vẫn ghép).
  - Sai khu vực → 65% (không ghép); vượt ngân sách 3% → 82,5%.
  - Khách cần nuôi thú cưng mà căn không cho → không ghép.
  - Ngân sách USD so đúng; khách cũ chỉ có `districts` vẫn ghép đúng.
- [ ] API:
  - Tạo căn hoặc chuyển căn sang `AVAILABLE` → CTV có khách hợp nhận thông báo có %; chuyển lại lần 2 → không báo trùng.
  - CTV khác gọi `/leads/:id/matches` → 403.
- [ ] Puppeteer 390px trên bản local: form mới tạo khách được; bấm thông báo thấy % và lý do; trang không tràn; ô nhập ≥ 16px.
- [ ] Build và lint không lỗi. Báo cáo, đề xuất commit `feat(leads): weighted reverse lead matching with zones and USD budget (Story 11.1)` chờ duyệt.
