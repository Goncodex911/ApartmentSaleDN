import dotenv from 'dotenv';
import path from 'path';

// Đọc file .env từ thư mục gốc hoặc thư mục hiện tại
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config(); // Fallback nếu chạy trực tiếp trong backend

import { app } from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[Server] Máy chủ đang chạy tại http://localhost:${PORT}`);
  });
}

startServer();

