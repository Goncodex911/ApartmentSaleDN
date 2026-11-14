import { Schema, model, Document, Types } from 'mongoose';

export const LEAD_STAGES = ['NEW', 'CONSULTING', 'VIEWING', 'DEPOSITED', 'LOST'] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];
// Khách còn đang tìm phòng → được nhận gợi ý ghép căn (Story 6.3)
export const OPEN_LEAD_STAGES: LeadStage[] = ['NEW', 'CONSULTING', 'VIEWING'];
export const MAX_NOTES_PER_LEAD = 200;

export interface ILeadRequirements {
  districts: string[];
  maxBudget?: number;
  moveInDate?: string;
  bedrooms?: number;
  allowPets?: boolean;
  carParking?: boolean;
}

export interface ILeadNote {
  _id?: Types.ObjectId;
  content: string;
  isSystem: boolean; // Ghi chú do hệ thống tự sinh (chuyển giai đoạn, AI chat...)
  createdAt: Date;
}

// Khách hàng trong phễu CRM của từng CTV (Story 6.1)
export interface ILead extends Document {
  ctvId: Types.ObjectId;
  name: string;
  phone?: string;
  source: 'MANUAL' | 'AI_CHAT';
  stage: LeadStage;
  viewingAt?: Date;
  lostReason?: string;
  depositedApartmentId?: Types.ObjectId;
  requirements: ILeadRequirements;
  notes: ILeadNote[];
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<ILead>(
  {
    ctvId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    source: { type: String, enum: ['MANUAL', 'AI_CHAT'], default: 'MANUAL' },
    stage: { type: String, enum: LEAD_STAGES, default: 'NEW' },
    viewingAt: { type: Date },
    lostReason: { type: String, trim: true },
    depositedApartmentId: { type: Schema.Types.ObjectId, ref: 'Apartment' },
    requirements: {
      districts: { type: [String], default: [] },
      maxBudget: { type: Number },
      moveInDate: { type: String, trim: true },
      bedrooms: { type: Number },
      allowPets: { type: Boolean },
      carParking: { type: Boolean },
    },
    notes: [
      {
        content: { type: String, required: true, trim: true },
        isSystem: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

leadSchema.index({ ctvId: 1, lastActivityAt: -1 });
leadSchema.index({ stage: 1 }); // So khớp căn mới với khách đang mở (Story 6.3)

/** Thêm ghi chú mới lên đầu danh sách, chỉ giữ MAX_NOTES_PER_LEAD ghi chú gần nhất. */
export function pushLeadNote(lead: ILead, content: string, isSystem = false): void {
  lead.notes.unshift({ content, isSystem, createdAt: new Date() });
  if (lead.notes.length > MAX_NOTES_PER_LEAD) lead.notes.splice(MAX_NOTES_PER_LEAD);
  lead.lastActivityAt = new Date();
}

export const Lead = model<ILead>('Lead', leadSchema);
