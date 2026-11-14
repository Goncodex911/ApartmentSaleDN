import '../config/env.js';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../modules/auth/user.model.js';

/**
 * Nâng một tài khoản ĐÃ ĐĂNG KÝ lên ADMIN (API không cho phép tự đăng ký ADMIN).
 * Dùng để tạo ADMIN đầu tiên — người duyệt các tài khoản Quản lý tự đăng ký.
 * Chạy: npm run promote-admin -- 0912345678
 */
const phone = process.argv[2]?.trim();
if (!phone) {
  console.error('Cách dùng: npm run promote-admin -- <SĐT đã đăng ký>');
  process.exit(1);
}

await connectDB();
const user = await User.findOneAndUpdate({ phone }, { role: 'ADMIN', status: 'ACTIVE' }, { new: true });
console.log(user ? `✅ ${user.name} (${user.phone}) đã được nâng lên ADMIN` : `❌ Không tìm thấy tài khoản có SĐT ${phone}`);
await mongoose.disconnect();
