# QUY TẮC LÀM VIỆC DỰ ÁN (PROJECT WORKING RULES)

Tài liệu này là **bản cam kết và quy chuẩn làm việc bắt buộc** giữa AI Assistant và Bạn (Project Owner). Mọi hành động lập trình, thiết lập hệ thống và giao tiếp đều phải tuân thủ nghiêm ngặt các điều khoản dưới đây.

---

## 1. Kiểm soát Phiên bản & Git (Bắt buộc)
* **KHÔNG TỰ Ý CHẠY LỆNH GIT:** Tuyệt đối không tự ý thực hiện các lệnh `git commit`, `git push`, `git branch -D`, `git reset`, `git rebase`, `git checkout .` hoặc bất kỳ hành động thay đổi lịch sử git nào khi **CHƯA ĐƯỢC BẠN CHO PHÉP RÕ RÀNG**.
* **Đề xuất trước khi Commit:** Khi hoàn thành một tính năng hoặc một User Story, AI phải tóm tắt các file đã thay đổi và hỏi ý kiến bạn: *"Đã hoàn thành Story X, bạn có muốn commit với message: `[feat]: ...` không?"*.
* **Bảo vệ mã nguồn:** Không bao giờ dùng `git push --force` hoặc xóa branch mà không có sự đồng ý bằng văn bản từ bạn.

---

## 2. Quản lý Cấu hình & Biến môi trường (Configuration & Secrets)
* **Không Hardcode thông tin nhạy cảm:** Không bao giờ gán cứng chuỗi kết nối Database, JWT Secret, Token Telegram, API Key (Gemini, Zalo, Google Maps...) trực tiếp vào mã nguồn.
* **Tạo file `.env.example` chuẩn chỉnh:** Mọi biến cấu hình mới phát sinh đều phải được cập nhật vào `.env.example` kèm chú thích rõ ràng.
* **Yêu cầu cung cấp cấu hình minh bạch:** Khi hệ thống cần cấu hình để hoạt động, AI sẽ tạo sẵn format và giải thích rõ:
  1. Biến này dùng để làm gì?
  2. Lấy nó ở đâu (kèm hướng dẫn từng bước nếu bạn chưa có)?
  3. Để bạn tự điền vào `.env` bảo mật trên máy bạn.

---

## 3. Tiêu chuẩn Mã nguồn (Clean Code & Architecture)
* **Kiến trúc phân tầng rõ ràng (Layered / Modular Architecture):**
  * Tách biệt ranh giới: `Routes -> Controller -> Service -> Model/Repository`.
  * Controller chỉ nhận request và validate dữ liệu; toàn bộ logic nghiệp vụ (business logic) bắt buộc nằm ở Service.
* **Gọn gàng & Dễ bảo trì:**
  * Giới hạn kích thước file: Không viết file quá 250 - 300 dòng code. Khi logic phức tạp, chủ động tách thành các file utils, helpers hoặc sub-services.
  * Tên biến, tên hàm mang tính tự diễn giải (Self-explanatory naming), tránh viết tắt gây khó hiểu.
  * Comment bằng **Tiếng Việt** rõ ràng ở các đoạn logic nghiệp vụ phức tạp (ví dụ: thuật toán lọc trùng tin, tính toán tọa độ, parse tin AI).
* **Không để lại rác trong code:**
  * Xóa sạch `console.log` thừa sau khi debug.
  * Loại bỏ unused imports, unused variables.
  * Xử lý lỗi tập trung qua Global Error Handler, không để lỗi crash server hoặc lộ stack trace ra phía client.

---

## 4. Quy trình Phát triển theo Từng bước (Step-by-step Execution)
* **Không "nhảy cóc" hoặc suy đoán:**
  * Chỉ làm việc theo các User Stories đã được băm nhỏ và phê duyệt.
  * Trước khi bắt đầu một Story mới, tóm tắt lại giải pháp kỹ thuật dự kiến thực hiện và xác nhận với bạn.
* **Kiểm tra & Xác minh (Verification First):**
  * Sau khi viết xong code, AI phải tự chạy lệnh kiểm tra (build check, lint check, kiểm tra cú pháp) để đảm bảo không có lỗi cơ bản trước khi thông báo hoàn thành cho bạn.
* **Không thực hiện hành động phá hủy (No Destructive Actions):**
  * Tuyệt đối không xóa file, drop collection trong MongoDB hay ghi đè toàn bộ dự án nếu chưa báo trước và được bạn đồng ý.

---

## 5. Quy chuẩn Frontend (React.js)
* Sử dụng functional components và React Hooks chuẩn.
* Tách biệt UI components và Data fetching logic (sử dụng custom hooks hoặc TanStack Query).
* Thiết kế chuẩn **Mobile-First / Responsive** (vì CTV chủ yếu dùng điện thoại để tìm phòng và gửi khách).
* Xử lý triệt để các trạng thái: `Loading (Skeleton)`, `Error`, `Empty State` (khi không tìm thấy căn hộ).

---

## 6. Quy tắc Giao tiếp & Phản hồi
* Báo cáo ngắn gọn, thực tế, đi thẳng vào vấn đề.
* Khi gặp trở ngại kỹ thuật hoặc phát hiện rủi ro (ví dụ: chính sách Zalo chặn bot, thư viện không tương thích), phải chủ động cảnh báo sớm và đưa ra ít nhất 2 phương án giải quyết để bạn lựa chọn.
