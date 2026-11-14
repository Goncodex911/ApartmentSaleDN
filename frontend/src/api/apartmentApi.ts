import { apiClient } from './client.js';

export interface Apartment {
  _id: string;
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
    coordinates?: [number, number];
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
  fees?: {
    electricity?: number;
    water?: number;
    service?: number;
    parkingMotor?: number;
  };
  images: string[];
  hiddenImages?: string[]; // Ảnh có SĐT nguồn cũ — không gửi khách (Story 5.2)
  videos?: string[];
  ownerContact: {
    name: string;
    phone: string;
    note?: string;
  };
  subListings?: Array<{
    _id?: string;
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
    postedAt?: string;
  }>;
  status: 'AVAILABLE' | 'UPCOMING' | 'DEPOSITED' | 'RENTED';
  availableDate?: string;
  distanceKm?: number;
  nearestLandmark?: string;
  managerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Landmark {
  id: string;
  name: string;
  shortName: string;
  district: string;
  coordinates: [number, number];
  category: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const apartmentApi = {
  getApartments: async (params: Record<string, any> = {}) => {
    const res = await apiClient.get('/apartments', { params });
    return res.data;
  },

  searchApartments: async (params: Record<string, any> = {}) => {
    const res = await apiClient.get('/apartments/search', { params });
    return res.data;
  },

  searchNaturalApartments: async (query: string, params: Record<string, any> = {}) => {
    const res = await apiClient.post('/apartments/search/natural', { query }, { params });
    return res.data;
  },

  getLandmarks: async () => {
    const res = await apiClient.get('/apartments/search/landmarks');
    return res.data;
  },

  getApartmentById: async (id: string) => {
    const res = await apiClient.get(`/apartments/${id}`);
    return res.data;
  },

  createApartment: async (data: Partial<Apartment>) => {
    const res = await apiClient.post('/apartments', data);
    return res.data;
  },

  updateApartment: async (id: string, data: Partial<Apartment>) => {
    const res = await apiClient.put(`/apartments/${id}`, data);
    return res.data;
  },

  updateStatus: async (id: string, data: { status: string; availableDate?: string }) => {
    const res = await apiClient.patch(`/apartments/${id}/status`, data);
    return res.data;
  },

  deleteApartment: async (id: string) => {
    const res = await apiClient.delete(`/apartments/${id}`);
    return res.data;
  },

  uploadMedia: async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('media', file));
    const res = await apiClient.post('/apartments/upload-media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  addSubListing: async (apartmentId: string, data: any) => {
    const res = await apiClient.post(`/apartments/${apartmentId}/sub-listings`, data);
    return res.data;
  },

  removeSubListing: async (apartmentId: string, subId: string) => {
    const res = await apiClient.delete(`/apartments/${apartmentId}/sub-listings/${subId}`);
    return res.data;
  },
};

