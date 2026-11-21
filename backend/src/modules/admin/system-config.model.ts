import { Schema, model } from 'mongoose';

/**
 * Story 13.5 — cấu hình hệ thống sửa trên web (1 bản ghi duy nhất, _id = 'main').
 * reviewPolicy:
 *  - FLAG_ONLY (mặc định = hành vi trước đây): tin cào lên Bảng hàng, AI tự gắn cờ "cần kiểm tra" khi thiếu thông tin
 *  - SAFE: mọi tin cào đều gắn cờ "cần kiểm tra"
 *  - FAST_LANE: chỉ bỏ cờ khi tin đủ thông tin (quy tắc) VÀ điểm tin cậy AI ≥ 90
 */
export const REVIEW_POLICIES = ['FLAG_ONLY', 'SAFE', 'FAST_LANE'] as const;
export type ReviewPolicy = (typeof REVIEW_POLICIES)[number];

export interface ITelegramSource {
  chatId: string;
  name: string;
  active: boolean;
  addedAt: Date;
}

export interface ISystemConfig {
  _id: string;
  telegramSources: ITelegramSource[];
  reviewPolicy: ReviewPolicy;
  hotline?: string;
  zaloOaUrl?: string;
  // Story 16.5: ngưỡng cảnh báo bất thường (Admin chỉnh trong Cấu hình)
  alertThresholds?: { ownerContactPerHour: number; deletesPer10Min: number };
  updatedAt?: Date;
}

const systemConfigSchema = new Schema<ISystemConfig>(
  {
    _id: { type: String, default: 'main' },
    telegramSources: [
      {
        _id: false,
        chatId: { type: String, required: true, trim: true },
        name: { type: String, required: true, trim: true },
        active: { type: Boolean, default: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    reviewPolicy: { type: String, enum: REVIEW_POLICIES, default: 'FLAG_ONLY' },
    hotline: { type: String, trim: true },
    zaloOaUrl: { type: String, trim: true },
    alertThresholds: {
      ownerContactPerHour: { type: Number, default: 30 },
      deletesPer10Min: { type: Number, default: 5 },
    },
  },
  { timestamps: { createdAt: false, updatedAt: true }, collection: 'system_config', versionKey: false }
);

export const SystemConfig = model<ISystemConfig>('SystemConfig', systemConfigSchema);
