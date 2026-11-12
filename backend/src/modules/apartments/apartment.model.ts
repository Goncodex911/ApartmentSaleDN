import { Schema, model, Document, Types } from 'mongoose';

export interface IApartment extends Document {
  title: string;
  description?: string;
  price: number;
  deposit?: number;
  location: {
    address: string;
    ward?: string;
    district: string;
    city: string;
  };
  attributes?: {
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    furnishing?: 'FULL' | 'BASIC' | 'EMPTY';
    elevator?: boolean;
    allowPets?: boolean;
  };
  images: string[];
  ownerContact: {
    name: string;
    phone: string;
    note?: string; // Ghi chú mật của chủ nhà
  };
  status: 'AVAILABLE' | 'UPCOMING' | 'DEPOSITED' | 'RENTED';
  managerId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const apartmentSchema = new Schema<IApartment>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, index: true },
    deposit: { type: Number, default: 0 },
    location: {
      address: { type: String, required: true, trim: true },
      ward: { type: String, trim: true },
      district: { type: String, required: true, trim: true, index: true },
      city: { type: String, required: true, default: 'Hà Nội', trim: true },
    },
    attributes: {
      bedrooms: { type: Number, default: 1 },
      bathrooms: { type: Number, default: 1 },
      area: { type: Number },
      furnishing: { type: String, enum: ['FULL', 'BASIC', 'EMPTY'], default: 'BASIC' },
      elevator: { type: Boolean, default: false },
      allowPets: { type: Boolean, default: false },
    },
    images: [{ type: String }],
    ownerContact: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      note: { type: String, trim: true },
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'UPCOMING', 'DEPOSITED', 'RENTED'],
      default: 'AVAILABLE',
      index: true,
    },
    managerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Apartment = model<IApartment>('Apartment', apartmentSchema);

