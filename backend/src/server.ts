import dotenv from 'dotenv';
import path from 'path';

// Đọc file .env từ thư mục gốc hoặc thư mục hiện tại
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config(); // Fallback nếu chạy trực tiếp trong backend

import { app } from './app.js';
import { connectDB } from './config/db.js';
import { TelegramService } from './modules/ingestion/telegram.service.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`[Server] Máy chủ đang chạy tại http://localhost:${PORT}`);
    // Khởi động bot Telegram nếu có token cấu hình
    TelegramService.start();
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

