# HƯỚNG DẪN DEPLOY MIỄN PHÍ: RENDER (Backend) + NETLIFY (Frontend)

> Chi phí: **0đ**. Thời gian lần đầu: khoảng **1,5–2 giờ**.
> Mọi lần cập nhật sau chỉ cần `git push` lên nhánh `main`: Render và Netlify tự build lại.

---

## 0. Kiến trúc & giới hạn cần biết

```
Khách / CTV ──HTTPS──► https://<ten-site>.netlify.app        (Netlify – miễn phí)
                          ├─ /, /leads, /p/...  → giao diện React (SPA)
                          └─ /api/*  ──chuyển tiếp──► https://<ten-service>.onrender.com   (Render – miễn phí, Docker)
                                                          ├─ MongoDB Atlas M0 (miễn phí)
                                                          ├─ Cloudinary · Gemini (miễn phí)
                                                          └─ Bot Telegram (long polling)
UptimeRobot (miễn phí) ── gọi /api/v1/health mỗi 5 phút ──► giữ Render không "ngủ"
```

| Giới hạn gói miễn phí | Ảnh hưởng | Cách xử lý đã chuẩn bị |
|---|---|---|
| Render **ngủ sau ~15 phút** không có request | Bot Telegram ngừng nhận tin; request đầu tiên chờ ~1 phút | UptimeRobot gọi 5 phút/lần (Bước 7) |
| Render **750 giờ/tháng** | Đủ cho đúng **1** service chạy 24/7 | Không tạo thêm service miễn phí nào khác |
| Render **512MB RAM** | Tạo ZIP nhiều ảnh dễ tràn bộ nhớ | Code đã xử lý ảnh theo lô 3 ảnh + tắt cache `sharp` |
| Netlify proxy có **giới hạn thời gian chờ** | Tải ZIP căn có rất nhiều ảnh có thể quá thời gian | Trên điện thoại dùng tải từng ảnh (không qua ZIP) |
| Gemini miễn phí giới hạn lượt gọi | Vượt hạn mức → chat AI trả câu dự phòng | Hệ thống không sập; theo dõi quota ở Google AI Studio |

> ⚠️ Chính sách gói miễn phí có thể thay đổi — kiểm tra lại trang giá Render/Netlify khi đăng ký.
> ⚠️ Gemini gói miễn phí có thể dùng dữ liệu gửi lên để cải thiện sản phẩm (tin chat có tên/SĐT khách, tin đăng có SĐT chủ nhà). Cân nhắc gói trả phí khi chạy thật.

---

## 1. Chuẩn bị tài khoản (miễn phí)

- [ ] **GitHub**: repo `Goncodex911/ApartmentSaleDN` (đã có).
- [ ] **Render**: https://render.com → *Sign up with GitHub*.
- [ ] **Netlify**: https://app.netlify.com → *Sign up with GitHub*.
- [ ] **UptimeRobot**: https://uptimerobot.com (đăng ký bằng email).
- [ ] MongoDB Atlas, Cloudinary, Gemini API key, Telegram bot token: dùng lại tài khoản đang có.

## 2. Đưa code lên nhánh `main`

Render và Netlify build tự động từ nhánh `main`. Mọi thay đổi (tính năng hoặc cấu hình deploy) làm ở nhánh riêng, sau đó merge vào `main` qua Pull Request. Merge xong là tự deploy.

## 3. Tạo secret MỚI cho môi trường thật

> Nếu deploy Render bằng **Blueprint** (mục 5, cách A): bỏ qua bước này, vì Render **tự sinh** `JWT_SECRET` và `INGESTION_WEBHOOK_SECRET` ngẫu nhiên. Khi cần xem lại, vào tab *Environment* của service.

Nếu tạo service thủ công (mục 5, cách B): không dùng lại secret của máy dev. Chạy trên máy bạn rồi lưu kết quả vào chỗ an toàn (VD: trình quản lý mật khẩu):

```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(48).toString('hex'))"
node -e "console.log('INGESTION_WEBHOOK_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

## 4. MongoDB Atlas: cho phép Render kết nối

Làm bước này **trước** khi deploy Render. Nếu không kết nối được DB, server sẽ tự dừng.

1. Atlas → **Database Access** → *Add New Database User*: tạo user riêng cho môi trường thật, mật khẩu dài ngẫu nhiên, quyền **Read and write to any database** (hoặc chỉ `apartment_sale`).
2. Atlas → **Network Access** → *Add IP Address*:
   - **Cách an toàn hơn:** sau khi tạo service ở Bước 5, vào Render → service → tab **Connect** → **Outbound**, copy các dải IP rồi thêm vào Atlas.
   - **Cách nhanh:** thêm `0.0.0.0/0` (cho phép mọi IP). Chỉ dùng cách này khi mật khẩu DB đủ mạnh.
3. Copy chuỗi kết nối (*Connect → Drivers*) với user vừa tạo, đây là giá trị `MONGODB_URI`.

## 5. Deploy Backend lên Render

### Cách A: Blueprint (khuyên dùng, cấu hình có sẵn trong `render.yaml`)

1. Render Dashboard → **New +** → **Blueprint** → chọn repo `ApartmentSaleDN` → nhánh `main`.
2. Render đọc `render.yaml` và hiện service `roommaster-api` (Docker, Singapore, gói Free, health check `/api/v1/health`).
3. Điền các biến Render yêu cầu (đây là các biến khai báo `sync: false`, không lưu trong Git):
   `CLIENT_URL` (tạm để `https://example.netlify.app`, sửa ở mục 7), `MONGODB_URI`, `GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_SOURCE_CHAT_IDS` (có thể để trống), `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
   `NODE_ENV`, `TRUST_PROXY`, `JWT_SECRET`, `INGESTION_WEBHOOK_SECRET` đã được khai báo hoặc tự sinh sẵn.
4. Bấm **Apply**, chờ build khoảng 5–10 phút, rồi làm tiếp bước 5 của cách B bên dưới (kiểm tra `/api/v1/health`).
5. **Ghi lại URL thật** của service (VD `https://roommaster-api.onrender.com`; nếu tên đã có người dùng, Render sẽ thêm hậu tố) để dùng ở mục 6.

> `render.yaml` có `buildFilter` → Render chỉ build lại khi thư mục `backend/` thay đổi. Sửa giao diện không làm restart bot Telegram.

### Cách B: Tạo thủ công

1. Render Dashboard → **New +** → **Web Service** → chọn repo `ApartmentSaleDN`.
2. Điền:

   | Mục | Giá trị |
   |---|---|
   | Name | VD `roommaster-api` → URL sẽ là `https://roommaster-api.onrender.com` (**ghi lại**; nếu tên đã có người dùng, Render thêm hậu tố, hãy lấy đúng URL Render hiển thị) |
   | Region | **Singapore** (gần Việt Nam nhất) |
   | Branch | `main` |
   | Root Directory | `backend` |
   | Runtime / Language | **Docker** (Render tự dùng `backend/Dockerfile`) |
   | Instance Type | **Free** |
   | Health Check Path | `/api/v1/health` |

3. **Environment Variables**: thêm các biến dưới đây. **Không** khai báo `PORT`, Render tự cấp.

   | Biến | Giá trị |
   |---|---|
   | `NODE_ENV` | `production` |
   | `TRUST_PROXY` | `2` (Netlify → Render = 2 tầng proxy) |
   | `CLIENT_URL` | Tạm để `https://example.netlify.app`, sửa lại ở Bước 7 |
   | `MONGODB_URI` | Chuỗi kết nối ở Bước 4 |
   | `JWT_SECRET` | Secret mới ở Bước 3 |
   | `INGESTION_WEBHOOK_SECRET` | Secret mới ở Bước 3 |
   | `GEMINI_API_KEY` | API key Gemini |
   | `TELEGRAM_BOT_TOKEN` | Token bot (xem lưu ý ở Bước 9) |
   | `TELEGRAM_SOURCE_CHAT_IDS` | Chat ID các nhóm nguồn, cách nhau dấu phẩy (có thể điền sau) |
   | `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Như file `.env` của bạn |

4. Bấm **Create Web Service**, chờ build khoảng 5–10 phút. Log thành công sẽ có dòng `[MongoDB] Kết nối thành công...`.
5. Kiểm tra: mở `https://<ten-service>.onrender.com/api/v1/health`, phải thấy `{"status":"OK",...}`.

## 6. Deploy Frontend lên Netlify

Cấu hình build nằm sẵn trong code, **không cần chỉnh trong giao diện Netlify**:
- `netlify.toml` ở **gốc repo**: build trong thư mục `frontend` (`base`), publish `frontend/dist`, Node 22.
- `frontend/public/_redirects`: chuyển tiếp `/api/*` sang Render và cho SPA mở trực tiếp được các trang. Nếu tạo lại service Render, sửa URL trong file này rồi merge vào `main`.

1. Netlify → **Add new site** → **Import an existing project** → GitHub → chọn repo → nhánh `main`.
2. **Để trống** Base directory, Build command, Publish directory: Netlify tự đọc từ `netlify.toml` ở gốc repo.
3. Bấm **Deploy**, chờ khoảng 1–2 phút. Build đúng sẽ chỉ tải lên **khoảng 4 file** (`index.html`, `_redirects`, 2 file trong `assets/`). Nếu thấy hơn 100 file, tức là đang đưa cả repo lên: kiểm tra lại `netlify.toml` ở gốc repo.
4. **Project configuration → General → Change project name**: đặt tên dễ nhớ, VD `roommaster` → `https://roommaster.netlify.app`.

## 7. Nối Frontend ↔ Backend

1. Render → service → **Environment** → sửa `CLIENT_URL` = URL Netlify ở Bước 6 (VD `https://roommaster.netlify.app`, **không** có dấu `/` ở cuối) → **Save** (Render tự deploy lại).
2. Mở `https://roommaster.netlify.app/api/v1/health`, phải thấy `{"status":"OK"}`. Như vậy là việc chuyển tiếp `/api` sang Render đã hoạt động.

## 8. Giữ Backend luôn thức (UptimeRobot)

1. UptimeRobot → **Add New Monitor** → loại **HTTP(s)**.
2. URL: `https://<ten-service>.onrender.com/api/v1/health`, Interval: **5 minutes**.
3. (Tùy chọn) Thêm cảnh báo qua email hoặc Telegram khi server ngừng hoạt động.

## 9. Telegram Bot

1. @BotFather → `/setprivacy` → chọn bot → **Disable**. Nếu không tắt, bot không đọc được tin thường trong nhóm.
2. Thêm bot vào các nhóm nguồn, gửi 1 tin, rồi mở `https://api.telegram.org/bot<TOKEN>/getUpdates` để lấy `"chat":{"id":-100...}`. Điền các ID này vào `TELEGRAM_SOURCE_CHAT_IDS` trên Render.
3. ⚠️ **Mỗi bot token chỉ được 1 server đọc tin cùng lúc.** Khi production đã chạy, **xóa `TELEGRAM_BOT_TOKEN` khỏi `.env` trên máy dev**, hoặc tạo một bot riêng cho dev. Nếu không, 2 server sẽ tranh nhau nhận tin (lỗi 409) và tin bị chia mỗi nơi một nửa.

## 10. Tạo tài khoản ADMIN đầu tiên

Gói miễn phí của Render không có Shell, nên chạy script **từ máy bạn**, kết nối thẳng vào cùng DB Atlas:

1. Đăng ký tài khoản trên `https://roommaster.netlify.app`.
2. Trên máy bạn: tạm thời đặt `MONGODB_URI` trong file `.env` ở máy thành chuỗi kết nối của DB production (IP máy bạn cũng phải được phép trong Atlas Network Access), sau đó chạy:
   ```bash
   cd backend
   npm run promote-admin -- 09xxxxxxxx
   ```
3. Trả `MONGODB_URI` trên máy về giá trị cũ. Đăng nhập lại web: thanh điều hướng có thêm nút **"Duyệt tài khoản"**.

## 11. Kiểm tra sau deploy (Smoke test)

| # | Thao tác | Kết quả mong đợi |
|---|---|---|
| 1 | Đăng ký CTV → đăng nhập | Vào được Bảng hàng |
| 2 | Đăng ký Quản lý → ADMIN duyệt → Quản lý đăng nhập | Trước khi duyệt bị báo "chờ duyệt" |
| 3 | Quản lý thêm căn có ảnh. CTV mở căn đó | SĐT chủ nhà bị che `0912***` |
| 4 | Trên điện thoại: **Copy tin gửi khách**, dán vào Zalo | Đúng mẫu, có SĐT của CTV |
| 5 | **Tải toàn bộ ảnh** trên điện thoại | Ảnh có chữ `Tel/Zalo: ...` ở góc |
| 6 | **Tạo link xem phòng** → mở ở cửa sổ ẩn danh | Trang xem phòng hiện ra, số lượt xem tăng |
| 7 | Chat với trợ lý AI trên trang xem phòng, để lại SĐT | AI trả lời, khách hiện ở menu **Khách hàng**, chuông báo |
| 8 | Hồ sơ → **Liên kết Telegram** → bấm Start | Bot báo "Đã liên kết"; lần chat sau nhận tin Telegram |
| 9 | Gửi album 3 ảnh vào nhóm nguồn | Căn mới có đủ 3 ảnh |
| 10 | 2 điện thoại khác mạng (Wi-Fi & 4G) cùng chat nhanh | Mỗi máy bị giới hạn riêng → `TRUST_PROXY=2` đúng |
| 11 | Để quá 1 giờ rồi thao tác tiếp | Không bị đá ra trang đăng nhập (tự refresh token) |

## 12. Cập nhật phiên bản sau này

Làm trên nhánh riêng → push → tạo Pull Request vào `main` → merge. Render (nếu `backend/` đổi) và Netlify tự build và deploy lại. Muốn quay lại bản cũ: Render → **Deploys** → chọn bản cũ → *Rollback*; Netlify → **Deploys** → chọn bản cũ → *Publish deploy*.

## 13. Sao lưu dữ liệu (Atlas M0 không tự sao lưu)

Mỗi tuần chạy trên máy bạn (cần cài [MongoDB Database Tools](https://www.mongodb.com/try/download/database-tools)):
```bash
mongodump --uri="<MONGODB_URI production>" --archive=backup-$(date +%F).gz --gzip
```
Lưu file sao lưu lên Google Drive và giữ ít nhất 4 bản gần nhất. Ảnh đã nằm an toàn trên Cloudinary.

## 14. Chạy thử bản production trên máy (Docker, trước khi deploy)

File `docker-compose.yml` ở thư mục gốc tạo một môi trường **riêng tên `roommaster`**, tách biệt với mọi project Docker khác trên máy. Kiến trúc giống production: Nginx → API → MongoDB.

| Đặc điểm | Chi tiết |
|---|---|
| Container | `roommaster-web` (cổng **8088**), `roommaster-api` (không mở cổng ra ngoài), `roommaster-mongo` (`127.0.0.1:27018`, để xem bằng Compass) |
| Dữ liệu | MongoDB **riêng** trong volume `roommaster_mongo-data`, không đụng Atlas |
| Tự khởi động | **Không** (`restart: "no"`), mở Docker Desktop không tự chạy |
| Bot Telegram | **Tắt**, tránh tranh nhận tin với máy dev hoặc production |
| Biến môi trường | Lấy từ `.env` gốc (Gemini, Cloudinary, JWT_SECRET...), không đóng gói vào image |

```bash
docker compose up -d --build                                          # build & chạy → http://localhost:8088
docker compose exec api node dist/scripts/promote-admin.js 09xxxxxxxx # tạo ADMIN cho môi trường này
docker compose logs -f api                                            # xem log
docker compose stop                                                   # dừng (giữ dữ liệu)
docker compose down -v                                                # xóa hết, kể cả dữ liệu MongoDB của môi trường này
```

## 15. Xử lý sự cố thường gặp

| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Web báo lỗi tải dữ liệu, mở `/api/v1/health` mất ~1 phút | Render vừa "ngủ dậy" | Kiểm tra UptimeRobot còn chạy |
| Render log: `Thiếu biến môi trường JWT_SECRET` | Chưa khai báo biến | Bổ sung ở tab Environment |
| Render log: lỗi kết nối MongoDB | Atlas chặn IP | Làm lại Bước 4 |
| Bot không nhận tin, log có `409` | 2 nơi dùng chung bot token | Xóa token khỏi `.env` máy dev (Bước 9) |
| Bot không đọc tin trong nhóm | Privacy mode đang bật | `/setprivacy` → Disable, rồi xóa bot khỏi nhóm và thêm lại |
| Ảnh tải về không có chữ watermark | Thiếu font | Đã cài sẵn trong Dockerfile. Nếu vẫn lỗi, xem log build Render |
| Render log: `out of memory` / service tự khởi động lại | Vượt 512MB | Hạn chế tải ZIP căn quá nhiều ảnh; cân nhắc gói trả phí |
| Mọi khách bị báo "gửi tin quá nhanh" cùng lúc | Sai `TRUST_PROXY` | Đặt đúng `2` |
| Đăng nhập xong bị đá ra liên tục | `CLIENT_URL` sai hoặc truy cập thẳng URL Render thay vì Netlify | Chỉ dùng URL Netlify; kiểm tra `CLIENT_URL` |
