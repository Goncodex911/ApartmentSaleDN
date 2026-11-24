export interface IProcessListingInput {
  sourceType: 'TELEGRAM' | 'WHATSAPP' | 'ZALO' | 'FACEBOOK' | 'MANUAL';
  sourceName?: string;
  sourceUrl?: string;
  rawText: string;
  mediaUrls?: string[];
  // Tải ảnh SAU khi AI xác nhận là tin cho thuê → tin rác không bị đẩy ảnh lên Cloudinary (dùng khi chưa có mediaUrls)
  loadMediaUrls?: () => Promise<string[]>;
  managerId: string;
  sourceChatId?: string; // Nhóm Telegram nguồn (Story 13.5 — thống kê theo nhóm)
}
