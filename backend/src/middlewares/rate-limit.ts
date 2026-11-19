import { Request, Response, NextFunction } from 'express';

/**
 * Bộ đếm số lần trong cửa sổ thời gian, lưu trong bộ nhớ (không cài package). Đủ cho 1 instance server;
 * chạy nhiều instance cần chuyển sang Redis. Dùng trực tiếp trong service khi cần đếm theo điều kiện
 * (VD Story 14.7: chỉ đếm khi tạo phiên chat MỚI).
 */
export function createCounter({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  // Dọn định kỳ các bộ đếm đã hết hạn để Map không phình mãi; unref() để không giữ tiến trình sống
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, windowMs).unref();

  return {
    /** Ghi 1 lần; trả số giây phải chờ nếu đã vượt `max`, ngược lại 0. */
    hit(key: string): number {
      const now = Date.now();
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return 0;
      }
      return ++entry.count > max ? Math.ceil((entry.resetAt - now) / 1000) : 0;
    },
    reset: (key: string) => void hits.delete(key),
  };
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
  key?: (req: Request) => string; // Mặc định theo IP; VD theo tài khoản: (req) => req.user.id
  resetOnSuccess?: boolean; // Story 14.5: chỉ đếm lần thất bại (VD đăng nhập đúng → xóa bộ đếm của SĐT đó)
}

/**
 * Giới hạn tần suất: tối đa `max` request trong `windowMs` cho mỗi key (mặc định IP).
 * Lưu ý: chạy sau reverse proxy phải bật TRUST_PROXY để lấy đúng IP khách (xem app.ts).
 */
export function rateLimit({ windowMs, max, message, key: keyOf = (req) => req.ip || 'unknown', resetOnSuccess }: RateLimitOptions) {
  const counter = createCounter({ windowMs, max });

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyOf(req);
    const waitSeconds = counter.hit(key);
    if (waitSeconds) {
      res.set('Retry-After', String(waitSeconds));
      res.status(429).json({ success: false, message });
      return;
    }
    if (resetOnSuccess) res.on('finish', () => res.statusCode < 400 && counter.reset(key));
    next();
  };
}
