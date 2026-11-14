import { DedupService } from '../dedup/dedup.service.js';
import { uploadBufferToCloudinary } from '../../config/cloudinary.js';
import { User } from '../auth/user.model.js';

// Telegram gửi album thành NHIỀU message cùng media_group_id (mỗi message 1 ảnh, chỉ 1 message có caption).
// Gom các message của album, chờ ALBUM_WAIT_MS kể từ ảnh cuối cùng rồi mới xử lý thành 1 bài đăng hoàn chỉnh.
const ALBUM_WAIT_MS = 2500;

const logError = (context: string) => (err: Error) => console.error(`❌ [Telegram Bot] ${context}:`, err.message);

/**
 * Service quản lý Telegram Bot lắng nghe tin bài đăng theo cơ chế Long Polling
 * Áp dụng triết lý Ponytail: Dùng native fetch của Node.js, không cài thêm package nặng nề
 */
export class TelegramService {
  private static isRunning = false;
  private static lastUpdateId = 0;
  private static abortController: AbortController | null = null;
  private static pendingAlbums = new Map<string, { messages: any[]; timer?: NodeJS.Timeout }>();

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
    this.pollUpdates(token).catch(logError('Lỗi polling'));
  }

  /**
   * Dừng bot êm ái (hủy cả các album đang chờ gom)
   */
  public static stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.abortController?.abort();
    this.abortController = null;
    for (const album of this.pendingAlbums.values()) clearTimeout(album.timer);
    this.pendingAlbums.clear();
    console.log('⏹️ [Telegram Bot] Đã dừng bot lắng nghe.');
  }

  /**
   * Vòng lặp Long Polling nhận tin mới (tin nhắn nhóm/chat riêng và bài đăng trong kênh)
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
            const message = update.message || update.channel_post;
            if (message) this.collectMessage(token, message);
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
   * Tin đơn → xử lý ngay. Tin thuộc album → gom vào nhóm, đặt lại hẹn giờ mỗi khi có ảnh mới của album.
   */
  public static collectMessage(token: string, message: any): void {
    const groupId = message.media_group_id;
    if (!groupId) {
      this.handlePost(token, [message]).catch(logError('Lỗi xử lý tin nhắn'));
      return;
    }

    const album = this.pendingAlbums.get(groupId) ?? { messages: [] };
    album.messages.push(message);
    clearTimeout(album.timer);
    album.timer = setTimeout(() => {
      this.pendingAlbums.delete(groupId);
      this.handlePost(token, album.messages).catch(logError('Lỗi xử lý album'));
    }, ALBUM_WAIT_MS);
    this.pendingAlbums.set(groupId, album);
  }

  /**
   * Xử lý 1 bài đăng hoàn chỉnh (1 tin đơn hoặc toàn bộ message của 1 album)
   */
  private static async handlePost(token: string, messages: any[]): Promise<void> {
    messages.sort((a, b) => a.message_id - b.message_id);
    const first = messages[0];
    const chatId = first.chat.id;
    // Không trả lời trong kênh: tin trả lời của bot sẽ hiện cho toàn bộ người theo dõi kênh
    const canReply = first.chat.type !== 'channel';
    // Caption của album có thể nằm ở bất kỳ ảnh nào
    const rawText: string = messages.map((m) => m.text || m.caption || '').find((text) => text.trim()) || '';

    // Phản hồi lệnh /start
    if (rawText.trim() === '/start') {
      await this.sendMessage(
        token,
        chatId,
        '👋 Xin chào! Tôi là Bot Tự Động Thu Thập Tin BĐS.\n\nHãy thêm tôi vào các nhóm cho thuê phòng, tôi sẽ tự động bóc tách tin đăng và đẩy vào Kho Bảng hàng của hệ thống!',
        first.message_id
      );
      return;
    }

    if (rawText.trim().length < 10) return;

    // Chỉ nhận tin từ các nhóm trong TELEGRAM_SOURCE_CHAT_IDS (nếu có cấu hình) → người lạ nhắn bot không đẩy được tin rác
    const allowedChatIds = (process.env.TELEGRAM_SOURCE_CHAT_IDS || '').split(',').map((id) => id.trim()).filter(Boolean);
    if (allowedChatIds.length > 0 && !allowedChatIds.includes(String(chatId))) return;

    // 1. Tải TOÀN BỘ ảnh của bài (bản độ phân giải cao nhất = phần tử cuối mảng photo) song song lên Cloudinary
    const photoFileIds: string[] = messages.flatMap((m) => (m.photo?.length ? [m.photo[m.photo.length - 1].file_id] : []));
    const uploads = await Promise.allSettled(photoFileIds.map((fileId) => this.uploadPhoto(token, fileId)));
    const mediaUrls = uploads.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
    const failedCount = uploads.length - mediaUrls.length;
    if (failedCount > 0) console.error(`⚠️ [Telegram Bot] Không tải được ${failedCount}/${uploads.length} ảnh của bài đăng`);

    // 2. Tìm Manager để gắn quyền sở hữu
    const defaultManager = await User.findOne({ role: { $in: ['ADMIN', 'MANAGER'] }, status: 'ACTIVE' });
    const managerId = defaultManager ? String(defaultManager._id) : '000000000000000000000000';

    // 3. Đưa vào Pipeline bóc tách AI & Khử trùng lặp đa tầng
    const sourceName = first.chat.title || first.from?.first_name || 'Nhóm Telegram BĐS';
    const result = await DedupService.processListing({
      sourceType: 'TELEGRAM',
      sourceName,
      rawText,
      mediaUrls,
      managerId,
    });

    // 4. Phản hồi thông báo kết quả
    if (!canReply || !result.isRentalListing) return;
    const replyText = result.isDuplicate
      ? `ℹ️ [GỘP TRÙNG LẶP] Tin đăng trùng với Căn Master trên hệ thống.\nĐã tự động cập nhật nguồn "${sourceName}" vào danh sách so sánh giá.`
      : `✅ [ĐÃ LƯU BẢNG HÀNG]\n🏢 Tiêu đề: ${result.apartment.title}\n💰 Giá: ${result.apartment.price.toLocaleString('vi-VN')} đ/tháng\n📍 Khu vực: ${result.apartment.location.district}\n🖼 Số ảnh: ${mediaUrls.length}`;
    await this.sendMessage(token, chatId, replyText, first.message_id);
  }

  /**
   * Tải 1 ảnh từ Telegram về rồi đẩy lên Cloudinary, trả về URL ảnh
   */
  public static async uploadPhoto(token: string, fileId: string): Promise<string> {
    const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    const fileData = (await fileRes.json()) as any;
    if (!fileData.ok || !fileData.result?.file_path) throw new Error('Không lấy được đường dẫn ảnh từ Telegram');

    const imgRes = await fetch(`https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`);
    if (!imgRes.ok) throw new Error(`Tải ảnh Telegram lỗi HTTP ${imgRes.status}`);

    const uploadRes = await uploadBufferToCloudinary(Buffer.from(await imgRes.arrayBuffer()), 'apartment_sale/telegram');
    return uploadRes.secure_url;
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
