export interface IProcessListingInput {
  sourceType: 'TELEGRAM' | 'WHATSAPP' | 'ZALO' | 'FACEBOOK' | 'MANUAL';
  sourceName?: string;
  sourceUrl?: string;
  rawText: string;
  mediaUrls?: string[];
  managerId: string;
  sourceChatId?: string; // Nhóm Telegram nguồn (Story 13.5 — thống kê theo nhóm)
}
