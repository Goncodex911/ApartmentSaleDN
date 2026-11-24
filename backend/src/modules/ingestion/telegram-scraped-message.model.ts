import { Schema, model } from 'mongoose';

/**
 * Bài Telegram đã đi qua bộ nạp (theo nhóm + ID tin đầu của bài/album).
 * Quét lại cùng nhóm sẽ bỏ qua các bài này → không tải lại ảnh, không tốn thêm lượt Gemini.
 * Tự xóa sau 90 ngày (TTL) để collection không phình mãi.
 */
const telegramScrapedMessageSchema = new Schema(
  {
    chatId: { type: String, required: true },
    messageId: { type: Number, required: true },
    at: { type: Date, default: Date.now },
  },
  { collection: 'telegram_scraped_messages', versionKey: false }
);
telegramScrapedMessageSchema.index({ chatId: 1, messageId: 1 }, { unique: true });
telegramScrapedMessageSchema.index({ at: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const TelegramScrapedMessage = model('TelegramScrapedMessage', telegramScrapedMessageSchema);

export async function findScrapedMessageIds(chatId: string, messageIds: number[]): Promise<Set<number>> {
  const docs = await TelegramScrapedMessage.find({ chatId, messageId: { $in: messageIds } }, { messageId: 1 }).lean();
  return new Set(docs.map((doc) => doc.messageId));
}

// Ghi nền — trùng khóa (đã có) thì bỏ qua
export function markMessageScraped(chatId: string, messageId: number) {
  TelegramScrapedMessage.updateOne({ chatId, messageId }, { $setOnInsert: { at: new Date() } }, { upsert: true }).catch(() => undefined);
}
