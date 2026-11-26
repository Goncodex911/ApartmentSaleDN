import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface ITelegramUserbotSession {
  encryptedString: string;
  iv: string;
  tag: string;
  phone: string;
  telegramUserId?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  connectedAt: Date;
  isActive: boolean;
  listener?: { chat: string; targetSender: string }; // Bộ đón tin đang bật → máy chủ khởi động lại tự bật lại (Story 19.2)
}

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
  // Story 10.4: in vào bài gửi khách (dòng 9️⃣ / 🔟)
  paymentTerms?: string;
  zaloGroupLink?: string;
  whatsappGroupLink?: string;
  // Liên kết Telegram nhận thông báo khách mới / ghép căn (Story 6.2 - AC5)
  telegramChatId?: string;
  telegramLinkCode?: string;
  telegramLinkExpiresAt?: Date;
  // Story CE-01: Phiên kết nối Telegram MTProto cá nhân (Userbot cào tin & đón tin thời gian thực)
  telegramSession?: ITelegramUserbotSession;
  // Story 13.2: tăng khi khóa tài khoản / reset mật khẩu → mọi token cũ (kể cả refresh) mất hiệu lực
  tokenVersion: number;
  // Story 13.6: điểm tín nhiệm báo lỗi (+5 đúng, −5 sai); dưới −15 tự khóa quyền báo lỗi
  trustScore: number;
  canReport: boolean;
  mustChangePassword: boolean; // Story 13.9: vừa nhận mật khẩu tạm từ Admin → app nhắc đổi
  // Story 14.5: refresh token đang hiệu lực theo thiết bị (jti) — đăng xuất máy nào thu hồi phiên máy đó
  // Story 16.4: + thiết bị, IP gần nhất, lúc đăng nhập, lần dùng cuối (cập nhật khi xoay token, không phải mỗi request)
  refreshSessions: { jti: string; prevJti?: string; rotatedAt?: Date; expiresAt: Date; userAgent?: string; ip?: string; createdAt?: Date; lastUsedAt?: Date }[];
  // Story 16.3: lần đăng nhập bằng mật khẩu cuối / lần gọi API cuối (ghi tối đa 1 lần / 5 phút)
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  // Story 16.6: ghi chú nội bộ chỉ ADMIN thấy (ẩn khỏi toJSON — không lộ qua /auth/me, /users/profile)
  adminNotes: { _id: Types.ObjectId; text: string; authorId: Types.ObjectId; authorName: string; createdAt: Date }[];
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
    paymentTerms: { type: String, trim: true, default: 'deposit 1 month pay 1 month' },
    zaloGroupLink: { type: String, trim: true },
    whatsappGroupLink: { type: String, trim: true },
    telegramChatId: { type: String },
    telegramLinkCode: { type: String, index: { sparse: true } },
    telegramLinkExpiresAt: { type: Date },
    tokenVersion: { type: Number, default: 0 },
    trustScore: { type: Number, default: 0 },
    canReport: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    lastActiveAt: { type: Date, index: true },
    adminNotes: {
      type: [{ text: { type: String, required: true, maxlength: 500 }, authorId: { type: Schema.Types.ObjectId, required: true }, authorName: String, createdAt: { type: Date, default: Date.now } }],
      default: [],
    },
    refreshSessions: {
      type: [{ _id: false, jti: { type: String, required: true }, prevJti: String, rotatedAt: Date, expiresAt: { type: Date, required: true }, userAgent: String, ip: String, createdAt: Date, lastUsedAt: Date }],
      default: [],
    },
    telegramSession: {
      type: {
        encryptedString: { type: String, required: true },
        iv: { type: String, required: true },
        tag: { type: String, required: true },
        phone: { type: String, required: true },
        telegramUserId: String,
        firstName: String,
        lastName: String,
        username: String,
        connectedAt: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true },
        listener: { type: { chat: String, targetSender: String }, required: false },
      },
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete (ret as { password?: string }).password;
        delete (ret as { telegramLinkCode?: string }).telegramLinkCode;
        delete (ret as { refreshSessions?: unknown }).refreshSessions;
        delete (ret as { adminNotes?: unknown }).adminNotes;
        if ((ret as any).telegramSession) {
          delete (ret as any).telegramSession.encryptedString;
          delete (ret as any).telegramSession.iv;
          delete (ret as any).telegramSession.tag;
        }
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

