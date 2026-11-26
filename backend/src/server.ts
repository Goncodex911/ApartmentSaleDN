import './config/env.js'; // Nạp .env TRƯỚC mọi module khác (xem giải thích trong config/env.ts)
import { app } from './app.js';
import { connectDB } from './config/db.js';
import { TelegramService } from './modules/ingestion/telegram.service.js';
import { TelegramUserbotService } from './modules/ingestion/telegram-userbot.service.js';
import { TelegramHarvestService } from './modules/ingestion/telegram-harvest.service.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`[Server] Máy chủ đang chạy tại http://localhost:${PORT}`);
    // Khởi động bot Telegram nếu có token cấu hình
    TelegramService.start();
    // Story 19.2: bật lại bộ đón tin Telegram cá nhân đang bật trước khi máy chủ tắt (Render ngủ / deploy).
    // Chờ 45 giây: Render deploy chạy chồng bản cũ vài chục giây — 2 máy chủ cùng dùng 1 phiên Telegram dễ bị Telegram thu hồi phiên
    setTimeout(() => {
      TelegramHarvestService.resumeListeners().catch((err) => console.error('[Telegram] Không bật lại được bộ đón tin:', err?.message));
    }, 45_000).unref();
    // Dọn ảnh tin CTV (Story 8.6) + nhắc tái ký (Story 11.5) chạy theo ngày ở modules/jobs/daily-jobs.ts
  });

  // Xử lý tắt êm ái khi dừng server
  const shutdown = async () => {
    console.log('[Server] Đang dừng máy chủ...');
    TelegramService.stop();
    // Đóng kết nối Telegram cá nhân trước khi bản mới (deploy) mở lại bằng cùng phiên → tránh Telegram thu hồi phiên
    await TelegramUserbotService.disconnectAll();
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();

