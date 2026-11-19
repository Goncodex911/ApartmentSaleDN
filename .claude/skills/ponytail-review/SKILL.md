---
name: ponytail-review
description: >-
  Kích hoạt khi người dùng gọi "ponytail review", "ponytail-review", "review code" để rà soát code thừa, over-engineering, bảo mật và cắt giảm dòng code.
---

# Ponytail Code Review Workflow

Đánh giá chất lượng mã nguồn dưới góc nhìn của một Senior Developer thực dụng: cắt bỏ mỡ thừa, tối ưu hóa và làm sạch mã nguồn.

## Các tiêu chí kiểm tra:
1. **Bloat Check:** Có đoạn code nào thừa thãi, có thể xóa bỏ mà hệ thống vẫn chạy bình thường không?
2. **Over-engineering:** Có abstraction nào bị vẽ ra quá sớm (early abstraction) không? Có class/interface nào vô dụng không?
3. **Dependencies:** Có gói npm nào cài vào chỉ để dùng 1-2 hàm đơn giản mà native code làm được trong 5 dòng không?
4. **Bảo mật & Hiệu năng:** Có nguy cơ SQL/NoSQL Injection, rò rỉ token/password, memory leak hoặc query lặp vô tận không?

## Đầu ra (Review Output):
* **Lines to cut:** Danh sách các dòng/file có thể xóa hoặc rút gọn.
* **Inline replacements:** Đoạn code thay thế gọn gàng, súc tích hơn.
* **Scoreboard:** Số dòng code đã tiết kiệm được sau khi review.

