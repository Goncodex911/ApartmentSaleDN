import './config/env.js'; // Nạp .env TRƯỚC mọi module khác (xem giải thích trong config/env.ts)
import { app } from './app.js';
import { connectDB } from './config/db.js';
import { TelegramService } from './modules/ingestion/telegram.service.js';
import { startSubmissionCleanup } from './modules/submissions/submission-cleanup.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`[Server] Máy chủ đang chạy tại http://localhost:${PORT}`);
    // Khởi động bot Telegram nếu có token cấu hình
    TelegramService.start();
    // Dọn ảnh tin CTV bị từ chối / rút quá 30 ngày (Story 8.6)
    startSubmissionCleanup();
  });

  // Xử lý tắt êm ái khi dừng server
  const shutdown = () => {
    console.log('[Server] Đang dừng máy chủ...');
    TelegramService.stop();
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();

