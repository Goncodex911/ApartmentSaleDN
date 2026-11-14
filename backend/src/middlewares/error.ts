import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { Error as MongooseError } from 'mongoose';

interface CustomError {
  status?: number;
  message?: string;
  code?: number | string;
}

const MULTER_MESSAGES: Record<string, string> = {
  LIMIT_FILE_SIZE: 'File vượt quá dung lượng cho phép (25MB)',
  LIMIT_FILE_COUNT: 'Chỉ được tải tối đa 10 file mỗi lần',
};

const sendError = (res: Response, status: number, message: string, extra?: object) =>
  res.status(status).json({ success: false, message, ...extra });

// Middleware xử lý lỗi tập trung, không để lộ stack trace ra ngoài client
export function errorHandler(err: CustomError | Error, _req: Request, res: Response, _next: NextFunction): void {
  // 1. Lỗi validation từ Zod
  if (err instanceof ZodError) {
    sendError(res, 400, err.issues.map((issue) => issue.message).join(', '), {
      errors: err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  // 2. Lỗi do dữ liệu người dùng gửi lên (trước đây bị trả nhầm 500 "Lỗi máy chủ")
  if (err instanceof MongooseError.CastError) {
    sendError(res, 400, 'Mã định danh không hợp lệ');
    return;
  }
  if (err instanceof MongooseError.ValidationError) {
    sendError(res, 400, Object.values(err.errors).map((e) => e.message).join(', '));
    return;
  }
  if (err instanceof MulterError) {
    sendError(res, 400, MULTER_MESSAGES[err.code] || 'File tải lên không hợp lệ');
    return;
  }
  if ('code' in err && err.code === 11000) {
    sendError(res, 409, 'Dữ liệu đã tồn tại trong hệ thống (bị trùng)');
    return;
  }

  // 3. Lỗi tùy biến từ Service (ví dụ: { status: 401, message: '...' })
  if ('status' in err && typeof err.status === 'number') {
    sendError(res, err.status, err.message || 'Yêu cầu không hợp lệ');
    return;
  }

  // 4. Lỗi hệ thống không mong muốn
  console.error('[System Error]:', err);
  sendError(res, 500, 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau.');
}
