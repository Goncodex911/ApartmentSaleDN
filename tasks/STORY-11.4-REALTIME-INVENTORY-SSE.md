# STORY 11.4: Cập nhật kho phòng tức thì (SSE) (Epic 11)

**Bối cảnh:** `docs/stories/EPIC_11_SMART_BROKER_TOOLS_AND_REALTIME.md` Story 11.4 (phần 1–2), `EXTERNAL_CONFIG.md` mục 7.3.
Bạn chọn **Cách A**: kết nối đi qua proxy Netlify như các API khác, chấp nhận kết nối bị cắt khoảng 26–30 giây một lần rồi tự nối lại,
và gửi bù sự kiện bị lỡ qua `Last-Event-ID`.
**Phần 3 "Báo lỗi cộng đồng"** của Epic 11.4 tách thành story riêng (11.4b), sẽ làm khi bạn yêu cầu.

Hiện tại:
- Trạng thái căn đổi qua `PATCH /apartments/:id/status` (`ApartmentService.updateStatus`).
- Căn mới vào kho qua `ApartmentService.create` (Quản lý nhập tay, duyệt tin CTV) và `dedup.service.ts` (bot nhập tin).
- Danh sách căn tải bằng hook `useApartmentSearch`; khi kho đổi thì phát sự kiện trình duyệt `APARTMENTS_CHANGED`. Không dùng TanStack Query.
- Cookie đăng nhập đặt `sameSite: 'lax'`, nên luồng sự kiện dùng header `Authorization` như mọi API khác.

## User Story
Là **CTV**, tôi muốn thẻ căn trên điện thoại tự đổi sang "Vừa cọc" ngay khi căn được đặt cọc, không cần tải lại trang,
để không dắt khách tới một căn đã hết.

## Tiền điều kiện
- Không cần cấu hình, không thư viện mới (dùng `fetch` có sẵn của trình duyệt và `res.write` của Express).
- Render gói free chạy **1 máy chủ** nên lưu sự kiện trong bộ nhớ là đủ. Khi máy chủ ngủ / khởi động lại, app tự tải lại danh sách.

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Luồng sự kiện `GET /api/v1/realtime/stream`**
- Chỉ người đã đăng nhập (CTV, Quản lý, ADMIN) mới kết nối được; xác thực bằng header `Authorization: Bearer`. Chưa đăng nhập → 401.
- Header phản hồi: `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`.
  Gửi `retry: 2000` và dòng giữ kết nối `: ping` mỗi 15 giây.
- **Máy chủ tự đóng kết nối sau 25 giây** (trước mốc Netlify cắt), để phía app nối lại gọn gàng, không báo lỗi.
- Phát sự kiện khi:
  - Căn chuyển sang `DEPOSITED` hoặc `RENTED` → `apartment.status`.
  - Căn mới vào kho / chuyển về `AVAILABLE` hoặc `UPCOMING` → `apartment.available`.
  - Giá căn **giảm** khi Quản lý sửa → `apartment.price`.
- Nội dung sự kiện tối thiểu: `{ id, status, price, priceUsd, label }`.
  `label` là tên ngắn như "Căn 2PN đường Hà Bổng", **không chứa SĐT** (lấy qua `maskApartment`).
  CTV không nhận chi tiết căn `RENTED`, chỉ nhận `{ id, status: 'RENTED' }` để gỡ thẻ khỏi danh sách.

**AC2 — Gửi bù khi nối lại**
- Mỗi sự kiện có `id` dạng `<mã lần khởi động>-<số thứ tự>`. Máy chủ giữ 200 sự kiện gần nhất.
- When app nối lại kèm header `Last-Event-ID`
- Then máy chủ gửi bù các sự kiện sau mốc đó.
- Nếu mã lần khởi động khác (máy chủ vừa khởi động lại) hoặc mốc quá cũ: gửi sự kiện `reset`, app tải lại danh sách một lần.

**AC3 — Giao diện đổi ngay**
- Given CTV đang mở Bảng hàng
- When Quản lý đổi một căn sang Đã cọc
- Then trong khoảng 1 giây (trừ lúc đang nối lại), thẻ căn đó chuyển **xám mờ** và có nhãn `VỪA CỌC`.
- And hiện thông báo nhỏ ở trên đầu màn hình "Căn 2PN đường Hà Bổng vừa được đặt cọc", tự ẩn sau 4 giây, có nút đóng.
  Dùng icon `lucide-react`, không dùng emoji làm icon.
- Căn mới vào kho: thông báo "Có căn mới: …" kèm nút **Xem**. Danh sách **không tự nhảy** (không đẩy nội dung xuống); bấm Xem mới tải lại.
- Giảm giá: cập nhật giá trên thẻ, kèm chữ "Giảm giá" nhỏ.
- Bản đồ (Story 11.2) và chi tiết căn đang mở cũng nhận cập nhật trạng thái.

**AC4 — Tiết kiệm pin và 4G**
- App chuyển sang nền / tab ẩn (`visibilitychange`) thì ngắt kết nối. Mở lại thì nối lại kèm `Last-Event-ID`.
- Mất mạng thì ngừng thử. Có mạng lại (`online`) thì nối lại. Lỗi liên tiếp thì chờ lâu dần (2 → 4 → 8 … tối đa 30 giây).
- Đăng xuất / gặp 401 thì đóng kết nối hẳn.

## Phạm vi kỹ thuật
| File | Thay đổi |
|---|---|
| `backend/src/modules/realtime/realtime.bus.ts` (mới) | `EventEmitter` + vòng đệm 200 sự kiện + mã lần khởi động; `publishApartmentEvent(type, apartment)`; `eventsAfter(lastId)` |
| `backend/src/modules/realtime/realtime.controller.ts`, `realtime.routes.ts` (mới) | Mở luồng SSE: ping 15 giây, tự đóng sau 25 giây, gửi bù theo `Last-Event-ID`, dọn listener khi `req.on('close')` |
| `backend/src/app.ts` | Gắn `/api/v1/realtime` (backend không dùng compression nên không bị gom luồng ở phía Express) |
| `apartments/apartment.service.ts` | Phát sự kiện trong `updateStatus`, `create` và `update` (khi giá giảm). Chỉ thêm 1 dòng gọi ở mỗi chỗ |
| `dedup/dedup.service.ts` | Phát `apartment.available` khi bot tạo căn mới (cạnh `LeadMatchingService.runInBackground`) |
| `frontend/src/api/realtimeStream.ts` (mới) | Đọc luồng bằng `fetch` + `ReadableStream` (gửi được `Authorization` và `Last-Event-ID`), tách sự kiện SSE, nối lại có chờ lâu dần |
| `frontend/src/hooks/useRealtimeInventory.ts` (mới) | Chạy trong `AppShell`, phát sự kiện trình duyệt `apartment:realtime` / `APARTMENTS_CHANGED` cho các trang |
| `hooks/useApartmentSearch.ts`, `components/apartment/ApartmentCard.tsx` | Cập nhật một căn trong danh sách đang hiện; nhãn `VỪA CỌC`, hiệu ứng xám mờ (tắt khi bật "giảm chuyển động") |
| `frontend/src/components/layout/LiveToast.tsx` (mới) | Thông báo nhỏ có nút đóng; vùng bấm ≥ 44px; nằm dưới vùng tai thỏ (`safe-area`) |

Service worker: đường dẫn `/api/v1/realtime/stream` không khớp quy tắc cache nào nên đi thẳng ra mạng (giữ nguyên `vite.config.ts`).

## Rủi ro
- **Netlify có thể gom (buffer) luồng dữ liệu** thay vì chuyển tiếp ngay. Bước đầu tiên khi code là thử nhanh trên Netlify thật (bản Deploy Preview của PR).
  Nếu bị gom: chuyển sang Cách C (app hỏi server mỗi 30 giây khi đang mở) và báo bạn trước.
- Mỗi CTV đang mở app giữ 1 kết nối; khi kết nối bị cắt mỗi ~25 giây, mỗi người tạo thêm khoảng 2 request / phút. Vẫn nằm trong gói free, và còn giúp Render không ngủ khi đang có người dùng.

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] API:
  - Chưa đăng nhập → 401.
  - Nhận `: ping`; máy chủ tự đóng sau khoảng 25 giây.
  - Đổi trạng thái → client thử nhận sự kiện đúng; `Last-Event-ID` cũ → nhận bù; mã khởi động khác → nhận `reset`.
  - CTV nhận sự kiện `RENTED` không có chi tiết căn. Nội dung sự kiện không chứa SĐT.
- [ ] Puppeteer 2 trình duyệt trên bản local (Quản lý + CTV, khung 390px):
  - Quản lý đổi sang Đã cọc → thẻ bên CTV chuyển xám, có nhãn và thông báo trong khoảng 2 giây.
  - Ẩn tab thì kết nối đóng; mở lại thì nhận bù.
- [ ] Thử trên Netlify Deploy Preview: thẻ đổi trạng thái qua proxy; ghi lại thời gian kết nối bị cắt thực tế.
- [ ] Build và lint không lỗi; không còn `console.log`. Báo cáo, đề xuất commit `feat(realtime): live inventory updates over SSE with resume (Story 11.4)` chờ duyệt.
