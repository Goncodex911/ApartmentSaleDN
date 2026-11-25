import type { CodeChannel, CodeDelivery } from '../../../api/telegramUserbotApi.js';

/** Story 18.1: nói đúng nơi Telegram gửi mã — không còn luôn ghi "ứng dụng Telegram" */
export function deliveryText(delivery: CodeDelivery, phoneMasked: string): { title: string; hint: string } {
  switch (delivery.channel) {
    case 'APP':
      return { title: 'Mã đã gửi vào ứng dụng Telegram', hint: 'Mở chat "Telegram" (có dấu tích xanh) trên thiết bị bạn đang đăng nhập Telegram.' };
    case 'EMAIL':
      return { title: `Mã đã gửi tới email ${delivery.emailPattern ?? 'đăng nhập của bạn'}`, hint: 'Xem cả thư mục Spam / Quảng cáo. Email gửi từ Telegram.' };
    case 'SMS':
      return { title: `Mã đã gửi bằng tin nhắn SMS tới ${phoneMasked}`, hint: 'Tin nhắn có thể tới chậm 1–2 phút.' };
    case 'CALL':
      return { title: `Telegram sẽ gọi tới ${phoneMasked} để đọc mã`, hint: 'Nghe máy và ghi lại mã được đọc.' };
    case 'MISSED_CALL':
      return { title: `Telegram sẽ gọi nhỡ tới ${phoneMasked}`, hint: `Mã là các số cuối của số gọi tới${delivery.missedCallPrefix ? ` (bắt đầu bằng ${delivery.missedCallPrefix})` : ''}.` };
    case 'FRAGMENT':
      return { title: 'Mã được gửi qua Fragment', hint: 'Mở trang Fragment bên dưới để xem mã của số ảo.' };
    case 'SETUP_EMAIL':
      return {
        title: 'Telegram yêu cầu thiết lập email đăng nhập trước',
        hint: 'Mở ứng dụng Telegram → Cài đặt → Quyền riêng tư & Bảo mật → Email đăng nhập, thiết lập email rồi bấm "Bắt đầu lại".',
      };
    case 'FIREBASE':
      return {
        title: 'Telegram không gửi được mã cho ứng dụng này',
        hint: 'Hãy dùng cách quét mã QR trên máy tính, hoặc chuyển tiếp bài cho Bot của hệ thống.',
      };
    default:
      return { title: `Telegram đã gửi mã tới ${phoneMasked}`, hint: 'Kiểm tra ứng dụng Telegram, tin nhắn SMS và email đăng nhập.' };
  }
}

export const RESEND_LABEL: Partial<Record<CodeChannel, string>> = {
  SMS: 'Gửi lại qua SMS',
  CALL: 'Gọi điện đọc mã',
  MISSED_CALL: 'Gửi qua cuộc gọi nhỡ',
  FRAGMENT: 'Gửi qua Fragment',
};

/** Lỗi API Telegram → { message, code, retryAfterSec } (Story 18.3) */
export const apiError = (err: any, fallback: string) => ({
  message: (err?.response?.data?.message as string) || err?.message || fallback,
  code: err?.response?.data?.code as string | undefined,
  retryAfterSec: err?.response?.data?.retryAfterSec as number | undefined,
});

// Telegram tạm khóa (FLOOD_WAIT): nhớ mốc mở khóa trên máy này để tải lại trang vẫn đếm ngược
const FLOOD_KEY = 'tg-flood-until';
export const readFloodUntil = (): number | null => {
  try {
    const value = Number(localStorage.getItem(FLOOD_KEY));
    return value > Date.now() ? value : null;
  } catch {
    return null;
  }
};
export const saveFloodUntil = (until: number) => {
  try {
    localStorage.setItem(FLOOD_KEY, String(until));
  } catch {
    /* Trình duyệt chặn bộ nhớ → chỉ đếm ngược trong phiên này */
  }
};
