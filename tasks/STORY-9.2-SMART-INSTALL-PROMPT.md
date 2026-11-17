# STORY 9.2: Thanh hướng dẫn cài đặt thông minh (iOS & Android) (Epic 9)

**Bối cảnh:** `docs/stories/EPIC_09_PWA_MOBILE_APP.md` — Story 9.2. Làm SAU 9.3 vì thanh cài đặt phải nằm phía trên menu đáy.

## User Story
Là **CTV mở web lần đầu trên điện thoại**, tôi muốn được hướng dẫn cài app đúng theo điện thoại của mình,
để cài xong trong 5 giây mà không phải tự tìm trong cài đặt trình duyệt.

## Tiền điều kiện
- Story 9.1 (manifest, service worker — điều kiện để Android cho cài) và 9.3 (menu đáy, biến chiều cao vùng đáy) đã xong.

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Android (Chrome, Samsung Internet, Cốc Cốc)**
- Given trình duyệt phát sự kiện `beforeinstallprompt`
- Then hiện thanh nhỏ phía trên menu đáy: "Cài ApartmentDN để mở nhanh như app" + nút **Cài đặt** (cao ≥ 44px)
- When bấm **Cài đặt** → gọi hộp cài đặt của hệ thống; người dùng đồng ý (`appinstalled`) → ẩn hẳn thanh.

**AC2 — iOS (Safari iPhone / iPad)**
- Given iOS, đang mở bằng Safari, chưa chạy ở chế độ app (`navigator.standalone !== true`)
- Then hiện bảng hướng dẫn 2 bước có icon (lucide `Share`, `SquarePlus`, không dùng emoji):
  1. Chạm nút **Chia sẻ** ở thanh dưới Safari.
  2. Chọn **"Thêm vào MH chính"**.
- Given iOS nhưng mở bằng Chrome / Zalo / Facebook (trình duyệt trong app — không cài được)
- Then hướng dẫn "Mở trang này bằng Safari để cài app" + nút **Copy link**.

**AC3 — Không làm phiền**
- Có nút đóng (X, vùng bấm 44px). Bấm đóng → không hiện lại trong **7 ngày** (`localStorage`, đọc / ghi trong try/catch).
- Không hiện khi: đang chạy như app (standalone), máy tính (màn hình ≥ 768px và không cảm ứng), trang khách xem `/p/...`,
  trang đăng nhập, hoặc khi đang mở form / hộp thoại.
- Chỉ hiện sau khi đã vào app ≥ 1 lần (lần mở thứ 2 hoặc sau 30 giây) — không chặn ngay lần đầu CTV vừa đăng nhập.

## Phạm vi kỹ thuật
| File | Thay đổi |
|---|---|
| `frontend/src/hooks/useInstallPrompt.ts` (mới) | Nhận diện nền tảng (Android có `beforeinstallprompt` / iOS Safari / iOS trình duyệt khác / đã cài), lưu sự kiện để gọi `prompt()`, quy tắc 7 ngày |
| `frontend/src/components/layout/InstallPrompt.tsx` (mới) | Thanh Android + bảng hướng dẫn iOS (bottom sheet), đặt phía trên menu đáy (dùng biến CSS vùng đáy của 9.3) |
| `frontend/src/components/layout/AppShell.tsx` (từ 9.3) | Gắn `InstallPrompt` |

Không đổi backend, không thêm thư viện.

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] Puppeteer 390px: giả lập `beforeinstallprompt` → thanh hiện, bấm Cài đặt gọi `prompt()`; bấm X → tải lại không hiện; chỉnh ngày +8 → hiện lại.
- [ ] Giả lập user agent iPhone Safari → bảng 2 bước; iPhone + Zalo/Chrome → hướng dẫn mở bằng Safari; desktop / standalone / `/p/...` → không hiện.
- [ ] Đo: nút ≥ 44px, không che menu đáy, không che huy hiệu Netlify.
- [ ] Sau deploy: cài thật trên Android Chrome và iPhone Safari.
- [ ] Báo cáo, đề xuất commit `feat(pwa): smart install prompt for Android and iOS (Story 9.2)` chờ duyệt.
