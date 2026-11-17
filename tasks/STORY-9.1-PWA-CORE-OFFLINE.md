# STORY 9.1: PWA Core — Manifest, Service Worker & xem kho ngoại tuyến (Epic 9)

**Bối cảnh:** `docs/stories/EPIC_09_PWA_MOBILE_APP.md` — Story 9.1. Đối chiếu với code hiện tại phát hiện 4 việc epic chưa nêu
nhưng bắt buộc để offline chạy đúng và an toàn (AC4–AC7 bên dưới).

## User Story
Là **CTV / Quản lý dùng điện thoại**, tôi muốn cài RoomMaster ra màn hình chính, mở toàn màn hình và vẫn xem được danh sách phòng khi mất sóng,
để tra cứu phòng liên tục trong thang máy, tầng hầm, ngõ sâu.

## Tiền điều kiện
- Nhánh `feat/epic-09-pwa`. Đã có logo (bản gốc 2048×2048, nền navy `#0f2a45`, biểu tượng vàng "DN" ở vùng y 308–1272).
- Người dùng đồng ý cài `vite-plugin-pwa` (devDependency, cách A).
- Web trên Netlify (HTTPS), API đi qua cùng tên miền `/api/*` (Netlify proxy) → Service Worker chặn được request API.

## Tiêu chí chấp nhận (Gherkin)

**AC1 — Manifest & icon**
- Given mở web trên Chrome Android / Safari iOS
- Then có `manifest.webmanifest`: `name` "ApartmentDN - Kho Căn Hộ Cho Thuê", `short_name` "ApartmentDN", `display: standalone`,
  `orientation: portrait`, `start_url: /apartments`, `theme_color` và `background_color` (xem Quyết định), icon `192`, `512`, `512 maskable`
- And icon cắt từ **biểu tượng tròn "DN"** của logo (bỏ chữ "CĂN HỘ APARTMENT" và dấu ✦ góc dưới), đặt giữa nền navy;
  bản maskable để biểu tượng nằm trong 80% giữa (Android cắt tròn không mất hình).

**AC2 — iOS Safari**
- Then `index.html` có `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` = `black-translucent`,
  `apple-mobile-web-app-title`, `apple-touch-icon` 180×180, `theme-color`, favicon mới, `viewport-fit=cover` (để dùng safe-area ở 9.3);
  `<title>` = "ApartmentDN".

**AC3 — Bộ nhớ đệm**
- File tĩnh (HTML, JS, CSS, icon, font): precache khi cài, mở lại app không cần mạng.
- Ảnh Cloudinary: CacheFirst, tối đa **50 ảnh** gần nhất, hết hạn 30 ngày.
- Bảng hàng: **NetworkFirst** cho `GET /api/v1/apartments/search` (API Bảng hàng thực sự dùng — epic ghi `/apartments` là chưa đúng)
  và `GET /api/v1/apartments`, chờ mạng tối đa 4 giây rồi lấy bản đã lưu; tối đa 30 kết quả, hết hạn 7 ngày.
- KHÔNG lưu offline: `/auth/*`, `/submissions/*`, `/leads/*`, `/share/*`, `/notifications/*`, request không phải GET.

**AC4 — Mất mạng không bị đá ra trang đăng nhập** *(bổ sung)*
- Given đã đăng nhập, mất mạng, mở app
- Then vẫn vào Bảng hàng với thông tin người dùng đã lưu ở máy; chỉ chuyển về `/login` khi server trả **401 thật**.
  (Hiện tại 3 trang gọi `getMe().catch(() => navigate('/login'))` → mất mạng là bị đá ra.)

**AC5 — Không lộ dữ liệu khi đổi tài khoản trên cùng máy** *(bổ sung — bảo mật)*
- Given Quản lý dùng máy (dữ liệu offline có SĐT chủ nhà), đăng xuất, CTV đăng nhập trên cùng máy rồi mất mạng
- Then CTV KHÔNG thấy dữ liệu của Quản lý: xóa cache API khi **đăng xuất** và khi **đăng nhập thành công**.

**AC6 — Thanh ngoại tuyến**
- Given mất kết nối
- Then hiện thanh nhỏ "Đang xem dữ liệu ngoại tuyến" (icon `WifiOff`, không dùng emoji); có mạng lại thì tự ẩn và tải lại danh sách.
- Thao tác cần mạng (lưu căn, đăng tin, duyệt...) khi offline → báo "Cần kết nối mạng" thay vì lỗi khó hiểu.

**AC7 — Cập nhật phiên bản mới** *(bổ sung)*
- Given đã cài app, Netlify deploy bản mới
- When mở app
- Then hiện thanh "Đã có phiên bản mới" + nút **Tải lại** (không tự tải lại giữa lúc đang nhập form).

## Phạm vi kỹ thuật

| File | Thay đổi |
|---|---|
| `frontend/package.json` | Thêm devDependency `vite-plugin-pwa` (+ `workbox-window` đi kèm) |
| `frontend/vite.config.ts` | `VitePWA({ registerType: 'prompt', manifest, workbox: { navigateFallback: '/index.html', navigateFallbackDenylist: [/^\/api\//], runtimeCaching } })` |
| `frontend/public/brand/logo-source.png` (mới) | Logo gốc người dùng gửi |
| `frontend/public/icons/*` (mới) | `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (180), `favicon-32.png` — xuất 1 lần bằng `sharp` (có sẵn trong backend), commit file PNG, không thêm script build |
| `frontend/index.html` | Meta iOS, theme-color, `viewport-fit=cover`, favicon, title |
| `frontend/public/_headers` (mới) | `/sw.js`, `/manifest.webmanifest`, `/index.html`: `Cache-Control: no-cache` (tránh kẹt bản cũ) |
| `frontend/src/hooks/useCurrentUser.ts` (mới) | Lấy người dùng: gọi `getMe`, lưu `localStorage.user`; lỗi mạng (không có response) → dùng bản đã lưu; 401 do interceptor xử lý |
| `frontend/src/utils/offlineCache.ts` (mới) | `clearOfflineData()`: xóa cache `api-apartments` (gọi khi đăng xuất / đăng nhập) |
| `frontend/src/components/layout/PwaStatus.tsx` (mới) | Thanh ngoại tuyến (`online`/`offline` event) + thanh cập nhật (`useRegisterSW`) |
| `ApartmentsPage.tsx`, `LeadsPage.tsx`, `SubmissionsPage.tsx`, `LoginPage.tsx`, `Navbar.tsx` | Dùng `useCurrentUser`; gọi `clearOfflineData` khi đăng nhập / đăng xuất |
| `ApartmentCard.tsx`, `ApartmentDetailModal.tsx` | Ảnh căn thêm `crossOrigin="anonymous"` → cache ảnh Cloudinary không bị "opaque" (Chrome tính mỗi ảnh opaque ~7MB dung lượng) |
| `frontend/src/vite-env.d.ts` | Khai báo kiểu `virtual:pwa-register/react` |

Không đổi backend, không thêm biến môi trường.

## Quyết định (Project Owner đã chốt)
- **Tên app dưới icon:** `ApartmentDN` (tên đầy đủ: "ApartmentDN - Kho Căn Hộ Cho Thuê").
- **Màu:** navy theo logo — `theme_color` và `background_color` = `#0f2a45` (thanh trạng thái Android, màn hình chờ khi mở app).

## Rủi ro
- iOS có thể xóa dữ liệu offline nếu app không được mở trong vài tuần (giới hạn của Safari) → mở lại có mạng là tự nạp lại.
- Kết quả offline chỉ có cho đúng trang / bộ lọc đã xem khi còn mạng (lưu theo địa chỉ request).

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] `npm run build` → có `dist/sw.js`, `dist/manifest.webmanifest`; Lighthouse (Chrome DevTools) mục **Installable** đạt.
- [ ] Puppeteer bản build (`vite preview`): tải Bảng hàng → bật offline (`page.setOfflineMode`) → tải lại → vẫn thấy danh sách + thanh ngoại tuyến, KHÔNG về `/login`.
- [ ] Đăng nhập Quản lý → xem Bảng hàng → đăng xuất → đăng nhập CTV → offline → không thấy SĐT chủ nhà / dữ liệu của Quản lý.
- [ ] Ảnh đã xem mở được khi offline; cache ảnh không quá 50 mục.
- [ ] Build lại (đổi code) → trang đang mở hiện thanh "Đã có phiên bản mới".
- [ ] Ảnh icon: chụp 5 cỡ, kiểm tra không còn chữ / dấu ✦, maskable không mất hình khi cắt tròn.
- [ ] Sau deploy: thử cài trên iPhone (Safari) và Android (Chrome) theo `EXTERNAL_CONFIG.md` mục 6.3.
- [ ] Báo cáo, đề xuất commit `feat(pwa): manifest, service worker and offline inventory (Story 9.1)` chờ duyệt.
