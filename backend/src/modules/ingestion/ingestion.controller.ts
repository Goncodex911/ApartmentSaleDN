import { Request, Response, NextFunction } from 'express';
import { parseRawPostSchema } from './ingestion.validation.js';
import { GeminiService } from './gemini.service.js';
import { DedupService } from '../dedup/dedup.service.js';
import { AuthRequest } from '../../middlewares/auth.js';
import { User } from '../auth/user.model.js';

export class IngestionController {
  /**
   * Helper tìm managerId hợp lệ
   */
  private static async resolveManagerId(userId?: string): Promise<string> {
    if (userId) return userId;
    const defaultManager = await User.findOne({ role: { $in: ['ADMIN', 'MANAGER'] } });
    return defaultManager ? String(defaultManager._id) : '000000000000000000000000';
  }

  /**
   * Bóc tách tin nhắn thô bằng AI và lọc tin rác (chỉ phân tích, chưa lưu DB)
   * POST /api/v1/ingestion/parse
   */
  public static async parseRawPost(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = parseRawPostSchema.parse(req.body);

      const startTime = Date.now();
      const result = await GeminiService.parseRealEstatePost(validated.rawText);
      const executionTimeMs = Date.now() - startTime;

      res.status(200).json({
        success: true,
        data: {
          ...result,
          metadata: {
            sourceType: validated.sourceType,
            sourceName: validated.sourceName,
            mediaUrls: validated.mediaUrls,
            executionTimeMs,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Pipeline toàn diện: Bóc tách AI -> Lọc rác -> Khử trùng đa tầng -> Tự động Gộp Sub hoặc Tạo Master
   * POST /api/v1/ingestion/process-listing
   */
  public static async processListing(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validated = parseRawPostSchema.parse(req.body);
      const managerId = await IngestionController.resolveManagerId(req.user?.id);

      const startTime = Date.now();
      const result = await DedupService.processListing({
        sourceType: validated.sourceType as any,
        sourceName: validated.sourceName,
        sourceUrl: validated.sourceUrl,
        rawText: validated.rawText,
        mediaUrls: validated.mediaUrls,
        managerId,
      });
      const executionTimeMs = Date.now() - startTime;

      res.status(200).json({
        success: true,
        data: {
          ...result,
          executionTimeMs,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * AC2: Cổng tiếp nhận Webhook từ WhatsApp (hoặc các dịch vụ bot tự động)
   * POST /api/v1/ingestion/webhook
   */
  public static async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      const body = {
        sourceType: 'WHATSAPP',
        sourceName: req.body.sourceName || 'WhatsApp Group',
        ...req.body,
      };
      const validated = parseRawPostSchema.parse(body);
      const managerId = await IngestionController.resolveManagerId();

      const result = await DedupService.processListing({
        sourceType: validated.sourceType as any,
        sourceName: validated.sourceName,
        sourceUrl: validated.sourceUrl,
        rawText: validated.rawText,
        mediaUrls: validated.mediaUrls,
        managerId,
      });

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * AC3: Cổng nhận dữ liệu 1-Click từ Chrome Extension (Zalo, FB, WhatsApp Web)
   * POST /api/v1/ingestion/extension-import
   */
  public static async extensionImport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validated = parseRawPostSchema.parse(req.body);
      const managerId = await IngestionController.resolveManagerId(req.user?.id);

      const result = await DedupService.processListing({
        sourceType: (validated.sourceType || 'ZALO') as any,
        sourceName: validated.sourceName || 'Chrome Extension',
        sourceUrl: validated.sourceUrl,
        rawText: validated.rawText,
        mediaUrls: validated.mediaUrls,
        managerId,
      });

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * AC4: Hộp thoại Nhập Nhanh trên Portal Web dành cho Quản lý
   * POST /api/v1/ingestion/quick-paste
   */
  public static async quickPaste(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = {
        sourceType: req.body.sourceType || 'MANUAL',
        sourceName: req.body.sourceName || 'Nhập nhanh Portal Web',
        ...req.body,
      };
      const validated = parseRawPostSchema.parse(body);
      const managerId = await IngestionController.resolveManagerId(req.user?.id);

      const result = await DedupService.processListing({
        sourceType: validated.sourceType as any,
        sourceName: validated.sourceName,
        rawText: validated.rawText,
        mediaUrls: validated.mediaUrls,
        managerId,
      });

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
