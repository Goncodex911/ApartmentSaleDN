---
name: bmad-create-story
description: >-
  Kích hoạt khi người dùng gọi "bmad create story", "create story" hoặc muốn phân rã một tính năng thành story chuẩn BMad.
---

# BMad Create Story Workflow

Workflow này phân rã một yêu cầu/tính năng thành file Story chi tiết chuẩn phương pháp BMad và lưu vào thư mục `tasks/`.

## Các bước thực hiện:
1. Tiếp nhận Epic hoặc tên tính năng từ người dùng.
2. Tạo file `tasks/STORY-<ID>-<TEN_TINH_NANG>.md` với cấu trúc:
   - **Mô tả Story:** As a... I want to... So that...
   - **Tiền điều kiện:** Pre-conditions
   - **Tiêu chí chấp nhận (Gherkin AC):** Given... When... Then...
   - **Phạm vi kỹ thuật (Technical Scope):** Danh sách file cần sửa/tạo, API endpoints, Model schema.
   - **Kiểm thử & Định nghĩa hoàn thành (DoD).**
3. Cập nhật vào danh sách `tasks/INDEX.md` (nếu có).
4. Thông báo đường dẫn file story cho người dùng duyệt trước khi chuyển sang bước lập trình.

