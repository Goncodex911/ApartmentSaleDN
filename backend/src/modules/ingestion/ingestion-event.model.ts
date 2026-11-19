import { Schema, model } from 'mongoose';

/**
 * Story 13.1: mỗi tin đi qua bộ nhập tự động ghi 1 dòng → Dashboard đếm "24h qua".
 * Tự xóa sau 30 ngày (TTL). Chỉ có số liệu từ lúc triển khai trở đi.
 */
export const INGESTION_RESULTS = ['CREATED', 'MERGED_DUPLICATE', 'NOT_RENTAL', 'FAILED'] as const;
export type IngestionResult = (typeof INGESTION_RESULTS)[number];

const ingestionEventSchema = new Schema(
  {
    result: { type: String, enum: INGESTION_RESULTS, required: true },
    sourceType: { type: String },
    sourceChatId: { type: String }, // Nhóm Telegram nguồn — đếm số tin mỗi nhóm trong tuần (Story 13.5)
    at: { type: Date, default: Date.now },
  },
  { collection: 'ingestion_events', versionKey: false }
);
ingestionEventSchema.index({ at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const IngestionEvent = model('IngestionEvent', ingestionEventSchema);

// Ghi nền — lỗi ghi thống kê không làm hỏng việc nhập tin
export const recordIngestion = (result: IngestionResult, sourceType?: string, sourceChatId?: string) => {
  IngestionEvent.create({ result, sourceType, sourceChatId }).catch((err) => console.error('[Ingestion] Lỗi ghi thống kê:', err.message));
};
