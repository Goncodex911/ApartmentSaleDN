// Story 16.8a: hướng dẫn thay key từng dịch vụ (rút gọn từ EXTERNAL_CONFIG.md) — viết sẵn, không đọc file .md lúc chạy
export type ServiceName = 'mongo' | 'gemini' | 'cloudinary' | 'telegram' | 'nominatim' | 'carto';

export const SERVICE_INFO: Record<ServiceName, { label: string; purpose: string; steps: string[]; dashboard?: string }> = {
  mongo: {
    label: 'MongoDB Atlas',
    purpose: 'Cơ sở dữ liệu — mất kết nối thì toàn bộ app ngừng',
    dashboard: 'https://cloud.mongodb.com',
    steps: ['Vào cloud.mongodb.com → Database → Connect → Drivers, sao chép chuỗi kết nối.', 'Database Access: kiểm tra user / mật khẩu còn hiệu lực; Network Access: cho phép IP của Render (0.0.0.0/0).', 'Render → service roommaster-api → Environment → sửa MONGODB_URI → Save (Render tự khởi động lại).'],
  },
  gemini: {
    label: 'Google Gemini',
    purpose: 'AI bóc tách tin đăng, nhận diện SĐT trong ảnh, trợ lý chat',
    dashboard: 'https://aistudio.google.com/apikey',
    steps: ['Vào aistudio.google.com → Get API key → Create API key.', 'Render → Environment → sửa GEMINI_API_KEY (và GEMINI_MODEL nếu đổi model) → Save.', 'Bị 429 thường xuyên: xem hạn mức model trong AI Studio, cân nhắc bật thanh toán hoặc đổi model.'],
  },
  cloudinary: {
    label: 'Cloudinary',
    purpose: 'Lưu ảnh / video căn hộ và tin CTV',
    dashboard: 'https://console.cloudinary.com',
    steps: ['Vào console.cloudinary.com → Settings → API Keys → tạo key mới.', 'Render → Environment → sửa CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET → Save.', 'Hết credits: dọn Thùng rác / ảnh cũ hoặc nâng gói trong mục Billing.'],
  },
  telegram: {
    label: 'Telegram Bot',
    purpose: 'Cào tin từ nhóm nguồn, gửi thông báo cho thành viên đã liên kết',
    dashboard: 'https://t.me/BotFather',
    steps: ['Mở @BotFather → /mybots → chọn bot → API Token (hoặc /revoke để cấp token mới nếu nghi lộ).', 'Render → Environment → sửa TELEGRAM_BOT_TOKEN → Save.', 'Bot bị kích khỏi nhóm nguồn: thêm lại bot vào nhóm, kiểm tra Chat ID trong Cấu hình.'],
  },
  nominatim: {
    label: 'OSM Nominatim',
    purpose: 'Tìm tọa độ theo tên đường (không cần key)',
    steps: ['Lỗi 403: OSM chặn vì thiếu định danh — Render → Environment → đặt NOMINATIM_USER_AGENT = "RoomMaster-Danang/1.0 (+https://apartmentsaledn.netlify.app)".', 'Lỗi 429: gọi quá 1 lần/giây — hệ thống tự xếp hàng và lưu kết quả, thường tự hết sau vài phút.'],
  },
  carto: {
    label: 'Bản đồ CARTO',
    purpose: 'Ảnh nền bản đồ trong app và trang gửi khách',
    dashboard: 'https://dashboard.basemaps.carto.com',
    steps: ['Vào dashboard.basemaps.carto.com → Your keys → tạo key mới, bật giới hạn website (apartmentsaledn.netlify.app).', 'Netlify → Environment variables → sửa VITE_MAP_TILE_URL (chỉ thay phần sau ?key=).', 'Netlify → Deploys → Trigger deploy (biến VITE_ chỉ có hiệu lực sau khi build lại).'],
  },
};
