# TỔNG QUAN USER STORIES & LỘ TRÌNH DỰ ÁN (PROJECT ROADMAP)

Hệ thống quản lý căn hộ cho Quản lý & Cộng tác viên (CTV) được băm nhỏ thành **6 Epics chính** với các User Stories cụ thể, đảm bảo có thể phát triển độc lập, kiểm thử dễ dàng và bàn giao từng phần.

---

## Danh mục các Epics

| Epic | Tên Epic | Mục tiêu cốt lõi | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- |
| **[EPIC-01](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_01_AUTH_AND_PERMISSIONS.md)** | Quản lý Người dùng & Phân quyền (RBAC) | Tạo tài khoản, đăng nhập, bảo vệ thông tin chủ nhà giữa Quản lý và CTV | P0 (Bắt buộc) |
| **[EPIC-02](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_02_APARTMENT_INVENTORY.md)** | Bảng hàng Căn hộ & Quản lý Kho | CRUD căn hộ, quản lý trạng thái phòng (Trống/Cọc/Đã thuê), mô hình Master-Sub | P0 (Bắt buộc) |
| **[EPIC-03](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_03_DATA_INGESTION_AND_DEDUP.md)** | Thu thập tin Đa kênh & Khử trùng lặp | Tự động lấy tin Telegram/Zalo/FB, AI parse thông tin, nhận diện ảnh trùng pHash | P1 (Cốt lõi bài toán) |
| **[EPIC-04](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_04_SMART_SEARCH_AND_FILTER.md)** | Tìm kiếm Siêu tốc & Bộ lọc Thực tiễn | Tìm kiếm mờ (Fuzzy), hiểu từ lóng môi giới (`ccmn`, `1n1k`), lọc theo bán kính GPS | P0 (Bắt buộc) |
| **[EPIC-05](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_05_ONE_CLICK_SHARE.md)** | Tính năng 1-Click Share (Không cap màn hình) | Tạo bài viết Zalo mẫu, tải ảnh gắn watermark CTV, tạo link xem phòng ẩn số chủ | P0 (Bắt buộc) |
| **[EPIC-06](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_06_CUSTOMER_CRM_AND_AUTO_CHAT.md)** | Mini-CRM & AI Auto-Chat Giữ chân khách | Quản lý tiến trình khách thuê, Chatbot tự động gợi ý căn khi khách hỏi | P2 (Nâng cao) |

---

## Lộ trình Phát triển theo Giai đoạn (Phases)

### Giai đoạn 1: Nền tảng cốt lõi (Core MVP)
* Hoàn thành **EPIC-01** (Phân quyền Admin / Quản lý / CTV).
* Hoàn thành **EPIC-02** (Kho căn hộ, nhập liệu chuẩn).
* Hoàn thành **EPIC-04** (Tìm kiếm & Bộ lọc nhanh).
* Hoàn thành **EPIC-05** (1-Click Share gửi khách).
> 👉 *Kết thúc GĐ1: Quản lý và CTV đã có thể sử dụng web app để tìm căn và gửi khách ngay lập tức thay vì dùng bảng excel hay cap màn hình.*

### Giai đoạn 2: Tự động hóa & Khử trùng lặp (Automation & AI)
* Hoàn thành **EPIC-03** (Bot Telegram/Extension cào tin -> AI parse thông tin -> Tự động khử trùng tin).
> 👉 *Kết thúc GĐ2: Giải quyết triệt để nỗi đau phải theo dõi hàng chục nhóm chat bằng tay.*

### Giai đoạn 3: Giữ chân khách & Tối ưu kinh doanh (CRM & Chatbot)
* Hoàn thành **EPIC-06** (Quản lý phễu khách hàng, AI Chat gợi ý căn tự động).
> 👉 *Kết thúc GĐ3: Khép kín quy trình từ lúc lấy tin -> tìm kiếm -> tư vấn khách -> chốt cọc.*

