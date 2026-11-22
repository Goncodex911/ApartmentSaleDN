import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.js';
import { TelegramUserbotService } from './telegram-userbot.service.js';

export class TelegramUserbotController {
  /**
   * POST /api/v1/ingestion/telegram-userbot/auth/send-code
   */
  public static async sendAuthCode(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
        return;
      }

      const { phone } = req.body;
      if (!phone || typeof phone !== 'string') {
        res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ' });
        return;
      }

      const result = await TelegramUserbotService.sendAuthCode(userId, phone);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Lỗi gửi mã xác nhận Telegram' });
    }
  }

  /**
   * POST /api/v1/ingestion/telegram-userbot/auth/verify
   */
  public static async verifyAuthCode(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
        return;
      }

      const { phone, phoneCodeHash, code, password } = req.body;
      if (!phone || !phoneCodeHash || !code) {
        res.status(400).json({ success: false, message: 'Thiếu thông tin xác thực mã OTP' });
        return;
      }

      const result = await TelegramUserbotService.verifyAuthCode(userId, phone, phoneCodeHash, code, password);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Lỗi xác nhận mã OTP Telegram' });
    }
  }

  /**
   * POST /api/v1/ingestion/telegram-userbot/auth/disconnect
   */
  public static async disconnect(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
        return;
      }

      const result = await TelegramUserbotService.disconnect(userId);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Lỗi hủy kết nối Telegram' });
    }
  }

  /**
   * GET /api/v1/ingestion/telegram-userbot/status
   */
  public static async getStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
        return;
      }

      const result = await TelegramUserbotService.getStatus(userId);
      res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/v1/ingestion/telegram-userbot/dialogs
   */
  public static async getDialogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
        return;
      }

      const dialogs = await TelegramUserbotService.getDialogs(userId);
      res.status(200).json({ success: true, dialogs });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Lỗi lấy danh sách nhóm' });
    }
  }

  /**
   * POST /api/v1/ingestion/telegram-userbot/scrape
   */
  public static async scrape(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
      return;
    }

    const { chat, targetSender, limit, stream } = req.body;
    if (!chat || !targetSender) {
      res.status(400).json({ success: false, message: 'Vui lòng cung cấp nhóm và tên người đăng mục tiêu' });
      return;
    }

    if (stream) {
      // Hỗ trợ truyền dòng thời gian thực qua Server-Sent Events (SSE)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const sendEvent = (type: string, data: any) => {
        res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
      };

      try {
        const result = await TelegramUserbotService.scrapeTargetSender(userId, {
          chatInput: chat,
          targetSender,
          limit: limit ? Number(limit) : 20,
          onProgress: (p) => sendEvent('progress', p),
        });
        sendEvent('complete', result);
        res.end();
      } catch (err: any) {
        sendEvent('error', { message: err.message || 'Lỗi trong quá trình cào tin' });
        res.end();
      }
      return;
    }

    try {
      const result = await TelegramUserbotService.scrapeTargetSender(userId, {
        chatInput: chat,
        targetSender,
        limit: limit ? Number(limit) : 20,
      });
      res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Lỗi trong quá trình cào tin' });
    }
  }

  /**
   * POST /api/v1/ingestion/telegram-userbot/listener/start
   */
  public static async startListener(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
        return;
      }

      const { chat, targetSender } = req.body;
      if (!chat || !targetSender) {
        res.status(400).json({ success: false, message: 'Vui lòng cung cấp nhóm và tên người đăng mục tiêu' });
        return;
      }

      const result = await TelegramUserbotService.startRealtimeListener(userId, chat, targetSender);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Lỗi khởi chạy bộ lắng nghe' });
    }
  }

  /**
   * POST /api/v1/ingestion/telegram-userbot/listener/stop
   */
  public static async stopListener(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
        return;
      }

      const result = await TelegramUserbotService.stopRealtimeListener(userId);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/v1/ingestion/telegram-userbot/listener/status
   */
  public static async getListenerStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
        return;
      }

      const status = TelegramUserbotService.getRealtimeListenerStatus(userId);
      res.status(200).json({ success: true, ...status });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
