import { z } from 'zod';
import { AuthRequest } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { SHARE_CODE_PATTERN } from '../share/share-link.service.js';
import { ChatService } from './chat.service.js';

const SESSION_ID = /^[a-z0-9]{24}$/;
const sendMessageSchema = z.object({
  sessionId: z.string().regex(SESSION_ID).optional(),
  message: z.string().trim().min(1, 'Vui lòng nhập tin nhắn').max(500, 'Tin nhắn tối đa 500 ký tự'),
});

const shareCode = (req: AuthRequest) => {
  const code = String(req.params.code);
  if (!SHARE_CODE_PATTERN.test(code)) throw { status: 404, message: 'Link không còn hiệu lực' };
  return code;
};

export class ChatController {
  // POST /api/v1/chat/:code/messages — khách gửi tin cho trợ lý AI (Story 6.2)
  static sendMessage = asyncHandler(async (req, res) => {
    const data = await ChatService.sendMessage(shareCode(req), sendMessageSchema.parse(req.body), req.user?.id);
    res.status(200).json({ success: true, data });
  });

  // GET /api/v1/chat/:code/sessions/:sessionId — tải lại lịch sử hội thoại
  static getSession = asyncHandler(async (req, res) => {
    const sessionId = String(req.params.sessionId);
    if (!SESSION_ID.test(sessionId)) throw { status: 404, message: 'Không tìm thấy phiên chat' };
    res.status(200).json({ success: true, data: await ChatService.getSession(shareCode(req), sessionId) });
  });
}
