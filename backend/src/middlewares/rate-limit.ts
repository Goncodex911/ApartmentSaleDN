import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
}

/**
 * Giới hạn tần suất trong bộ nhớ (không cài package): tối đa `max` request trong `windowMs` cho mỗi IP.
 * Đủ cho 1 instance server. Nếu chạy nhiều instance cần chuyển bộ đếm sang Redis.
 * Lưu ý: chạy sau reverse proxy (Nginx...) phải bật app.set('trust proxy', 1) để lấy đúng IP khách.
 */
export function rateLimit({ windowMs, max, message }: RateLimitOptions) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  // Dọn định kỳ các bộ đếm đã hết hạn để Map không phình mãi; unref() để không giữ tiến trình sống
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, windowMs).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (++entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({ success: false, message });
      return;
    }
    next();
  };
}
