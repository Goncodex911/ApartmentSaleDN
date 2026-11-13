import { IApartment } from '../apartments/apartment.model.js';

export type DedupMatchType = 'DETERMINISTIC' | 'IMAGE_PHASH';

export interface IDedupCheckResult {
  isDuplicate: boolean;
  masterApartmentId?: string;
  matchType?: DedupMatchType;
  confidence: number; // 0 - 100
  matchedApartment?: IApartment;
  details?: string;
}

export interface IProcessListingInput {
  sourceType: 'TELEGRAM' | 'WHATSAPP' | 'ZALO' | 'FACEBOOK' | 'MANUAL';
  sourceName?: string;
  sourceUrl?: string;
  rawText: string;
  mediaUrls?: string[];
  managerId: string;
}

