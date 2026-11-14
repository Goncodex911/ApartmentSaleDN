import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.js';

/**
 * Bọc handler async của Controller: mọi lỗi (kể cả lỗi throw đồng bộ như ZodError) được chuyển cho
 * Global Error Handler → không cần lặp try/catch ở từng hàm.
 */
export const asyncHandler =
  (fn: (req: AuthRequest, res: Response) => Promise<unknown>) =>
  (req: AuthRequest, res: Response, next: NextFunction) =>
    Promise.resolve()
      .then(() => fn(req, res))
      .catch(next);
