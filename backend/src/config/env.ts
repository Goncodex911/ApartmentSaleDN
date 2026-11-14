import path from 'path';

// PHẢI là import đầu tiên của server.ts. ESM chạy mọi import tĩnh TRƯỚC thân module,
// nên nếu nạp .env trong thân server.ts thì các module (auth, app...) đã đọc process.env rỗng từ trước.
// Dùng process.loadEnvFile có sẵn của Node (>= 21.7) thay cho package dotenv: cùng hành vi
// "không ghi đè biến đã có, file nạp trước được ưu tiên".
for (const envFile of [path.resolve(process.cwd(), '../.env'), path.resolve(process.cwd(), '.env')]) {
  try {
    process.loadEnvFile(envFile);
  } catch {
    // Không có file .env ở vị trí này (VD: chạy production với biến môi trường của hệ thống) → bỏ qua
  }
}

// Không có secret mặc định: thiếu JWT_SECRET thì dừng server ngay, tránh ký token bằng chuỗi ai cũng biết
if (!process.env.JWT_SECRET) {
  throw new Error('Thiếu biến môi trường JWT_SECRET trong .env — không thể khởi động server');
}

export const JWT_SECRET = process.env.JWT_SECRET;
