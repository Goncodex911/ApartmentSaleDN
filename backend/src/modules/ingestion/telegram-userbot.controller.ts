import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.js';
import { TelegramUserbotService } from './telegram-userbot.service.js';
import { TelegramScrapeTaskService } from './telegram-scrape-task.service.js';

export class TelegramUserbotController {
  /**
   * POST /api/v1/ingestion/telegram-userbot/auth/qr/start
   */
  public static async startQrAuth(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
        return;
      }

      const result = await TelegramUserbotService.startQrAuth(userId);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Lỗi khởi tạo xác thực QR' });
    }
  }

  /**
   * POST /api/v1/ingestion/telegram-userbot/auth/qr/check
   */
  public static async checkQrAuth(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
        return;
      }

      const { password } = req.body;
      const result = await TelegramUserbotService.checkQrAuth(userId, password);
      res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Lỗi kiểm tra xác thực QR' });
    }
  }

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
   * Khởi chạy cào tin dưới nền, trả về taskId ngay (tránh 504 do proxy Netlify timeout ~26s)
   */
  public static async scrape(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
      return;
    }

    const { chat, targetSender, limit } = req.body;
    if (typeof chat !== 'string' || typeof targetSender !== 'string' || !chat.trim() || !targetSender.trim()) {
      res.status(400).json({ success: false, message: 'Vui lòng cung cấp nhóm và tên người đăng mục tiêu' });
      return;
    }

    const task = TelegramScrapeTaskService.start(userId, {
      chatInput: chat,
      targetSender,
      limit: Number(limit) || 20,
    });
    res.status(202).json({ success: true, taskId: task.id });
  }

  /**
   * GET /api/v1/ingestion/telegram-userbot/scrape/:taskId
   * Trả về tiến trình (log, %, kết quả) của tác vụ cào tin
   */
  public static async getScrapeTask(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
      return;
    }

    const task = TelegramScrapeTaskService.getTask(userId, String(req.params.taskId));
    if (!task) {
      res.status(404).json({ success: false, message: 'Không tìm thấy tác vụ cào tin (có thể máy chủ vừa khởi động lại)' });
      return;
    }
    res.status(200).json({ success: true, task });
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
