import dotenv from 'dotenv';
import path from 'path';

// PHẢI là import đầu tiên của server.ts. ESM chạy mọi import tĩnh TRƯỚC thân module,
// nên nếu gọi dotenv.config() trong thân server.ts thì các module (auth, app...) đã đọc process.env rỗng từ trước.
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config(); // Fallback nếu chạy trực tiếp trong backend

// Không có secret mặc định: thiếu JWT_SECRET thì dừng server ngay, tránh ký token bằng chuỗi ai cũng biết
if (!process.env.JWT_SECRET) {
  throw new Error('Thiếu biến môi trường JWT_SECRET trong .env — không thể khởi động server');
}

export const JWT_SECRET = process.env.JWT_SECRET;
