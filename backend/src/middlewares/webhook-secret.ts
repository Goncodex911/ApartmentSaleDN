import { Request, Response, NextFunction } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';

const sha256 = (value: string) => createHash('sha256').update(value).digest();

/**
 * Bảo vệ các cổng nhận tin không đăng nhập (Webhook WhatsApp, Chrome Extension bản public):
 * bắt buộc header `x-webhook-secret` khớp INGESTION_WEBHOOK_SECRET.
 * Chưa cấu hình secret → khóa luôn các cổng này (fail-closed), tránh bị spam đốt quota Gemini.
 */
export function requireWebhookSecret(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.INGESTION_WEBHOOK_SECRET;
  if (!expected) {
    res.status(503).json({ success: false, message: 'Cổng nhận tin công khai chưa được cấu hình' });
    return;
  }

  // So sánh hằng thời gian trên mã băm (2 chuỗi cùng độ dài) — chống dò secret qua thời gian phản hồi
  const provided = req.get('x-webhook-secret');
  if (!provided || !timingSafeEqual(sha256(provided), sha256(expected))) {
    res.status(401).json({ success: false, message: 'Webhook secret không hợp lệ' });
    return;
  }
  next();
}
