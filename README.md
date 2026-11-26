# ApartmentDN (ApartmentSaleDN)

Hệ thống quản lý kho căn hộ cho thuê tại **Đà Nẵng** dành cho **Quản lý**, **Cộng tác viên (CTV)** và **Admin**, tối ưu theo hướng **Mobile-First / PWA**, tích hợp **AI Gemini** để bóc tách tin đăng đa kênh, khử trùng lặp thông minh, tìm kiếm câu tự nhiên, bản đồ địa không gian và mini-CRM chăm sóc khách hàng.

---

## Mục Lục

- [Tính Năng Chính](#tính-năng-chính)
- [Công Nghệ Sử Dụng](#công-nghệ-sử-dụng)
- [Cấu Trúc Thư Mục](#cấu-trúc-thư-mục)
- [Yêu Cầu Hệ Thống](#yêu-cầu-hệ-thống)
- [Cài Đặt & Chạy Local](#cài-đặt--chạy-local)
- [Chạy Với Docker Compose](#chạy-với-docker-compose)
- [Biến Môi Trường Quan Trọng](#biến-môi-trường-quan-trọng)
- [Các Lệnh Hữu Ích & Kiểm Thử](#các-lệnh-hữu-ích--kiểm-thử)
- [Triển Khai (Deploy)](#triển-khai-deploy)
- [Tài Liệu Tham Khảo](#tài-liệu-tham-khảo)

---

## Tính Năng Chính

### 1. Phân Quyền & Bảo Vệ Nguồn Hàng (RBAC)
- 3 vai trò: **Admin**, **Quản lý (`MANAGER`)**, **CTV (`COLLABORATOR`)**.
- **Che dữ liệu chủ nhà (`Data Masking`):** CTV không xem được SĐT gốc chủ nhà, ghi chú nội bộ và hợp đồng thuê; hệ thống tự làm mờ SĐT dính trong tiêu đề/mô tả và ẩn ảnh có chèn SĐT nguồn cũ.
- Quản lý phiên đăng nhập đa thiết bị (`HttpOnly Cookie` khi cùng tên miền hoặc `X-Token-Transport: body` khi gọi cross-domain), xoay vòng Refresh Token, đổi mật khẩu bắt buộc khi cấp mật khẩu tạm.

### 2. Bảng Hàng Căn Hộ & Theo Dõi Thời Gian Thực
- Quản lý kho căn theo mô hình **Master – Sub-listings** (một căn hộ chuẩn có thể đính kèm nhiều nguồn tham chiếu).
- Cập nhật trạng thái phòng 1 chạm (`Trống`, `Sắp trống`, `Đã cọc`, `Đã cho thuê`), lưu hợp đồng thuê và cron job nhắc tái ký theo mốc 30 / 15 ngày / hết hạn.
- **Real-time SSE (`/api/v1/realtime`):** Cập nhật tức thì trạng thái vừa cọc, vừa cho thuê, giảm giá, gắn cờ xác minh ngay trên Bảng hàng và Bản đồ.
- **PWA Mobile-First:** Cài đặt ra màn hình chính trên Android & iOS Safari, hỗ trợ kéo để làm mới và xem danh sách đã lưu khi mất mạng (Workbox).

### 3. Thu Thập Tin Đa Kênh & Khử Trùng Lặp Thông Minh
- Nhiều cổng nhập tin: Dán nhanh Portal Web, Chrome Extension, Webhook (WhatsApp/bot), Telegram Bot chuyển tiếp bài, và **Userbot Telegram MTProto cá nhân** (đăng nhập QR / OTP + 2FA, quét lịch sử theo tài khoản mục tiêu và lắng nghe thời gian thực).
- **Gemini AI Parser:** Chuẩn hóa tin tiếng Việt & tiếng Anh thành dữ liệu có cấu trúc (giá VNĐ/USD, loại căn, phòng ngủ, tiện ích Đà Nẵng, khu vực/phường/quận, tách số nhà và tên đường).
- **Khử trùng đa tầng (`DedupService` & `similar-apartment`):**
  1. SĐT chủ nhà + quận + tên đường chuẩn hóa.
  2. Bộ 3 tương đồng (tên đường + khoảng giá `± 5%` + loại căn/phòng ngủ).
  3. Thị giác máy tính **pHash dHash 64-bit (`sharp`)** đối chiếu 1-1 trên ảnh phòng.

### 4. Tìm Kiếm Thông Minh & Bản Đồ Địa Không Gian Đà Nẵng
- **Tìm kiếm kép:** MongoDB Atlas Search (`$search`) kết hợp fallback từ điển tiếng lóng BĐS (`ccmn`, `1n1k`, không dấu) và tìm câu tự nhiên bằng AI (`"studio Hải Châu dưới 6tr"`).
- **Bản đồ tương tác (Leaflet + CARTO / OSM):** Bong bóng giá, tản ghim xoắn ốc (`spiderfy`) khi trùng tọa độ, lọc theo khung nhìn (`bbox`), bán kính điểm mốc và lớp tiện ích Đà Nẵng.
- **Giải mã Google Maps & Chuẩn hóa tọa độ:** Hỗ trợ link rút gọn (`maps.app.goo.gl`), tọa độ `!3d/!4d`, Plus Code, ghim chọn vị trí trên form (`LocationPicker`) và màn hình **Rà soát bản đồ (Map QA)** cho Admin/Quản lý.
- **Công cụ môi giới thực chiến:** Lập lộ trình dẫn khách tối đa 4 căn bằng Google Maps xe máy, bảng so sánh 2–3 căn (VI/EN) kèm bộ ước tính chi phí sinh hoạt hàng tháng.

### 5. Chia Sẻ Khách Hàng, Mini-CRM & Chatbot AI
- **Trang xem phòng công khai (`/p/:slug`):** Giao diện song ngữ Việt/Anh tự động tạo link riêng cho từng CTV, ẩn thông tin chủ nhà, tính khoảng cách bãi biển, tích hợp **Trợ lý AI Auto-Chat** tự gợi ý căn tương tự và đồng bộ khách hàng vào CRM.
- **Đăng bài đa kênh:** Sao chép bài mẫu 10 dòng chuẩn hóa, **Zalo Studio** (Spintax chống trùng lặp), **WhatsApp Expat** tiếng Anh và tải ảnh có đóng watermark SĐT CTV.
- **Mini-CRM & Kiểm duyệt:** Phễu khách hàng Kanban 5 giai đoạn + **ghép căn tự động (`Reverse Lead Matching`)**; quy trình CTV đăng tin chờ duyệt; CTV báo lỗi tin & tính điểm tín nhiệm.

### 6. Bảng Điều Khiển Quản Trị (`/admin`)
- Thống kê Dashboard KPI kho hàng, hiệu suất CTV (xuất CSV), quản lý thành viên & hồ sơ 360°.
- Nhật ký hoạt động (`AuditLog`) kèm diff trước/sau & xuất CSV, cảnh báo bảo mật bất thường.
- Thùng rác khôi phục trong 30 ngày, xử lý kho tồn lâu không cập nhật, cấu hình hệ thống, thông báo chung toàn đội và giám sát **Sức khỏe & Hạn mức** các dịch vụ (`MongoDB`, `Gemini`, `Cloudinary`, `Telegram`, `Nominatim`, `CARTO`).

---

## Công Nghệ Sử Dụng

| Lớp | Công nghệ |
|---|---|
| **Runtime & Ngôn ngữ** | Node.js `>= 22.2`, TypeScript `5.7`, ESM (`"type": "module"`) |
| **Backend** | Express `4`, MongoDB + Mongoose `8`, Zod `4`, JWT (`jsonwebtoken`), `bcryptjs`, Multer, Sharp `0.35`, Cloudinary SDK, GramJS (`telegram`) |
| **Frontend** | React `18`, TypeScript, Vite `6`, React Router `7`, Tailwind CSS `3`, Axios, Leaflet, Lucide React, `qrcode`, `vite-plugin-pwa` (Workbox) |
| **AI & Bản đồ** | Google Gemini API (`gemini-3.5-flash-lite` / fallback `gemini-3.5-flash`), OpenStreetMap Nominatim, CARTO Basemaps |
| **Kiểm thử & Build** | Vitest `3`, `tsx`, Docker (multi-stage Nginx + Node) |

---

## Cấu Trúc Thư Mục

```text
AppartmentSaleProject/
├── backend/
│   ├── src/
│   │   ├── config/          # Nạp .env, kết nối MongoDB, Cloudinary, tỷ giá USD/VND
│   │   ├── middlewares/     # Auth JWT, RBAC, rate-limit, multer upload, webhook secret, error handler
│   │   ├── modules/
│   │   │   ├── admin/       # Dashboard stats, hiệu suất CTV, cấu hình hệ thống
│   │   │   ├── announcements/ # Thông báo chung ghim đầu Bảng hàng
│   │   │   ├── apartments/  # CRUD căn hộ, hợp đồng thuê, thùng rác, kho tồn, Map QA
│   │   │   ├── audit/       # Nhật ký hoạt động & xuất CSV
│   │   │   ├── auth/        # Đăng nhập, đăng ký, JWT/Refresh token, đổi mật khẩu
│   │   │   ├── chat/        # Chatbot AI trang công khai & đồng bộ Lead
│   │   │   ├── dedup/       # Chuẩn hóa tên đường, pHash ảnh, bộ 3 khử trùng
│   │   │   ├── health/      # Kiểm tra sức khỏe & hạn mức dịch vụ ngoài
│   │   │   ├── ingestion/   # Gemini parser/vision, Telegram Bot & Userbot MTProto
│   │   │   ├── jobs/        # Tác vụ hằng ngày (dọn rác, dọn media, nhắc hạn hợp đồng)
│   │   │   ├── leads/       # CRM khách hàng & Reverse Lead Matching
│   │   │   ├── notifications/ # Thông báo in-app + đẩy qua Telegram
│   │   │   ├── realtime/    # Event bus & Server-Sent Events (SSE)
│   │   │   ├── reports/     # CTV báo lỗi tin & hàng đợi kiểm duyệt
│   │   │   ├── search/      # Atlas Search, từ điển tiếng lóng, NLP, geocoding, map-pins
│   │   │   ├── security/    # Cảnh báo bảo mật theo quy tắc hành vi
│   │   │   ├── share/       # Link chia sẻ công khai & chuyển đổi dữ liệu public
│   │   │   ├── submissions/ # Tin CTV đăng chờ Quản lý duyệt
│   │   │   └── users/       # Quản lý thành viên, hồ sơ 360°, phiên thiết bị
│   │   ├── scripts/         # Script quản trị (promote-admin, backfill-zone-type, geocode-streets...)
│   │   ├── utils/           # Crypto AES-256-GCM, Google Maps resolver, phone/street/CSV helpers
│   │   ├── app.ts           # Cấu hình Express, CORS, gắn toàn bộ routes /api/v1/*
│   │   └── server.ts        # Khởi động HTTP server, MongoDB, Telegram Bot/Userbot & graceful shutdown
│   ├── tests/               # Unit tests (Vitest)
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── public/              # PWA icons, _headers (CSP/cache), _redirects (Netlify), host-badge.js
│   ├── src/
│   │   ├── api/             # Axios client (cookie + body token transport), SSE stream, API modules
│   │   ├── components/      # UI primitives, admin, apartment, leads, map, profile, public, tour...
│   │   ├── hooks/           # Search, map pins, realtime, PWA install, gestures, paged list
│   │   ├── pages/           # Login, Apartments, Leads, Submissions, PublicListing, Admin pages...
│   │   ├── utils/           # Zalo/WhatsApp/Share formatters, spintax, map cluster, tour route, zip...
│   │   └── App.tsx          # Định tuyến & lazy-loading theo trang
│   ├── tests/               # Unit tests (Vitest)
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.ts       # Cấu hình Vite dev proxy (/api -> :5000) & PWA Workbox
│   └── package.json
├── docs/
│   ├── stories/             # Tài liệu Roadmap, Epics (01–19) & Cover Epic (CE-01..CE-03)
│   ├── ATLAS_SEARCH_INDEX.md
│   └── DEPLOY_RENDER_NETLIFY.md
├── .env.example             # Mẫu biến môi trường cho Backend (và ghi chú biến VITE_*)
├── EXTERNAL_CONFIG.md       # Hướng dẫn lấy key MongoDB, Cloudinary, Gemini, Telegram, CARTO
├── WORKING_RULES.md         # Quy chuẩn phát triển & kiểm soát Git của dự án
├── docker-compose.yml       # Môi trường production local (Nginx + API + MongoDB 7)
├── netlify.toml             # Cấu hình build Netlify
└── render.yaml              # Render Blueprint cho Backend
```

---

## Yêu Cầu Hệ Thống

- **Node.js `>= 22.2`** (Backend sử dụng `process.loadEnvFile` tích hợp sẵn của Node)
- **npm**
- **MongoDB Atlas** (hoặc MongoDB local / Docker)
- Khuyến nghị có tài khoản miễn phí: **Cloudinary**, **Google AI Studio (Gemini)**, **Telegram BotFather** / **my.telegram.org**, **CARTO**.

---

## Cài Đặt & Chạy Local

### Bước 1: Cài đặt thư viện cho cả Backend và Frontend

```bash
cd backend && npm install
cd ../frontend && npm install
```

### Bước 2: Cấu hình biến môi trường

1. Tạo file `.env` ở **thư mục gốc dự án** (hoặc `backend/.env`) từ mẫu `.env.example`:
   ```bash
   cp .env.example .env
   ```
   > Backend nạp lần lượt `../.env` rồi `.env` tính từ thư mục `backend/` (`backend/src/config/env.ts`). Bắt buộc phải có `MONGODB_URI` và `JWT_SECRET` thì server mới khởi động.
2. *(Tùy chọn cho Frontend)* Nếu muốn dùng key bản đồ CARTO hoặc trỏ API tới server khác khi phát triển local, tạo file `frontend/.env.local`:
   ```env
   VITE_MAP_TILE_URL=https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=YOUR_CARTO_KEY
   ```
   *(Lưu ý: Vite chỉ đọc biến `VITE_*` trong thư mục `frontend/`, không đọc `.env` ở gốc repo.)*

### Bước 3: Chạy môi trường phát triển

Mở 2 terminal:

- **Terminal 1 — Backend** (`http://localhost:5000`, health check tại `/api/v1/health`):
  ```bash
  cd backend
  npm run dev
  ```
- **Terminal 2 — Frontend** (`http://localhost:5173`, tự proxy `/api/*` sang `http://localhost:5000`):
  ```bash
  cd frontend
  npm run dev
  ```

### Bước 4: Tạo tài khoản Admin đầu tiên

API đăng ký công khai không cho phép tự chọn vai trò `ADMIN`. Sau khi đăng ký một tài khoản qua giao diện `/login` (hoặc API `/api/v1/auth/register`), chạy lệnh sau để nâng quyền lên Admin:

```bash
cd backend
npm run promote-admin -- 09xxxxxxxx
```

---

## Chạy Với Docker Compose

Dự án có sẵn [`docker-compose.yml`](docker-compose.yml) mô phỏng kiến trúc production (Nginx → Node API → MongoDB 7 trong mạng container riêng `roommaster`):

```bash
# Đảm bảo đã có file .env ở thư mục gốc (chứa JWT_SECRET, GEMINI_API_KEY, CLOUDINARY_...)
docker compose up -d --build
```

- Giao diện truy cập tại: `http://localhost:8088`
- MongoDB local của Docker mở tại: `127.0.0.1:27018`
- Tạo Admin trong Docker:
  ```bash
  docker compose exec api node dist/scripts/promote-admin.js 09xxxxxxxx
  ```
- Xem log API: `docker compose logs -f api`
- Dừng container (giữ dữ liệu): `docker compose stop`

*(Mặc định trong `docker-compose.yml`, `TELEGRAM_BOT_TOKEN` được để rỗng để tránh xung đột `409 Conflict` với bot đang chạy ở dev/production.)*

---

## Biến Môi Trường Quan Trọng

Xem chú thích chi tiết từng biến trong [`.env.example`](.env.example) và hướng dẫn lấy API Key tại [`EXTERNAL_CONFIG.md`](EXTERNAL_CONFIG.md).

| Biến | Nơi cấu hình | Bắt buộc | Mô tả |
|---|---|---|---|
| `MONGODB_URI` | Backend `.env` | Có | Chuỗi kết nối MongoDB / MongoDB Atlas |
| `JWT_SECRET` | Backend `.env` | Có | Khóa ký JWT và tham gia dẫn xuất khóa mã hóa |
| `CLIENT_URL` | Backend `.env` | Khuyến nghị | URL Frontend chính để cấu hình CORS và tạo link `/p/:slug` |
| `CORS_ORIGINS` | Backend `.env` | Tùy chọn | Danh sách domain bổ sung gọi thẳng API (VD Cloudflare Pages), cách nhau dấu phẩy |
| `TRUST_PROXY` | Backend `.env` | Khi deploy | Số tầng proxy (`2` cho Netlify → Render, `1` cho Nginx → Node) |
| `GEMINI_API_KEY` | Backend `.env` | Cho tính năng AI | Parse tin đăng, Vision lọc ảnh có SĐT, Auto-Chat & Natural Search |
| `GEMINI_MODEL` / `GEMINI_FALLBACK_MODEL` | Backend `.env` | Tùy chọn | Mặc định `gemini-3.5-flash-lite` và dự phòng `gemini-3.5-flash` |
| `USD_VND_RATE` | Backend `.env` | Tùy chọn | Tỷ giá quy đổi mặc định khi tin chỉ ghi USD (mặc định `25000`) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Backend `.env` | Khuyến nghị | Lưu ảnh/video CDN, tải chữ ký trực tiếp và watermark SĐT |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_SOURCE_CHAT_IDS` | Backend `.env` | Tùy chọn | Bật Bot cào nhóm, chuyển tiếp bài & gửi thông báo |
| `TELEGRAM_API_ID`, `TELEGRAM_API_HASH` | Backend `.env` | Cho Userbot | Kết nối tài khoản Telegram cá nhân cào nhóm kín/công khai (MTProto) |
| `INGESTION_WEBHOOK_SECRET` | Backend `.env` | Tùy chọn | Khóa xác thực header `x-webhook-secret` cho webhook/extension công khai |
| `NOMINATIM_USER_AGENT`, `ATLAS_STORAGE_LIMIT_MB` | Backend `.env` | Tùy chọn | Định danh khi geocode OSM Nominatim & ngưỡng % dung lượng Atlas (mặc định `512`) |
| `VITE_MAP_TILE_URL` | Frontend `.env.local` | Tùy chọn | URL tile bản đồ CARTO (không khai báo sẽ dùng OpenStreetMap chuẩn) |
| `VITE_API_URL` | Frontend build env | Khi gọi thẳng BE | Đặt URL Backend (VD trên Cloudflare Pages); bỏ trống nếu dùng proxy `/api` |

---

## Các Lệnh Hữu Ích & Kiểm Thử

### Backend (`cd backend`)
```bash
npm run dev                     # Chạy dev server với tsx watch (cổng 5000)
npm run build                   # Biên dịch TypeScript ra dist/
npm start                       # Chạy bản build node dist/server.js
npm test                        # Chạy unit tests (Vitest)
npx tsc --noEmit                # Kiểm tra kiểu TypeScript

# Scripts vận hành dữ liệu (chạy thử trước, thêm -- --apply để ghi DB)
npm run promote-admin -- <SĐT>
npm run backfill-zone-type      # Gán zone & propertyType cho căn cũ
npm run normalize-owner-phones  # Chuẩn hóa SĐT chủ nhà về dạng 0xxxxxxxxx
npm run geocode-streets         # Định vị tọa độ theo tên đường qua Nominatim
```

### Frontend (`cd frontend`)
```bash
npm run dev                     # Chạy Vite dev server (cổng 5173)
npm run build                   # Kiểm tra TypeScript + đóng gói production + PWA
npm run preview                 # Xem trước bản build trong dist/
npm test                        # Chạy unit tests (Vitest)
npx tsc --noEmit                # Kiểm tra kiểu TypeScript
```

---

## Triển Khai (Deploy)

Hệ thống hỗ trợ triển khai chi phí **0đ**:
- **Backend trên Render:** Khai báo Blueprint tại [`render.yaml`](render.yaml) (Docker, region Singapore, health check `/api/v1/health`, `buildFilter` chỉ rebuild khi `backend/**` thay đổi).
- **Frontend trên Netlify:** Khai báo tại [`netlify.toml`](netlify.toml) và [`frontend/public/_redirects`](frontend/public/_redirects) (chuyển tiếp `/api/*` sang Render để giữ cùng tên miền cho cookie).
- **Frontend trên Cloudflare Pages (song song):** Khai báo `VITE_API_URL` trỏ thẳng về Backend Render và bổ sung domain vào `CORS_ORIGINS`; xem chi tiết tại mục `6.2b` của [`EXTERNAL_CONFIG.md`](EXTERNAL_CONFIG.md).

Hướng dẫn đầy đủ từng bước xem tại [`docs/DEPLOY_RENDER_NETLIFY.md`](docs/DEPLOY_RENDER_NETLIFY.md).

---

## Tài Liệu Tham Khảo

- [`EXTERNAL_CONFIG.md`](EXTERNAL_CONFIG.md) — Hướng dẫn đăng ký và cấu hình dịch vụ ngoài theo từng Epic
- [`WORKING_RULES.md`](WORKING_RULES.md) — Quy chuẩn làm việc, kiến trúc mã nguồn và quy tắc Git
- [`docs/DEPLOY_RENDER_NETLIFY.md`](docs/DEPLOY_RENDER_NETLIFY.md) — Quy trình deploy chi tiết lên Render & Netlify
- [`docs/ATLAS_SEARCH_INDEX.md`](docs/ATLAS_SEARCH_INDEX.md) — Cấu hình MongoDB Atlas Search Index (`lucene.vietnamese`)
- [`docs/stories/00_ROADMAP_OVERVIEW.md`](docs/stories/00_ROADMAP_OVERVIEW.md), [`docs/stories/EPIC_19_QA_AUDIT_FIXES.md`](docs/stories/EPIC_19_QA_AUDIT_FIXES.md) & [`docs/stories/coverEpic.md`](docs/stories/coverEpic.md) — Tổng quan lộ trình Epics và các tính năng/sửa lỗi bổ sung
