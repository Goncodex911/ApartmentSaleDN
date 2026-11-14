import { randomBytes } from 'node:crypto';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Mã ngẫu nhiên [a-z0-9] dùng crypto (không đoán được): link chia sẻ, phiên chat, mã liên kết Telegram. */
export const randomCode = (length: number) =>
  Array.from(randomBytes(length), (byte) => ALPHABET[byte % ALPHABET.length]).join('');
