# STORY 13.5: Cấu Hình Nguồn Thu Thập Tin & Tham Số Hệ Thống (Ingestion & System Config)

**Bối cảnh:** `docs/stories/EPIC_13_ADMIN_CONTROL_CENTER_AND_GOVERNANCE.md` Story 13.5.  
Hiện tại danh sách các nhóm Telegram cào tin nguồn (`TELEGRAM_SOURCE_CHAT_IDS`) đang lưu trong biến môi trường `.env`. Mỗi khi có nhóm chat Telegram mới hoặc muốn dừng cào tin một nhóm, quản trị viên phải chỉnh sửa `.env` và restart server. Story này chuyển cấu hình nguồn tin và chính sách duyệt tin lên giao diện web Admin.

---

## 1. Mô tả Story (User Story)
* **Là một:** Admin hệ thống.
* **Tôi muốn:** Quản lý danh sách các nhóm Telegram cào tin, bật/tắt chế độ duyệt tin tự động và tùy chỉnh thông điệp của công ty trực tiếp trên web mà không cần sửa code hay khởi động lại server.
* **Để:** Linh hoạt mở rộng hoặc thu hẹp nguồn thu thập dữ liệu bất cứ lúc nào.

---

## 2. Tiền điều kiện (Pre-conditions)
* Bot Telegram đã được cấu hình token (`TELEGRAM_BOT_TOKEN`).
* Dữ liệu cấu hình được lưu trữ trong MongoDB collection `SystemConfig`.

---

## 3. Tiêu chí Chấp nhận (Gherkin AC)

### AC1 — Quản Lý Danh Sách Nhóm Telegram Nguồn
* **Given** Admin truy cập trang Cấu hình hệ thống `/admin/settings`
* **When** mở mục "Nguồn cào tin Telegram"
* **Then** hiển thị danh sách các nhóm chat hiện đang được liên kết: Tên gợi nhớ nhóm, Chat ID, Trạng thái (`Đang bật` / `Tạm dừng`), Số tin đã cào trong tuần.
* **When** Admin bấm `[+ Thêm nhóm nguồn]` và nhập:
  - Tên nhóm: *"Hội Cho Thuê Căn Hộ Sơn Trà"*
  - Chat ID: `"-1001234567890"`
* **Then** hệ thống lưu vào cơ sở dữ liệu và Bot Telegram lập tức bắt đầu lắng nghe tin nhắn từ nhóm này mà không cần khởi động lại backend.
* **When** Admin bấm công tắc gạt để tạm dừng một nhóm
* **Then** Bot sẽ bỏ qua tin nhắn từ nhóm đó mà không nạp vào hệ thống.

### AC2 — Chính Sách Duyệt Tin Tự Động (Automation Policy)
* **Given** Admin điều chỉnh chính sách kiểm duyệt tin cào từ AI
* **When** chọn `Chế độ An toàn (Khuyên dùng)`
* **Then** mọi tin AI parse được đều được gán `needsReview: true` (đưa vào hàng đợi duyệt tin của Manager).
* **When** chọn `Chế độ Bán tự động (Fast Lane)`
* **Then** các tin AI parse có độ tin cậy $\ge 90\%$ và thuật toán dHash không phát hiện trùng lặp ảnh sẽ được tự động đưa thẳng lên bảng hàng `AVAILABLE`.

### AC3 — Cấu Hình Thông Tin Thương Hiệu Tổng Đài
* **Given** Admin muốn cập nhật thông tin hiển thị cho khách thuê
* **When** Admin sửa SĐT Hotline hoặc link Zalo OA chính thức
* **Then** thông tin chân trang trên trang xem phòng công khai (`/p/:slug`) tự động cập nhật ngay.

---

## 4. Phạm vi Kỹ thuật (Technical Scope)

### Backend:
* **Mongoose Model mới:** `backend/src/modules/admin/system-config.model.ts`
  - Trường: `telegramSources: [{ chatId: string, name: string, active: boolean, addedAt: Date }]`, `autoApproveHighConfidence: boolean`, `hotline: string`, `zaloOaUrl: string`.
* **API Endpoints:**
  - `GET /api/v1/admin/settings`: Lấy cấu hình hệ thống.
  - `PUT /api/v1/admin/settings`: Cập nhật cấu hình.
  - `POST /api/v1/admin/settings/telegram-sources`: Thêm nhóm chat mới.
  - `DELETE /api/v1/admin/settings/telegram-sources/:chatId`: Xóa nhóm chat.
* **Tích hợp Ingestion Service:** Cập nhật `telegram.service.ts` để đọc danh sách Chat ID từ MongoDB (kèm in-memory cache) thay vì chỉ đọc từ `.env`.

### Frontend:
* **Tạo trang mới:** `frontend/src/pages/AdminSettingsPage.tsx`.
* **Component con:** Quản lý nhóm Telegram, Công tắc chính sách AI, Form thông tin thương hiệu.
* **API Client:** Bổ sung phương thức `getSystemSettings`, `updateSystemSettings` trong `adminApi.ts`.

---

## 5. Kiểm thử & Định nghĩa Hoàn thành (DoD)
* [ ] Kiểm tra: Thêm nhóm Telegram mới trên web, Bot nhận diện được tin nhắn từ nhóm đó ngay.
* [ ] Gạt tắt một nhóm, bot bỏ qua tin nhắn từ nhóm đó.
* [ ] Không cần restart server khi thay đổi cấu hình.

---

## 6. Đối chiếu với code hiện tại (bổ sung khi tạo story, 19/11/2026)
* **Nguồn Telegram hiện đọc từ biến môi trường** `TELEGRAM_SOURCE_CHAT_IDS` (`telegram.service.ts`). Chuyển sang DB và **giữ biến môi trường làm giá trị dự phòng** khi DB chưa có cấu hình.
* **Ràng buộc của Telegram:** bot chỉ nhận được tin trong nhóm khi đã được thêm vào nhóm, và phải tắt Privacy Mode (qua BotFather) hoặc là admin nhóm.
  Thêm Chat ID trên web **không tự đưa bot vào nhóm**. Màn hình cần ghi rõ hướng dẫn này.
* **⚠️ AI chưa có "độ tin cậy %":** Gemini chỉ trả cờ `needsReview` + lý do. Chế độ "Bán tự động ≥ 90%" cần chọn:
  - **Cách A (đề xuất):** "tin đủ thông tin" = có giá, có SĐT, có địa chỉ / khu vực, `needsReview = false`, không trùng ảnh (dHash) → lên bảng hàng.
  - **Cách B:** sửa prompt cho Gemini tự chấm điểm 0–100. Điểm AI tự chấm không ổn định, khó kiểm chứng.
* **Hành vi hiện tại:** tin cào đang lên bảng hàng `AVAILABLE` ngay, chỉ gắn cờ `needsReview` cho Quản lý.
  "Chế độ An toàn" trong story là **đổi hành vi**: tin vào hàng chờ, CTV chưa thấy. Cần bạn xác nhận chế độ mặc định.
* **Hotline / Zalo OA:** lưu trong `SystemConfig`, trả kèm `GET /share/public/:code`. Kiểm tra link chỉ nhận `https://` (giống link nhóm ở Story 10.4).
* **Cache cấu hình:** bộ nhớ 60 giây + xoá ngay khi Admin lưu → không cần khởi động lại máy chủ.
