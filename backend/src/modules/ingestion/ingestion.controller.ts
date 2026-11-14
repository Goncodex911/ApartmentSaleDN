import { parseRawPostSchema } from './ingestion.validation.js';
import { GeminiService } from './gemini.service.js';
import { DedupService } from '../dedup/dedup.service.js';
import { UserService } from '../users/user.service.js';
import { asyncHandler } from '../../utils/async-handler.js';

/**
 * Tạo handler cho các cổng nhập tin — chỉ khác nguồn mặc định (Story 3.3).
 * Người gửi đã đăng nhập → căn mới thuộc về họ; cổng public (đã qua webhook secret) → gán Quản lý mặc định.
 * Giá trị mặc định gộp TRƯỚC khi validate → body gửi lên luôn được ưu tiên.
 */
const ingestFrom = (defaults: { sourceType?: string; sourceName?: string } = {}) =>
  asyncHandler(async (req, res) => {
    const validated = parseRawPostSchema.parse({ ...defaults, ...req.body });
    const startTime = Date.now();
    const result = await DedupService.processListing({
      sourceType: validated.sourceType,
      sourceName: validated.sourceName,
      sourceUrl: validated.sourceUrl,
      rawText: validated.rawText,
      mediaUrls: validated.mediaUrls,
      managerId: req.user?.id ?? (await UserService.findDefaultManagerId()),
    });
    res.status(200).json({ success: true, data: { ...result, executionTimeMs: Date.now() - startTime } });
  });

export class IngestionController {
  /**
   * Bóc tách tin nhắn thô bằng AI và lọc tin rác (chỉ phân tích, chưa lưu DB)
   * POST /api/v1/ingestion/parse
   */
  static parseRawPost = asyncHandler(async (req, res) => {
    const validated = parseRawPostSchema.parse(req.body);
    const startTime = Date.now();
    const result = await GeminiService.parseRealEstatePost(validated.rawText);
    res.status(200).json({
      success: true,
      data: {
        ...result,
        metadata: {
          sourceType: validated.sourceType,
          sourceName: validated.sourceName,
          mediaUrls: validated.mediaUrls,
          executionTimeMs: Date.now() - startTime,
        },
      },
    });
  });

  // Pipeline toàn diện: AI bóc tách → Lọc rác → Khử trùng đa tầng → Gộp Sub hoặc Tạo Master (POST /process-listing)
  static processListing = ingestFrom();

  // AC2: Webhook từ WhatsApp hoặc bot tự động (POST /webhook)
  static webhook = ingestFrom({ sourceType: 'WHATSAPP', sourceName: 'WhatsApp Group' });

  // AC3: Nhập 1-Click từ Chrome Extension (Zalo, FB, WhatsApp Web) (POST /extension-import)
  static extensionImport = ingestFrom({ sourceType: 'ZALO', sourceName: 'Chrome Extension' });

  // AC4: Hộp thoại Nhập Nhanh trên Portal Web dành cho Quản lý (POST /quick-paste)
  static quickPaste = ingestFrom({ sourceType: 'MANUAL', sourceName: 'Nhập nhanh Portal Web' });
}
