import { Schema, model, Document, Types } from 'mongoose';

export interface ISubListing {
  _id?: Types.ObjectId;
  sourceType: 'TELEGRAM' | 'WHATSAPP' | 'ZALO' | 'FACEBOOK' | 'MANUAL';
  sourceName?: string;
  sourceUrl?: string;
  price?: number;
  ownerContact?: {
    name?: string;
    phone?: string;
    note?: string;
  };
  images?: string[];
  rawContent?: string;
  postedAt?: Date;
}

export interface IApartment extends Document {
  title: string;
  description?: string;
  price: number;
  deposit: number;
  commission: {
    type: 'PERCENT' | 'FIXED';
    value: number;
  };
  location: {
    address: string;
    ward?: string;
    district: string;
    city: string;
    coordinates?: [number, number]; // [kinh độ, vĩ độ] index 2dsphere
  };
  attributes: {
    area?: number;
    bedrooms: number;
    livingRooms?: number;
    bathrooms: number;
    balcony: boolean;
    furnishing: 'FULL' | 'BASIC' | 'EMPTY';
    elevator: boolean;
    carParking: boolean;
    allowPets: boolean;
    washingMachine: 'PRIVATE' | 'SHARED' | 'NONE';
    pcccStandard: boolean;
  };
  fees: {
    electricity?: number;
    water?: number;
    service?: number;
    parkingMotor?: number;
  };
  images: string[];
  imageHashes?: string[];
  videos?: string[];
  ownerContact: {
    name: string;
    phone: string;
    note?: string;
  };
  subListings: ISubListing[]; // Mảng các nguồn tham chiếu (Story 2.3)
  status: 'AVAILABLE' | 'UPCOMING' | 'DEPOSITED' | 'RENTED';
  availableDate?: Date;
  managerId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const subListingSchema = new Schema<ISubListing>(
  {
    sourceType: {
      type: String,
      enum: ['TELEGRAM', 'WHATSAPP', 'ZALO', 'FACEBOOK', 'MANUAL'],
      default: 'MANUAL',
    },
    sourceName: { type: String, trim: true },
    sourceUrl: { type: String, trim: true },
    price: { type: Number },
    ownerContact: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      note: { type: String, trim: true },
    },
    images: [{ type: String }],
    rawContent: { type: String },
    postedAt: { type: Date, default: Date.now },
  },
  { _id: true, timestamps: false }
);

const apartmentSchema = new Schema<IApartment>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0, index: true },
    deposit: { type: Number, default: 0, min: 0 },
    commission: {
      type: { type: String, enum: ['PERCENT', 'FIXED'], default: 'PERCENT' },
      value: { type: Number, default: 0 },
    },
    location: {
      address: { type: String, required: true, trim: true },
      ward: { type: String, trim: true },
      district: { type: String, required: true, trim: true, index: true },
      city: { type: String, required: true, default: 'Hà Nội', trim: true },
      coordinates: { type: [Number], index: '2dsphere' },
    },
    attributes: {
      area: { type: Number },
      bedrooms: { type: Number, default: 1, min: 0 },
      livingRooms: { type: Number, default: 0 },
      bathrooms: { type: Number, default: 1, min: 0 },
      balcony: { type: Boolean, default: false },
      furnishing: { type: String, enum: ['FULL', 'BASIC', 'EMPTY'], default: 'BASIC' },
      elevator: { type: Boolean, default: false },
      carParking: { type: Boolean, default: false },
      allowPets: { type: Boolean, default: false },
      washingMachine: { type: String, enum: ['PRIVATE', 'SHARED', 'NONE'], default: 'NONE' },
      pcccStandard: { type: Boolean, default: true },
    },
    fees: {
      electricity: { type: Number },
      water: { type: Number },
      service: { type: Number },
      parkingMotor: { type: Number },
    },
    images: [{ type: String }],
    imageHashes: [{ type: String }],
    videos: [{ type: String }],
    ownerContact: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      note: { type: String, trim: true },
    },
    subListings: { type: [subListingSchema], default: [] },
    status: {
      type: String,
      enum: ['AVAILABLE', 'UPCOMING', 'DEPOSITED', 'RENTED'],
      default: 'AVAILABLE',
      index: true,
    },
    availableDate: { type: Date },
    managerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

export const Apartment = model<IApartment>('Apartment', apartmentSchema);
