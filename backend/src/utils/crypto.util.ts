import crypto from 'crypto';
import { JWT_SECRET } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
// Dẫn xuất khóa 32 bytes từ JWT_SECRET bằng scrypt chuẩn native
const DERIVED_KEY = crypto.scryptSync(JWT_SECRET, 'salt_telegram_userbot_session', 32);

/**
 * Mã hóa chuỗi sessionString Telegram bằng thuật toán AES-256-GCM
 */
export function encryptSession(plainText: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, DERIVED_KEY, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag,
  };
}

/**
 * Giải mã chuỗi sessionString Telegram
 */
export function decryptSession(encrypted: string, ivHex: string, tagHex: string): string {
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, DERIVED_KEY, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
