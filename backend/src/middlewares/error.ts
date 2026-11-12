import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

interface CustomError {
  status?: number;
  message?: string;
}

// Middleware xử lý lỗi tập trung, không để lộ stack trace ra ngoài client
export function errorHandler(
  err: CustomError | ZodError | Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Lỗi validation từ Zod
  if (err instanceof ZodError) {
    const errorMessages = err.errors.map((e) => e.message).join(', ');
    res.status(400).json({
      success: false,
      message: errorMessages,
      errors: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  // 2. Lỗi tùy biến từ Service (ví dụ: { status: 401, message: '...' })
  if ('status' in err && typeof err.status === 'number') {
    res.status(err.status).json({
      success: false,
      message: err.message || 'Yêu cầu không hợp lệ',
    });
    return;
  }

  // 3. Lỗi hệ thống không mong muốn
  console.error('[System Error]:', err);
  res.status(500).json({
    success: false,
    message: 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau.',
  });
}

