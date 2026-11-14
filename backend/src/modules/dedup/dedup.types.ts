export interface IProcessListingInput {
  sourceType: 'TELEGRAM' | 'WHATSAPP' | 'ZALO' | 'FACEBOOK' | 'MANUAL';
  sourceName?: string;
  sourceUrl?: string;
  rawText: string;
  mediaUrls?: string[];
  managerId: string;
}
