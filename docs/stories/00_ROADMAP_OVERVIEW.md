# TỔNG QUAN USER STORIES & LỘ TRÌNH DỰ ÁN (PROJECT ROADMAP)

Hệ thống quản lý căn hộ cho Quản lý & Cộng tác viên (CTV) được băm nhỏ thành **17 Epics chính** với các User Stories cụ thể, đảm bảo có thể phát triển độc lập, kiểm thử dễ dàng và bàn giao từng phần.

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
| **[EPIC-07](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_07_DANANG_MARKET.md)** | Chuyển đổi sang Thị trường Đà Nẵng | Khu vực/điểm mốc Đà Nẵng, AI hiểu tin tiếng Anh, khoảng cách biển, hồ bơi, giá USD | P1 (Đã xong) |
| **[EPIC-08](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_08_LISTING_UPLOAD_FEEDBACK.md)** | Chuẩn hóa Nhập tin theo Feedback Khách | Bỏ cọc/hoa hồng, link map + tên đường, loại căn, khu vực & 11 tiện ích theo khách, sửa lỗi nhập tin | P0 (Feedback khách) |
| **[EPIC-09](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_09_PWA_MOBILE_APP.md)** | Ứng dụng Di động PWA & Mobile-First | Cài app ra màn hình chính không qua App Store, chạy ngoại tuyến (Offline), menu đáy 1 tay, Web Share Zalo | P1 (Tối ưu Mobile) |
| **[EPIC-10](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_10_MOBILE_FEEDBACK_POLISH.md)** | Sửa lỗi & nâng cấp giao diện theo phản hồi dùng thử | Header bị che trên iPhone, tải video, tải ảnh nhanh, mẫu bài gửi khách 10 dòng, trang đăng nhập mới | P0 (Feedback dùng thử) |
| **[EPIC-11](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_11_SMART_BROKER_TOOLS_AND_REALTIME.md)** | Bộ Công cụ Môi giới Nâng cao & Kho phòng Thời gian thực | Khách tìm phòng (Reverse Lead Matching), Bản đồ tương tác & Bong bóng giá, Lập lộ trình dẫn khách, Cập nhật Real-time SSE, Nhắc tái ký hợp đồng | P1 (Tăng tốc bán hàng) |
| **[EPIC-12](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_12_UI_UX_DESIGN_SYSTEM_AND_STANDARDIZATION.md)** | Chuẩn Hóa Giao Diện & Design System Mobile-First | Design Tokens, Thẻ căn hộ đa chế độ & lướt ảnh, Bảng trượt Bottom Sheet vuốt đóng, Lightbox phóng to 2 ngón, Skeletons & Độ tương phản ngoài trời | P1 (Nâng cấp giao diện) |
| **[EPIC-13](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_13_ADMIN_CONTROL_CENTER_AND_GOVERNANCE.md)** | Trung Tâm Quản Trị Hệ Thống & Nâng Cấp Quyền Hạn Admin | Dashboard KPI kinh doanh, Quản lý thành viên & Đổi Role, Audit Log xem số chủ nhà, Xếp hạng CTV, Cấu hình Telegram nguồn, SĐT chủ tùy chọn, 2 cách nhập vị trí & Cảnh báo trùng căn bộ 3 | P1 (Vận hành & Giám sát) |
| **[EPIC-14](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_14_SYSTEM_AUDIT_FIXES_AND_HARDENING.md)** | Sửa Lỗi Logic Sau Rà Soát Toàn Hệ Thống & Gia Cố Bảo Mật | Chuẩn hóa & che SĐT chủ tin AI, chống gộp nhầm khi khử trùng, thống nhất quyền sửa căn FE–BE, khóa API kho với khách vãng lai, chống dò mật khẩu, báo lỗi tin & chat AI hiểu đúng khu vực / USD | P0 (Sửa lỗi sau rà soát) |
| **[EPIC-15](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_15_GEOSPATIAL_MAP_AND_SMART_DISCOVERY.md)** | Nâng Cấp Hệ Thống Bản Đồ Địa Không Gian & Khảo Sát Bất Động Sản | Tile CartoDB tối giản, nút định vị GPS thực địa, tản ghim xoắn ốc khử chồng lấn tâm quận, tìm kiếm theo khung nhìn Bounding Box, bán kính điểm mốc, bản đồ bảo mật 300m trang khách `/p/:slug` | P1 (Nâng cấp thực địa) |
| **[EPIC-16](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_16_ADMIN_CONSOLE_AND_ACTIVITY_MONITORING.md)** | Bảng Điều Khiển Quản Trị Riêng & Giám Sát Hoạt Động Người Dùng | Giao diện Admin riêng (sidebar / menu đáy riêng), nhật ký hoạt động toàn diện + xuất CSV, hồ sơ thành viên 360°, quản lý phiên & thiết bị, cảnh báo bất thường, tạo tài khoản trực tiếp, thùng rác căn hộ, giám sát gói dịch vụ & cảnh báo thay key, thông báo chung | P1 (Quản trị & Giám sát) |
| **[EPIC-17](file:///d:/CODE/AppartmentSaleProject/docs/stories/EPIC_17_MULTI_CHANNEL_AUTO_POSTING_AND_PRECISION_MAPS.md)** | Tự Động Hóa Đăng Tin Đa Kênh (Zalo, WhatsApp) & Chuẩn Hóa Định Vị Google Maps | Đăng bài 1-chạm Zalo/WhatsApp, bộ ghim vị trí trực quan trên form, giải mã link Google Maps đa kênh, tự động tạo bài tiếng Anh Expat, Spin Text chống spam, trang Map QA căn chỉnh tọa độ cho Admin | P0 (Bán hàng & Dữ liệu) |

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
* Hoàn thành **EPIC-07** (Định vị thị trường Đà Nẵng: khu vực, bãi biển, hồ bơi, giá USD).
* Hoàn thành **EPIC-08** (Chuẩn hóa form nhập tin theo feedback thị trường).
> 👉 *Kết thúc GĐ2: Giải quyết triệt để nỗi đau phải theo dõi hàng chục nhóm chat bằng tay.*

### Giai đoạn 3: Tối ưu Trải nghiệm Mobile-First & Chuẩn hóa Giao diện
* Hoàn thành **EPIC-09** (Ứng dụng PWA, cài đặt không cần App Store, menu đáy công thái học, offline cache).
* Hoàn thành **EPIC-10** (Sửa lỗi iPhone, tối ưu tải ảnh/video, mẫu bài 10 dòng, chuẩn hóa trang đăng nhập & dán tin).
* Hoàn thành **EPIC-12** (Xây dựng Design System, thẻ ảnh lướt trực tiếp, Bottom Sheet vuốt đóng, Lightbox zoom 2 ngón, Shimmer skeletons).
> 👉 *Kết thúc GĐ3: Biến web app thành ứng dụng di động hoàn chỉnh, đạt chuẩn trải nghiệm quốc tế tương đương Airbnb/Zillow nhưng siêu nhẹ và tối ưu cho môi giới Việt Nam.*

### Giai đoạn 4: Đột phá Bán hàng, Vận hành Thời gian thực & Quản trị Tối cao (Smart Tools & Governance)
* Hoàn thành **EPIC-11** (Reverse Lead Matching "Khách tìm phòng", Bản đồ tương tác bong bóng giá, Lập lộ trình dẫn khách, Real-time SSE, Quản lý hạn hợp đồng thuê).
* Hoàn thành **EPIC-13** (Trung tâm điều hành Admin, Quản lý thành viên & Đổi Role, Audit Log xem số chủ nhà, Xếp hạng CTV, Cấu hình Telegram nguồn).
* Hoàn thành **EPIC-06** (Mini-CRM & AI Auto-Chat).
> 👉 *Kết thúc GĐ4: Hệ thống tự động ghép khách, quản trị toàn diện rủi ro rò rỉ dữ liệu, tối ưu hóa công tác dẫn khách và giữ chân nguồn hàng dài hạn.*

### Giai đoạn 5: Ổn định & Gia cố sau Rà soát Toàn hệ thống (Audit Fixes & Hardening)
* Hoàn thành **EPIC-14** (Rà soát 20/11/2026: che SĐT chủ tuyệt đối, khử trùng không gộp nhầm, quyền sửa căn nhất quán, khóa API kho, gia cố đăng nhập/phiên/upload, báo lỗi tin & chat AI chuẩn).
> 👉 *Kết thúc GĐ5: Mọi cam kết bảo vệ dữ liệu chủ nhà và các luồng nghiệp vụ của Epic 1–13 chạy đúng trong thực tế, sẵn sàng mở rộng số lượng CTV.*

### Giai đoạn 6: Nâng Cấp Hệ Thống Bản Đồ Địa Không Gian & Trải Nghiệm Khảo Sát (Geospatial & Discovery)
* Thực hiện **EPIC-15** (Tile CartoDB Positron/Voyager tối giản, nút định vị GPS thực địa cho CTV, tản ghim xoắn ốc khử chồng lấn tâm quận, tìm kiếm theo khung nhìn Bounding Box, bán kính mốc trực quan, bản đồ bảo mật 300m trang khách `/p/:slug`).
> 👉 *Kết thúc GĐ6: Đưa trải nghiệm khảo sát thực địa của CTV lên đẳng cấp chuyên nghiệp, biến bản đồ thành công cụ chốt khách thực chiến sắc bén tại Đà Nẵng.*

### Giai đoạn 7: Bảng Điều Khiển Quản Trị Riêng & Giám Sát Hoạt Động (Admin Console & Monitoring)
* Thực hiện **EPIC-16** (Khung giao diện Admin riêng, nhật ký hoạt động toàn diện, hồ sơ thành viên 360°, quản lý phiên & thiết bị, cảnh báo bảo mật, thùng rác căn hộ, sức khỏe hệ thống, thông báo chung — giữ nguyên toàn bộ chức năng hiện có).
> 👉 *Kết thúc GĐ7: Admin nhìn thấy và kiểm soát toàn bộ hệ thống từ 1 nơi — biết ai làm gì, lúc nào, phát hiện sớm rủi ro rò rỉ nguồn hàng.*

### Giai đoạn 8: Tự Động Hóa Đăng Tin Đa Kênh & Chuẩn Hóa Định Vị Tuyệt Đối (Omnichannel & Precision Maps)
* Thực hiện **EPIC-17** (Đăng bài 1-chạm Zalo & WhatsApp, bộ ghim vị trí trực quan trên form, giải mã link Google Maps đa kênh, tự động tạo bài tiếng Anh Expat, Spin Text chống spam, trang Map QA căn chỉnh tọa độ cho Admin).
> 👉 *Kết thúc GĐ8: Tối đa hóa hiệu suất bán hàng của CTV trên mạng xã hội, loại bỏ hoàn toàn các lỗi lệch vị trí trên bản đồ, đưa dữ liệu kho hàng về chuẩn xác từng mét.*



