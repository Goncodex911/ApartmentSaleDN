import { record } from '../health/service-health.js';

/**
 * Story 18.3: lỗi Telegram → thông điệp tiếng Việt + việc cần làm + mã nội bộ để giao diện xử lý (đếm ngược, quay về màn hình kết nối...).
 * Không đưa số điện thoại, mã, token vào thông điệp.
 */
export class TelegramUserError extends Error {
  constructor(message: string, readonly code: string, readonly retryAfterSec?: number) {
    super(message);
  }
}

// Telegram đã hủy phiên: người dùng đăng xuất thiết bị, phiên bị dùng ở 2 nơi cùng lúc (deploy chồng), tài khoản bị khóa...
export const DEAD_SESSION_ERRORS = new Set(['SESSION_REVOKED', 'SESSION_EXPIRED', 'AUTH_KEY_UNREGISTERED', 'AUTH_KEY_DUPLICATED']);

export const sessionDeadError = () =>
  new TelegramUserError(
    'Telegram đã thu hồi phiên đăng nhập (thiết bị bị đăng xuất hoặc phiên bị dùng ở nơi khác). Vui lòng kết nối lại tài khoản.',
    'TELEGRAM_SESSION_DEAD'
  );

const MESSAGES: Record<string, [string, string]> = {
  PHONE_NUMBER_INVALID: ['Số điện thoại không đúng định dạng Telegram (VD 0905 123 456).', 'TELEGRAM_PHONE_INVALID'],
  PHONE_NUMBER_UNOCCUPIED: ['Số này chưa đăng ký Telegram.', 'TELEGRAM_PHONE_UNREGISTERED'],
  PHONE_CODE_INVALID: ['Mã không đúng, vui lòng kiểm tra lại.', 'TELEGRAM_CODE_INVALID'],
  PHONE_CODE_EXPIRED: ['Mã đã hết hạn, vui lòng gửi mã mới.', 'TELEGRAM_CODE_EXPIRED'],
  PHONE_CODE_EMPTY: ['Mã đã hết hạn, vui lòng gửi mã mới.', 'TELEGRAM_CODE_EXPIRED'],
  PHONE_NUMBER_BANNED: ['Tài khoản Telegram đang bị hạn chế. Hãy dùng cách chuyển tiếp bài cho Bot.', 'TELEGRAM_ACCOUNT_RESTRICTED'],
  USER_DEACTIVATED: ['Tài khoản Telegram đang bị hạn chế. Hãy dùng cách chuyển tiếp bài cho Bot.', 'TELEGRAM_ACCOUNT_RESTRICTED'],
  USER_DEACTIVATED_BAN: ['Tài khoản Telegram đang bị hạn chế. Hãy dùng cách chuyển tiếp bài cho Bot.', 'TELEGRAM_ACCOUNT_RESTRICTED'],
  PASSWORD_HASH_INVALID: ['Mật khẩu xác thực 2 lớp (2FA) không đúng.', 'TELEGRAM_2FA_INVALID'],
  SESSION_PASSWORD_NEEDED: ['Tài khoản bật xác thực 2 lớp, nhập thêm mật khẩu 2FA.', 'TELEGRAM_2FA_REQUIRED'],
  API_ID_INVALID: ['Cấu hình ứng dụng Telegram trên máy chủ không hợp lệ — báo Admin kiểm tra TELEGRAM_API_ID.', 'TELEGRAM_APP_CONFIG'],
  API_ID_PUBLISHED_FLOOD: ['Ứng dụng Telegram của hệ thống đang bị Telegram giới hạn — báo Admin.', 'TELEGRAM_APP_CONFIG'],
  AUTH_RESTART: ['Telegram yêu cầu bắt đầu lại, vui lòng gửi mã mới.', 'TELEGRAM_AUTH_RESTART'],
};

/** Lỗi do hệ thống (không phải người dùng nhập sai) → ghi Sức khỏe hệ thống để Admin thấy */
const SYSTEM_CODES = new Set(['TELEGRAM_APP_CONFIG', 'TELEGRAM_UNKNOWN']);

export function toTelegramError(err: any): Error {
  if (err instanceof TelegramUserError) return err;
  const rpc: string | undefined = err?.errorMessage;
  if (!rpc) return err instanceof Error ? err : new Error(String(err)); // Lỗi không phải của Telegram (DB, mạng nội bộ) → giữ nguyên

  let result: TelegramUserError;
  if (typeof err.seconds === 'number' && /FLOOD/.test(rpc)) {
    const minutes = Math.max(1, Math.ceil(err.seconds / 60));
    result = new TelegramUserError(`Thử quá nhiều lần, Telegram tạm khóa. Vui lòng chờ khoảng ${minutes} phút.`, 'TELEGRAM_FLOOD_WAIT', err.seconds);
  } else if (DEAD_SESSION_ERRORS.has(rpc)) {
    result = sessionDeadError();
  } else if (MESSAGES[rpc]) {
    const [message, code] = MESSAGES[rpc];
    result = new TelegramUserError(message, code);
  } else {
    result = new TelegramUserError(`Telegram đang gặp sự cố, vui lòng thử lại sau ít phút (mã lỗi: ${rpc}).`, 'TELEGRAM_UNKNOWN');
  }
  if (SYSTEM_CODES.has(result.code)) record('telegram', 'error', `Userbot: ${rpc}`);
  return result;
}
