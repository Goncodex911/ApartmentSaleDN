import { Schema, model, Document, Types } from 'mongoose';
import { ILeadRequirements } from '../leads/lead.model.js';

export interface IChatSuggestion {
  apartmentId: Types.ObjectId;
  title: string;
  price: number;
  district: string;
  image?: string;
  url: string; // Link xem phòng của chính CTV chủ phiên chat (Story 5.3)
}

export interface IChatMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: IChatSuggestion[];
  createdAt: Date;
}

// Phiên chat của khách với trợ lý AI trên trang xem phòng (Story 6.2) — tự xóa sau 30 ngày không hoạt động
export interface IChatSession extends Document {
  sessionId: string; // Mã ngẫu nhiên (không dùng _id vì ObjectId đoán được → lộ hội thoại có SĐT khách)
  shareCode: string;
  ctvId: Types.ObjectId;
  apartmentId: Types.ObjectId;
  leadId?: Types.ObjectId;
  messages: IChatMessage[];
  requirements: ILeadRequirements;
  customer: { name?: string; phone?: string };
  userMessageCount: number;
  notifiedStart: boolean;
  notifiedPhone: boolean;
  updatedAt: Date;
}

const suggestionSchema = new Schema<IChatSuggestion>(
  {
    apartmentId: { type: Schema.Types.ObjectId, ref: 'Apartment' },
    title: String,
    price: Number,
    district: String,
    image: String,
    url: String,
  },
  { _id: false }
);

const chatSessionSchema = new Schema<IChatSession>(
  {
    sessionId: { type: String, required: true, unique: true },
    shareCode: { type: String, required: true },
    ctvId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    apartmentId: { type: Schema.Types.ObjectId, ref: 'Apartment', required: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead' },
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        suggestions: { type: [suggestionSchema], default: undefined },
        createdAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    requirements: {
      districts: { type: [String], default: [] },
      maxBudget: Number,
      moveInDate: String,
      bedrooms: Number,
      allowPets: Boolean,
      carParking: Boolean,
    },
    customer: { name: String, phone: String },
    userMessageCount: { type: Number, default: 0 },
    notifiedStart: { type: Boolean, default: false },
    notifiedPhone: { type: Boolean, default: false },
  },
  { timestamps: true }
);

chatSessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

export const ChatSession = model<IChatSession>('ChatSession', chatSessionSchema);
