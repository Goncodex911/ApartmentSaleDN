import { DedupService } from '../dedup/dedup.service.js';
import { uploadBufferToCloudinary } from '../../config/cloudinary.js';
import { User } from '../auth/user.model.js';

/**
 * Service quản lý Telegram Bot lắng nghe tin bài đăng theo cơ chế Long Polling
 * Áp dụng triết lý Ponytail: Dùng native fetch của Node.js, không cài thêm package nặng nề
 */
export class TelegramService {
  private static isRunning = false;
  private static lastUpdateId = 0;
  private static abortController: AbortController | null = null;

  public static getToken(): string | null {
    return process.env.TELEGRAM_BOT_TOKEN || null;
  }

  /**
   * Khởi động bot lắng nghe tin nhắn
   */
  public static async start(): Promise<void> {
    const token = this.getToken();
    if (!token) {
      console.log('ℹ️ [Telegram Bot] Không tìm thấy TELEGRAM_BOT_TOKEN trong .env. Bỏ qua khởi động bot.');
      return;
    }

    if (this.isRunning) return;
    this.isRunning = true;
    this.abortController = new AbortController();

    console.log('🚀 [Telegram Bot] Đang khởi động bot chế độ Long Polling...');

    // Chạy vòng lặp polling nền (không block main thread)
    this.pollUpdates(token).catch((err) => {
      console.error('❌ [Telegram Bot] Lỗi polling:', err.message);
    });
  }

  /**
   * Dừng bot êm ái
   */
  public static stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    console.log('⏹️ [Telegram Bot] Đã dừng bot lắng nghe.');
  }

  /**
   * Vòng lặp Long Polling nhận tin mới
   */
  private static async pollUpdates(token: string): Promise<void> {
    while (this.isRunning) {
      try {
        const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${this.lastUpdateId}&timeout=20`;
        const res = await fetch(url, { signal: this.abortController?.signal });
        if (!res.ok) {
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }

        const data = (await res.json()) as any;
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            this.lastUpdateId = update.update_id + 1;
            if (update.message) {
              // Xử lý tin nhắn bất đồng bộ, không chờ xong mới lấy tin tiếp
              this.handleIncomingMessage(token, update.message).catch((err) => {
                console.error('❌ [Telegram Bot] Lỗi xử lý tin nhắn:', err.message);
              });
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') break;
        // Chờ 3s trước khi thử lại nếu mất kết nối mạng
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  /**
   * Xử lý tin nhắn đến từ nhóm hoặc chat riêng
   */
  private static async handleIncomingMessage(token: string, message: any): Promise<void> {
    const rawText = message.text || message.caption || '';
    const chatId = message.chat.id;

    // Phản hồi lệnh /start
    if (rawText.trim() === '/start') {
      await this.sendMessage(
        token,
        chatId,
        '👋 Xin chào! Tôi là Bot Tự Động Thu Thập Tin BĐS.\n\nHãy thêm tôi vào các nhóm cho thuê phòng, tôi sẽ tự động bóc tách tin đăng và đẩy vào Kho Bảng hàng của hệ thống!',
        message.message_id
      );
      return;
    }

    if (!rawText || rawText.trim().length < 10) return;

    // 1. Tải ảnh từ Telegram và đẩy lên Cloudinary (nếu tin có kèm ảnh)
    const mediaUrls: string[] = [];
    if (message.photo && message.photo.length > 0) {
      try {
        // Lấy ảnh độ phân giải cao nhất (phần tử cuối mảng)
        const largestPhoto = message.photo[message.photo.length - 1];
        const fileRes = await fetch(
          `https://api.telegram.org/bot${token}/getFile?file_id=${largestPhoto.file_id}`
        );
        const fileData = (await fileRes.json()) as any;

        if (fileData.ok && fileData.result?.file_path) {
          const downloadUrl = `https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`;
          const imgRes = await fetch(downloadUrl);
          const arrayBuf = await imgRes.arrayBuffer();

          // Upload lên Cloudinary
          const uploadRes = await uploadBufferToCloudinary(
            Buffer.from(arrayBuf),
            'apartment_sale/telegram'
          );
          if (uploadRes?.secure_url) {
            mediaUrls.push(uploadRes.secure_url);
          }
        }
      } catch (err: any) {
        console.error('⚠️ [Telegram Bot] Không thể tải ảnh Cloudinary:', err.message);
      }
    }

    // 2. Tìm Manager để gắn quyền sở hữu
    const defaultManager = await User.findOne({ role: { $in: ['ADMIN', 'MANAGER'] } });
    const managerId = defaultManager ? String(defaultManager._id) : '000000000000000000000000';

    // 3. Đưa vào Pipeline bóc tách AI & Khử trùng lặp đa tầng
    const sourceName = message.chat.title || message.from?.first_name || 'Nhóm Telegram BĐS';
    const result = await DedupService.processListing({
      sourceType: 'TELEGRAM',
      sourceName,
      rawText,
      mediaUrls,
      managerId,
    });

    // 4. Phản hồi thông báo kết quả
    if (result.isRentalListing) {
      if (result.isDuplicate) {
        await this.sendMessage(
          token,
          chatId,
          `ℹ️ [GỘP TRÙNG LẶP] Tin đăng trùng với Căn Master trên hệ thống.\nĐã tự động cập nhật nguồn "${sourceName}" vào danh sách so sánh giá.`,
          message.message_id
        );
      } else {
        const apt = result.apartment;
        await this.sendMessage(
          token,
          chatId,
          `✅ [ĐÃ LƯU BẢNG HÀNG]\n🏢 Tiêu đề: ${apt.title}\n💰 Giá: ${apt.price.toLocaleString('vi-VN')} đ/tháng\n📍 Khu vực: ${apt.location.district}`,
          message.message_id
        );
      }
    }
  }

  /**
   * Helper gửi tin nhắn qua Telegram API
   */
  private static async sendMessage(
    token: string,
    chatId: string | number,
    text: string,
    replyToMessageId?: number
  ): Promise<void> {
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          reply_to_message_id: replyToMessageId,
        }),
      });
    } catch (_e) {
      // Bỏ qua lỗi gửi tin nhắn phản hồi
    }
  }
}

