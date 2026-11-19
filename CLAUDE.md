# ApartmentSaleProject

Bắt buộc tuân thủ @WORKING_RULES.md trong mọi phiên làm việc (đặc biệt: không tự ý chạy lệnh git thay đổi lịch sử khi chưa được cho phép).

## Quy trình làm việc
- Story/Epic: `docs/stories/` (Epic) và `tasks/STORY-*.md` (Story chi tiết).
- Luồng chuẩn: `/bmad-create-story` → người dùng duyệt story → `/bmad-dev` → `/ponytail-review` → người dùng duyệt commit.

## Skill dự án (`.claude/skills/`)
Gọi bằng `/<tên skill> <tham số>` trong Claude Code, hoặc nói bằng lời có từ khóa kích hoạt (ví dụ "review code" sẽ gọi `ponytail-review`).

### Nhóm quy trình (BMad)
| Skill | Dùng khi | Cách gọi | Kết quả |
|---|---|---|---|
| `bmad` | Chưa nhớ lệnh con, muốn xem danh sách story | `/bmad help`, `/bmad list`, `/bmad create story <tính năng>`, `/bmad dev <mã story>` | Điều hướng sang `bmad-create-story` / `bmad-dev`; `list` liệt kê story trong `tasks/` và Epic trong `docs/stories/` |
| `bmad-create-story` | Có một tính năng/Epic cần băm nhỏ | `/bmad-create-story Đăng tin chờ duyệt cho CTV` | File `tasks/STORY-<ID>-<TEN>.md` gồm User Story, tiền điều kiện, AC dạng Given/When/Then, phạm vi kỹ thuật, DoD. Dừng lại chờ duyệt, chưa code |
| `bmad-dev` | Story đã được duyệt, bắt đầu code | `/bmad-dev 8.2` hoặc `/bmad-dev STORY-8.2` | Code theo Technical Scope (Routes → Controller → Service → Model; API → Component → Page), chạy build/lint, báo cáo và đề xuất commit message (không tự commit) |

### Nhóm viết & rà soát code
| Skill | Dùng khi | Cách gọi | Kết quả |
|---|---|---|---|
| `ponytail` | Muốn làm nhanh, gọn, ít code nhất | `/ponytail <yêu cầu>` | Code theo YAGNI/KISS, ưu tiên API có sẵn của Node/trình duyệt thay vì cài thêm package, vẫn giữ type và xử lý lỗi chặt |
| `ponytail-review` | Sau khi code xong, trước khi commit | `/ponytail-review` (rà diff hiện tại) hoặc `/ponytail-review <file/thư mục>` | Danh sách dòng/file nên cắt, đoạn thay thế gọn hơn, phát hiện over-engineering, package thừa, lỗ hổng bảo mật (injection, lộ token), số dòng tiết kiệm được |

### Nhóm thiết kế giao diện
| Skill | Dùng khi | Cách gọi | Kết quả |
|---|---|---|---|
| `apple-design` | Làm hiệu ứng, cử chỉ, giao diện kiểu Apple: kéo/vuốt, bottom sheet, animation dạng lò xo (spring), nền mờ, typography | `/apple-design <yêu cầu>`, ví dụ `/apple-design làm bottom sheet chi tiết căn hộ vuốt để đóng` | Áp dụng nguyên tắc từ các bài WWDC: phản hồi tức thì, kéo bám tay 1:1, animation ngắt giữa chừng được, giữ quán tính khi thả tay, tôn trọng `prefers-reduced-motion` |
| `ui-ux-pro-max` | Rà soát hoặc thiết kế lại UI/UX: màu, font, khoảng cách, khả năng truy cập, vùng bấm, responsive | `/ui-ux-pro-max <yêu cầu>`, ví dụ `/ui-ux-pro-max rà soát form thêm căn trên điện thoại` | Checklist ưu tiên: tương phản ≥ 4.5:1, vùng bấm ≥ 44px, chữ ô nhập ≥ 16px trên điện thoại, không dùng emoji làm icon, có trạng thái loading/lỗi/trống |

### Lưu ý về skill
- `ui-ux-pro-max` hiện **cài thiếu**: thư mục chỉ có `scripts/design_system.py` và 3 file dữ liệu, không có `scripts/search.py` mà skill hướng dẫn chạy. Phần checklist trong SKILL.md vẫn dùng được, còn lệnh tra cứu `search.py --design-system` sẽ không chạy.
- `/windows-design` (code theo phong cách UI của Windows) **chưa có** trong `.claude/skills/`. Cần tải hoặc tạo skill này trước khi dùng.
- Ngoài skill dự án, Claude Code có sẵn các lệnh dùng chung: `/code-review` (tìm bug trong diff), `/security-review` (rà bảo mật nhánh hiện tại), `/simplify` (dọn code đã sửa).
