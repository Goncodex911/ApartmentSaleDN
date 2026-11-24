import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.js';
import { TelegramUserbotService } from './telegram-userbot.service.js';
import { TelegramHarvestService } from './telegram-harvest.service.js';
import { TelegramScrapeTaskService } from './telegram-scrape-task.service.js';

type Handler = (userId: string, req: AuthRequest, res: Response) => Promise<unknown>;

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

/** Kiểm tra đăng nhập + bắt lỗi chung: lỗi nghiệp vụ trả 400 kèm thông điệp tiếng Việt, không lộ stack trace */
const handle = (fallbackMessage: string, fn: Handler) => async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
    return;
  }
  try {
    const result = await fn(userId, req, res);
    if (!res.headersSent) res.status(200).json({ success: true, ...(result as object) });
  } catch (err: any) {
    // code (VD TELEGRAM_SESSION_DEAD) giúp frontend biết cần đưa người dùng về màn hình kết nối lại
    if (!res.headersSent) res.status(400).json({ success: false, message: err?.message || fallbackMessage, code: err?.code });
  }
};

const badRequest = (res: Response, message: string) => res.status(400).json({ success: false, message });

/** API Userbot Telegram: /api/v1/ingestion/telegram-userbot/* */
export const TelegramUserbotController = {
  startQrAuth: handle('Lỗi khởi tạo xác thực 1-chạm', (userId) => TelegramUserbotService.startQrAuth(userId)),

  checkQrAuth: handle('Lỗi kiểm tra xác thực', (userId, req) =>
    TelegramUserbotService.checkQrAuth(userId, isText(req.body?.password) ? req.body.password : undefined)
  ),

  sendAuthCode: handle('Lỗi gửi mã xác nhận Telegram', async (userId, req, res) => {
    if (!isText(req.body?.phone)) return badRequest(res, 'Số điện thoại không hợp lệ');
    return TelegramUserbotService.sendAuthCode(userId, req.body.phone);
  }),

  verifyAuthCode: handle('Lỗi xác nhận mã OTP Telegram', async (userId, req, res) => {
    const { phone, phoneCodeHash, code, password } = req.body ?? {};
    if (!isText(phone) || !isText(phoneCodeHash) || !isText(code)) return badRequest(res, 'Thiếu thông tin xác thực mã OTP');
    return TelegramUserbotService.verifyAuthCode(userId, phone, phoneCodeHash, code, isText(password) ? password : undefined);
  }),

  disconnect: handle('Lỗi hủy kết nối Telegram', (userId) => TelegramUserbotService.disconnect(userId)),

  getStatus: handle('Lỗi lấy trạng thái Telegram', (userId) => TelegramUserbotService.getStatus(userId)),

  getDialogs: handle('Lỗi lấy danh sách nhóm', async (userId) => ({ dialogs: await TelegramUserbotService.getDialogs(userId) })),

  /** Khởi chạy cào tin dưới nền, trả taskId ngay (tránh 504 do proxy Netlify timeout ~26s) */
  scrape: handle('Lỗi khởi chạy cào tin', async (userId, req, res) => {
    const { chat, targetSender, limit } = req.body ?? {};
    if (!isText(chat) || !isText(targetSender)) return badRequest(res, 'Vui lòng chọn nhóm và nhập SĐT / tên người đăng');
    const task = TelegramScrapeTaskService.start(userId, { chatInput: chat, targetSender, limit: Number(limit) || 20 });
    res.status(202).json({ success: true, taskId: task.id });
  }),

  /** Tác vụ đang chạy (nếu có) — mở lại trang vẫn theo dõi tiếp */
  getActiveScrape: handle('Lỗi lấy tác vụ cào tin', async (userId) => {
    const task = TelegramScrapeTaskService.getActive(userId);
    return { task: task ? TelegramScrapeTaskService.toPublic(task) : null };
  }),

  getScrapeTask: handle('Lỗi lấy tiến trình cào tin', async (userId, req, res) => {
    const task = TelegramScrapeTaskService.getTask(userId, String(req.params.taskId));
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy tác vụ cào tin (máy chủ có thể vừa khởi động lại)' });
    return { task: TelegramScrapeTaskService.toPublic(task) };
  }),

  cancelScrape: handle('Lỗi dừng cào tin', async (userId, req, res) => {
    const task = TelegramScrapeTaskService.cancel(userId, String(req.params.taskId));
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy tác vụ cào tin' });
    return { task: TelegramScrapeTaskService.toPublic(task) };
  }),

  startListener: handle('Lỗi khởi chạy bộ đón tin', async (userId, req, res) => {
    const { chat, targetSender } = req.body ?? {};
    if (!isText(chat) || !isText(targetSender)) return badRequest(res, 'Vui lòng chọn nhóm và nhập SĐT / tên người đăng');
    return TelegramHarvestService.startRealtimeListener(userId, chat, targetSender);
  }),

  stopListener: handle('Lỗi dừng bộ đón tin', (userId) => TelegramHarvestService.stopRealtimeListener(userId)),

  getListenerStatus: handle('Lỗi lấy trạng thái bộ đón tin', async (userId) => TelegramHarvestService.getRealtimeListenerStatus(userId)),
};
