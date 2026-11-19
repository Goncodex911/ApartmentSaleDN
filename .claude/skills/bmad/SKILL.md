---
name: bmad
description: >-
  Lệnh chung của BMad. Kích hoạt khi người dùng gọi "/bmad", "bmad" kèm hoặc không kèm lệnh con (create story, dev, list, help).
---

# BMad - Lệnh chung

Đọc tham số người dùng truyền vào (ARGUMENTS: $ARGUMENTS) và điều hướng:

| Lệnh con | Hành động |
|---|---|
| `create story <tên tính năng>` | Thực hiện đúng quy trình trong `.claude/skills/bmad-create-story/SKILL.md` |
| `dev <mã story>` | Thực hiện đúng quy trình trong `.claude/skills/bmad-dev/SKILL.md` |
| `list` | Liệt kê các file `tasks/STORY-*.md` và các Epic trong `docs/stories/`, kèm trạng thái (đã có code hay chưa nếu xác định được) |
| `help` hoặc không có tham số | Hiển thị bảng lệnh này và hỏi người dùng muốn làm gì |

Quy tắc chung:
- Luôn tuân thủ `WORKING_RULES.md` (không tự ý chạy git thay đổi lịch sử).
- Nếu lệnh con không rõ ràng, hỏi lại người dùng thay vì đoán.
