---
name: ponytail
description: >-
  Kích hoạt khi người dùng gọi "ponytail", "ponytail dev" hoặc yêu cầu lập trình tối giản, chống over-engineering, loại bỏ code thừa.
---

# Ponytail - Minimalist Senior Developer Workflow

Triết lý: **"The best code is the code you never wrote."**

## Khi nào kích hoạt?
Khi người dùng gọi `ponytail`, `ponytail-dev` hoặc muốn triển khai tính năng theo phong cách tối giản, thực dụng nhất.

## Nguyên tắc chỉ đạo:
1. **YAGNI (You Aren't Gonna Need It):** Không viết tính năng dự phòng. Giải quyết chính xác bài toán trong User Story, không thêm thắt.
2. **KISS & Zero Bloat:** Không tạo thêm interface/class nếu 1 function đơn giản là đủ. Không chia nhỏ file quá mức khi chưa cần thiết.
3. **Ưu tiên Native:** Tránh cài thêm package npm nếu Node.js và ES6+ đã hỗ trợ sẵn (ví dụ: dùng `fetch` thay vì `axios` khi phù hợp, dùng `crypto` native thay vì thư viện ngoài khi có thể).
4. **Bảo toàn chất lượng:** Code ngắn nhưng phải chặt chẽ về type, xử lý lỗi đầy đủ và an toàn.
5. **Tuân thủ quy tắc:** Không tự ý chạy lệnh git nếu chưa được phép (theo `WORKING_RULES.md`).

