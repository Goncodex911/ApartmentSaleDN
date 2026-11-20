import { Schema, model } from 'mongoose';

/**
 * Story 15.6: bộ nhớ đệm định vị tên đường — khóa "tên đường chuẩn hóa|quận" → tọa độ.
 * Chính sách Nominatim bắt buộc cache; kết quả "không tìm thấy" cũng lưu (ngắn hơn) để không hỏi lại liên tục.
 */
export interface IGeocache {
  _id: string;
  coordinates?: [number, number]; // [kinh độ, vĩ độ]
  found: boolean;
  expiresAt: Date;
}

const geocacheSchema = new Schema<IGeocache>(
  {
    _id: { type: String },
    coordinates: { type: [Number], default: undefined },
    found: { type: Boolean, required: true },
    expiresAt: { type: Date, required: true },
  },
  { collection: 'geocaches', versionKey: false }
);
geocacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Geocache = model<IGeocache>('Geocache', geocacheSchema);
