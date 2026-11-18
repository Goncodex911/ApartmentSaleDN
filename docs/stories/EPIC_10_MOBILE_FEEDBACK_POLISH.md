# EPIC-10: Sửa lỗi & nâng cấp giao diện theo phản hồi dùng thử trên điện thoại

## Bối cảnh
Sau khi triển khai Epic 9 (PWA), người dùng thử trên iPhone và gửi phản hồi kèm ảnh chụp. Đối chiếu với code:

| # | Phản hồi | Nguyên nhân |
|---|---|---|
| A | Header bị thanh trạng thái đè; không thấy nút Sửa / Xóa ở chi tiết căn | Story 9.1 đặt thanh trạng thái iPhone `black-translucent` → nội dung tràn dưới đồng hồ / pin. Thanh trên đã chừa chỗ, các màn toàn màn hình (chi tiết căn, form, Nhập nhanh, thông báo) thì chưa |
| B | Bấm "Tạo link" thì không quay ra được | Hệ quả của A (nút Đóng bị che) + khung link không có nút đóng |
| C | Thông báo không tắt được | Khung thông báo không đóng khi chạm ra ngoài, không có nút X |
| D | Giao diện "lớn hơn" màn hình | Ô nhập Nhập nhanh chữ 12px → iPhone tự phóng to khi bấm vào và giữ nguyên mức phóng to |
| E | Tải video lỗi | Video lưu lẫn vào danh sách ảnh (hiển thị bằng thẻ ảnh); file đi qua Netlify proxy (ngắt sau ~26 giây) + Render (tối đa 25MB) |
| F | Tải ảnh lâu | Server tải từng ảnh về, in SĐT CTV lên ảnh rồi gửi lại |
| G | Trang đăng nhập chưa đẹp; hộp Nhập nhanh vỡ trên điện thoại | Giao diện cũ "RoomMaster Portal", chưa theo nhận diện ApartmentDN; Nhập nhanh chưa làm lại theo chuẩn điện thoại |
| H | Mẫu bài gửi khách | Khách muốn mẫu 10 dòng đánh số (xem Story 10.4), bỏ link hệ thống trong bài |

## Quyết định của Project Owner
1. Mẫu bài mới áp dụng **cả tiếng Việt và tiếng Anh**, cùng cấu trúc 10 dòng, đánh số liền **1️⃣ → 🔟**.
2. "deposit 1 month pay 1 month" → ô **Điều kiện thanh toán** trong Hồ sơ CTV (mặc định câu này, CTV tự sửa).
3. Link **nhóm Zalo / WhatsApp** → 2 ô trong Hồ sơ CTV, để trống thì không in dòng đó.
4. Dịch vụ dọn phòng in là **"clean 1 a week"**.
5. **Bỏ in SĐT lên ảnh** gửi khách.
6. **Giữ** nút "Tạo link / Lượt xem" (chỉ bỏ link khỏi bài gửi khách).

## Danh mục User Stories
| Story | Tên | Ưu tiên |
|---|---|---|
| **10.1** | Sửa lỗi hiển thị trên iPhone: thanh trạng thái, phóng to, đóng thông báo / khung link | P0 |
| **10.2** | Tải video thẳng lên Cloudinary, video lưu & phát riêng | P0 |
| **10.3** | Tải ảnh nhanh — bỏ in SĐT, tải ảnh gốc từ Cloudinary | P0 |
| **10.4** | Mẫu bài gửi khách 10 dòng (VI / EN) + 3 ô mới trong Hồ sơ CTV | P1 |
| **10.5** | Làm đẹp trang đăng nhập & hộp Nhập nhanh trên điện thoại | P1 |

Thứ tự làm: 10.1 → 10.2 → 10.3 → 10.4 → 10.5. Story chi tiết: `tasks/STORY-10.x-*.md`.
