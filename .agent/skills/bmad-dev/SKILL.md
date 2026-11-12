---
name: bmad-dev
description: >-
  Kích hoạt khi người dùng gọi "bmad-dev", "bmad dev" hoặc yêu cầu bắt đầu lập trình (code) cho một story cụ thể.
---

# BMad Developer Execution Workflow

Workflow này nhận một Story từ `tasks/`, thực hiện lập trình hoàn chỉnh mã nguồn và kiểm thử.

## Quy trình làm việc:
1. Đọc nội dung file story trong `tasks/`.
2. Kiểm tra `WORKING_RULES.md`:
   - KHÔNG tự ý chạy lệnh git nếu chưa được người dùng đồng ý.
   - Kiểm tra biến môi trường `.env`.
   - Không hardcode secrets.
3. Thực thi viết mã nguồn theo đúng Technical Scope:
   - Backend: Routes, Controller, Service, Model, Middleware.
   - Frontend: API, Component, Page, State.
4. Chạy kiểm tra xác minh (Build, lint, type-check hoặc test).
5. Báo cáo kết quả và đề xuất commit message để người dùng duyệt.

