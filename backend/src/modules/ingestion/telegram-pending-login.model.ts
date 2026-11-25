import { Schema, model } from 'mongoose';
import { encryptSession, decryptSession } from '../../utils/crypto.util.js';

/**
 * Story 18.2: lượt đăng nhập Telegram đang dở (đã gửi mã OTP / đang chờ quét QR).
 * Lưu phiên tạm của client đã gửi mã (mã OTP gắn với auth key của client này) — MÃ HÓA, TTL 10 phút, 1 bản ghi / người.
 * Render khởi động lại vẫn khôi phục được client để xác thực mã. Không bao giờ trả về trình duyệt.
 */
export interface PendingLogin {
  kind: 'OTP' | 'QR';
  session: string; // Chuỗi StringSession đã giải mã (chỉ dùng trong máy chủ)
  phone?: string;
  phoneCodeHash?: string;
  delivery?: Record<string, unknown>;
  startedAt: Date;
  expiresAt: Date;
}

const pendingLoginSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, unique: true },
    kind: { type: String, enum: ['OTP', 'QR'], required: true },
    encryptedSession: { type: String, required: true },
    iv: { type: String, required: true },
    tag: { type: String, required: true },
    phone: String,
    phoneCodeHash: String,
    delivery: Schema.Types.Mixed,
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { collection: 'telegram_pending_logins', versionKey: false }
);
pendingLoginSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TelegramPendingLogin = model('TelegramPendingLogin', pendingLoginSchema);

export async function savePendingLogin(userId: string, data: Omit<PendingLogin, 'startedAt'> & { startedAt?: Date }) {
  const { session, ...rest } = data;
  const { encrypted, iv, tag } = encryptSession(session);
  await TelegramPendingLogin.updateOne(
    { userId },
    { $set: { ...rest, encryptedSession: encrypted, iv, tag, startedAt: data.startedAt ?? new Date() } },
    { upsert: true }
  );
}

export async function loadPendingLogin(userId: string): Promise<PendingLogin | null> {
  const doc = await TelegramPendingLogin.findOne({ userId, expiresAt: { $gt: new Date() } }).lean();
  if (!doc) return null;
  return {
    kind: doc.kind as PendingLogin['kind'],
    session: decryptSession(doc.encryptedSession, doc.iv, doc.tag),
    phone: doc.phone ?? undefined,
    phoneCodeHash: doc.phoneCodeHash ?? undefined,
    delivery: (doc.delivery as Record<string, unknown>) ?? undefined,
    startedAt: doc.startedAt,
    expiresAt: doc.expiresAt,
  };
}

export const deletePendingLogin = (userId: string) => TelegramPendingLogin.deleteOne({ userId }).then(() => undefined);
