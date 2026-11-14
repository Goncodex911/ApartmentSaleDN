import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  phone: string;
  email?: string;
  password: string;
  role: 'ADMIN' | 'MANAGER' | 'COLLABORATOR';
  ctvCode: string;
  status: 'ACTIVE' | 'PENDING' | 'BLOCKED'; // PENDING: Quản lý tự đăng ký, chờ ADMIN duyệt
  zaloPhone?: string;
  zaloLink?: string;
  avatarUrl?: string;
  greetingMessage?: string;
  comparePassword(candidate: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, index: true, trim: true },
    email: { type: String, trim: true, lowercase: true, sparse: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['ADMIN', 'MANAGER', 'COLLABORATOR'],
      default: 'COLLABORATOR',
    },
    ctvCode: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['ACTIVE', 'PENDING', 'BLOCKED'], default: 'ACTIVE', index: true },
    zaloPhone: { type: String, trim: true },
    zaloLink: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    greetingMessage: { type: String, trim: true, default: 'Xin chào, rất vui được hỗ trợ bạn tìm căn hộ ưng ý!' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete (ret as { password?: string }).password;
        return ret;
      },
    },
  }
);

// Tự động hash mật khẩu trước khi lưu (salt rounds = 10)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// So sánh mật khẩu
userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const User = model<IUser>('User', userSchema);

