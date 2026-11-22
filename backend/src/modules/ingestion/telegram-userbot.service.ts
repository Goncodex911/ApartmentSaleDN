import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage } from 'telegram/events/index.js';
import { User } from '../auth/user.model.js';
import { encryptSession, decryptSession } from '../../utils/crypto.util.js';
import { uploadBufferToCloudinary } from '../../config/cloudinary.js';
import { DedupService } from '../dedup/dedup.service.js';

interface PendingAuth {
  client: TelegramClient;
  phone: string;
  phoneCodeHash: string;
  expiresAt: number;
}

interface ActiveListener {
  client: TelegramClient;
  handler: (event: any) => Promise<void>;
  chatId: string;
  chatTitle: string;
  targetSender: string;
  startedAt: Date;
}

export class TelegramUserbotService {
  private static pendingAuths = new Map<string, PendingAuth>();
  private static activeClients = new Map<string, TelegramClient>();
  private static activeListeners = new Map<string, ActiveListener>();

  public static getApiCredentials() {
    const apiId = Number(process.env.TELEGRAM_API_ID) || 37371278;
    const apiHash = process.env.TELEGRAM_API_HASH || '36cd753822cc435b19171a77f08076b9';
    return { apiId, apiHash };
  }

  /**
   * Chuẩn hóa số điện thoại về định dạng quốc tế Telegram (+84...)
   */
  public static normalizePhone(phone: string): string {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '84' + clean.slice(1);
    }
    return clean.startsWith('+') ? clean : `+${clean}`;
  }

  /**
   * Bước 1: Gửi mã OTP xác nhận tới ứng dụng Telegram của người dùng
   */
  public static async sendAuthCode(userId: string, rawPhone: string) {
    const { apiId, apiHash } = this.getApiCredentials();
    const phone = this.normalizePhone(rawPhone);

    // Dọn dẹp phiên chờ cũ nếu có
    const oldPending = this.pendingAuths.get(userId);
    if (oldPending) {
      try { await oldPending.client.disconnect(); } catch { /* ignore */ }
      this.pendingAuths.delete(userId);
    }

    const client = new TelegramClient(new StringSession(''), apiId, apiHash, {
      connectionRetries: 5,
    });
    await client.connect();

    const res = await client.sendCode({ apiId, apiHash }, phone);
    this.pendingAuths.set(userId, {
      client,
      phone,
      phoneCodeHash: res.phoneCodeHash,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 phút
    });

    return {
      success: true,
      phone,
      phoneCodeHash: res.phoneCodeHash,
      isCodeViaApp: res.isCodeViaApp,
    };
  }

  /**
   * Bước 2: Xác thực mã OTP và lưu chuỗi Session mã hóa vào DB
   */
  public static async verifyAuthCode(
    userId: string,
    phone: string,
    phoneCodeHash: string,
    code: string,
    password?: string
  ) {
    const { apiId, apiHash } = this.getApiCredentials();
    const normPhone = this.normalizePhone(phone);
    const pending = this.pendingAuths.get(userId);

    let client: TelegramClient;
    if (pending && pending.phone === normPhone && pending.expiresAt > Date.now()) {
      client = pending.client;
    } else {
      client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5 });
      await client.connect();
    }

    try {
      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: normPhone,
          phoneCodeHash,
          phoneCode: code.trim(),
        })
      );
    } catch (err: any) {
      if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        if (!password) {
          return { requires2FA: true, message: 'Tài khoản yêu cầu mật khẩu xác thực 2 lớp (2FA).' };
        }
        await client.signInWithPassword(
          { apiId, apiHash },
          {
            password: async () => password,
            onError: (err: any) => {
              throw err;
            },
          }
        );
      } else {
        throw new Error(err.message || 'Mã xác thực Telegram không hợp lệ');
      }
    }

    const sessionString = (client.session as StringSession).save();
    const me: any = await client.getMe();
    const { encrypted, iv, tag } = encryptSession(sessionString);

    await User.findByIdAndUpdate(userId, {
      telegramSession: {
        encryptedString: encrypted,
        iv,
        tag,
        phone: normPhone,
        telegramUserId: me?.id?.toString() || '',
        firstName: me?.firstName || '',
        lastName: me?.lastName || '',
        username: me?.username || '',
        connectedAt: new Date(),
        isActive: true,
      },
    });

    this.pendingAuths.delete(userId);
    this.activeClients.set(userId, client);

    return {
      success: true,
      user: {
        phone: normPhone,
        firstName: me?.firstName || '',
        lastName: me?.lastName || '',
        username: me?.username || '',
      },
    };
  }

  /**
   * Ngắt kết nối phiên Telegram cá nhân
   */
  public static async disconnect(userId: string) {
    // Dừng listener nếu có
    await this.stopRealtimeListener(userId);

    const client = this.activeClients.get(userId);
    if (client) {
      try { await client.disconnect(); } catch { /* ignore */ }
      this.activeClients.delete(userId);
    }

    await User.findByIdAndUpdate(userId, { $unset: { telegramSession: 1 } });
    return { success: true };
  }

  /**
   * Lấy hoặc kích hoạt lại Client cho người dùng
   */
  public static async getClient(userId: string): Promise<TelegramClient | null> {
    const existing = this.activeClients.get(userId);
    if (existing && existing.connected) return existing;

    const user = await User.findById(userId).select('+telegramSession');
    if (!user || !user.telegramSession || !user.telegramSession.isActive) return null;

    const { apiId, apiHash } = this.getApiCredentials();
    const sessionString = decryptSession(
      user.telegramSession.encryptedString,
      user.telegramSession.iv,
      user.telegramSession.tag
    );

    const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
      connectionRetries: 5,
    });
    await client.connect();
    this.activeClients.set(userId, client);
    return client;
  }

  /**
   * Lấy trạng thái phiên Telegram hiện tại
   */
  public static async getStatus(userId: string) {
    const user = await User.findById(userId);
    if (!user?.telegramSession?.isActive) {
      return { isConnected: false };
    }
    return {
      isConnected: true,
      user: {
        phone: user.telegramSession.phone,
        firstName: user.telegramSession.firstName,
        lastName: user.telegramSession.lastName,
        username: user.telegramSession.username,
        connectedAt: user.telegramSession.connectedAt,
      },
    };
  }

  /**
   * Lấy danh sách các nhóm/kênh tài khoản đang tham gia (Dialogs)
   */
  public static async getDialogs(userId: string) {
    const client = await this.getClient(userId);
    if (!client) throw new Error('Chưa kết nối tài khoản Telegram cá nhân');

    const dialogs = await client.getDialogs({ limit: 100 });
    return dialogs
      .filter((d) => d.isChannel || d.isGroup)
      .map((d) => ({
        id: d.id?.toString(),
        title: d.title || d.name || 'Nhóm BĐS',
        isChannel: !!d.isChannel,
        isGroup: !!d.isGroup,
        username: (d.entity as any)?.username || null,
      }));
  }

  /**
   * Tìm và giải mã Entity nhóm chat (Hỗ trợ cả link công khai, link mời kín t.me/+... và ID)
   */
  public static async resolveAndJoinChat(client: TelegramClient, input: string): Promise<any> {
    const clean = input.trim();

    // 1. Kiểm tra link mời nhóm kín dạng t.me/+... hoặc t.me/joinchat/...
    const inviteMatch = clean.match(/(?:t\.me\/|telegram\.me\/)(?:\+|joinchat\/)([a-zA-Z0-9_-]+)/);
    if (inviteMatch) {
      const hash = inviteMatch[1];
      try {
        const res: any = await client.invoke(new Api.messages.ImportChatInvite({ hash }));
        return res?.chats?.[0] || res;
      } catch (err: any) {
        if (err.errorMessage !== 'USER_ALREADY_PARTICIPANT') {
          throw new Error(`Không thể tham gia nhóm kín qua link mời: ${err.errorMessage || err.message}`);
        }
      }
    }

    // 2. Link công khai t.me/username hoặc @username
    const usernameMatch = clean.match(/(?:t\.me\/|telegram\.me\/|@)?([a-zA-Z0-9_]{4,})/);
    if (usernameMatch && isNaN(Number(clean))) {
      const username = usernameMatch[1];
      try {
        await client.invoke(new Api.channels.JoinChannel({ channel: username }));
      } catch {
        // Đã ở trong nhóm hoặc là chat cá nhân/siêu nhóm đã tham gia
      }
      return await client.getEntity(username);
    }

    // 3. Entity ID số nguyên
    return await client.getEntity(clean);
  }

  /**
   * Chuẩn hóa chuỗi tiếng Việt không dấu để so sánh tên người gửi
   */
  private static normalizeText(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  /**
   * Kiểm tra xem tin nhắn có phải do người đăng mục tiêu đăng hay không
   */
  public static matchesSender(msg: any, target: string): boolean {
    if (!target || !target.trim()) return true;
    const targetNorm = this.normalizeText(target.replace(/^@/, ''));

    // Kiểm tra sender entity
    const sender = msg.sender;
    if (sender) {
      const fullName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim();
      if (fullName && this.normalizeText(fullName).includes(targetNorm)) return true;
      if (sender.username && this.normalizeText(sender.username).includes(targetNorm)) return true;
      if (sender.id && sender.id.toString() === target.trim()) return true;
    }

    // Kiểm tra senderId
    if (msg.senderId && msg.senderId.toString() === target.trim()) return true;

    // Kiểm tra tin chuyển tiếp
    if (msg.fwdFrom) {
      if (msg.fwdFrom.fromName && this.normalizeText(msg.fwdFrom.fromName).includes(targetNorm)) return true;
      if (msg.fwdFrom.fromId && msg.fwdFrom.fromId.toString() === target.trim()) return true;
    }

    return false;
  }

  /**
   * Cào các bài đăng quá khứ của người đăng mục tiêu trong nhóm
   */
  public static async scrapeTargetSender(
    userId: string,
    options: {
      chatInput: string;
      targetSender: string;
      limit?: number;
      onProgress?: (progress: { log: string; percent: number; item?: any }) => void;
    }
  ) {
    const client = await this.getClient(userId);
    if (!client) throw new Error('Chưa kết nối tài khoản Telegram cá nhân');

    const limit = Math.min(100, Math.max(options.limit || 20, 5));
    options.onProgress?.({ log: `⏳ Đang kết nối và mở nhóm Telegram...`, percent: 5 });

    const entity = await this.resolveAndJoinChat(client, options.chatInput);
    const chatTitle = (entity as any).title || (entity as any).username || 'Nhóm BĐS';
    const chatId = (entity as any).id?.toString() || options.chatInput;

    options.onProgress?.({
      log: `🔍 Đang quét tin trong "${chatTitle}" để tìm bài của "${options.targetSender}"...`,
      percent: 15,
    });

    // Lấy tin nhắn (lấy dôi ra để gom đủ các bài theo tiêu chí lọc)
    const messages = await client.getMessages(entity, { limit: Math.max(limit * 4, 60) });

    // Lọc các tin nhắn của người đăng mục tiêu
    const targetMessages = messages.filter((m: any) => this.matchesSender(m, options.targetSender));
    if (targetMessages.length === 0) {
      options.onProgress?.({
        log: `⚠️ Không tìm thấy bài đăng nào của "${options.targetSender}" trong lịch sử gần đây của nhóm.`,
        percent: 100,
      });
      return { total: 0, apartments: [] };
    }

    // Gom nhóm các message thuộc cùng Album (groupedId)
    const postGroups = new Map<string, any[]>();
    for (const msg of targetMessages) {
      const key = msg.groupedId ? msg.groupedId.toString() : `single_${msg.id}`;
      if (!postGroups.has(key)) postGroups.set(key, []);
      postGroups.get(key)!.push(msg);
    }

    const postsToProcess = Array.from(postGroups.values()).slice(0, limit);
    options.onProgress?.({
      log: `📋 Tìm thấy ${postsToProcess.length} bài đăng của "${options.targetSender}". Bắt đầu tải album ảnh & nạp kho...`,
      percent: 25,
    });

    const results: any[] = [];
    let processed = 0;

    for (const postMessages of postsToProcess) {
      processed++;
      const currentPercent = 25 + Math.round((processed / postsToProcess.length) * 70);

      // Sắp xếp theo ID tin nhắn
      postMessages.sort((a, b) => a.id - b.id);
      const rawText = postMessages.map((m: any) => m.text || m.message || '').find((t: string) => t.trim().length > 10) || '';

      if (rawText.trim().length < 10) {
        options.onProgress?.({
          log: `[${processed}/${postsToProcess.length}] Bỏ qua bài đăng ngắn/không có mô tả chi tiết`,
          percent: currentPercent,
        });
        continue;
      }

      // Tải ảnh trực tiếp từ CDN Telegram lên Cloudinary
      const mediaUrls: string[] = [];
      const messagesWithMedia = postMessages.filter((m: any) => Boolean(m.media));

      options.onProgress?.({
        log: `[${processed}/${postsToProcess.length}] Đang tải ${messagesWithMedia.length} ảnh lên Cloudinary...`,
        percent: currentPercent,
      });

      for (const m of messagesWithMedia) {
        try {
          const buffer: any = await client.downloadMedia(m.media, {});
          if (buffer && Buffer.isBuffer(buffer)) {
            const uploadRes = await uploadBufferToCloudinary(buffer, 'apartment_sale/telegram');
            if (uploadRes?.secure_url) mediaUrls.push(uploadRes.secure_url);
          }
        } catch (err: any) {
          console.error('Lỗi tải ảnh từ Telegram CDN:', err?.message);
        }
      }

      // Đưa vào Dedup & AI Ingestion pipeline
      const sourceName = `${chatTitle} - ${options.targetSender}`;
      try {
        const dedupRes = await DedupService.processListing({
          sourceType: 'TELEGRAM',
          sourceName,
          rawText,
          mediaUrls,
          managerId: userId,
          sourceChatId: chatId,
        });

        if (dedupRes.apartment) {
          results.push(dedupRes.apartment);
          options.onProgress?.({
            log: `[${processed}/${postsToProcess.length}] ✅ Đã nạp: "${dedupRes.apartment.title}" (${dedupRes.isDuplicate ? 'Gộp trùng' : 'Căn mới'})`,
            percent: currentPercent,
            item: dedupRes.apartment,
          });
        }
      } catch (err: any) {
        options.onProgress?.({
          log: `[${processed}/${postsToProcess.length}] ❌ Lỗi bóc tách AI: ${err.message}`,
          percent: currentPercent,
        });
      }

      // Giãn cách an toàn 1.5 giây giữa các bài cào (Anti-Flood Rate Limit)
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    options.onProgress?.({
      log: `🎉 Hoàn tất! Đã nạp thành công ${results.length} căn hộ vào hệ thống.`,
      percent: 100,
    });

    return { total: results.length, apartments: results };
  }

  /**
   * Khởi chạy Background Daemon lắng nghe tin nhắn mới thời gian thực
   */
  public static async startRealtimeListener(userId: string, chatInput: string, targetSender: string) {
    const client = await this.getClient(userId);
    if (!client) throw new Error('Chưa kết nối tài khoản Telegram cá nhân');

    // Dừng listener cũ nếu đang chạy
    await this.stopRealtimeListener(userId);

    const entity = await this.resolveAndJoinChat(client, chatInput);
    const chatTitle = (entity as any).title || (entity as any).username || 'Nhóm BĐS';
    const chatId = (entity as any).id?.toString() || chatInput;

    const handler = async (event: any) => {
      const msg = event.message;
      if (!msg) return;

      if (!this.matchesSender(msg, targetSender)) return;

      const rawText = msg.text || msg.message || '';
      if (rawText.trim().length < 10) return;

      console.log(`⚡ [Telegram Real-time] Phát hiện bài mới của ${targetSender} trong ${chatTitle}`);

      const mediaUrls: string[] = [];
      if (msg.media) {
        try {
          const buffer: any = await client.downloadMedia(msg.media, {});
          if (buffer && Buffer.isBuffer(buffer)) {
            const uploadRes = await uploadBufferToCloudinary(buffer, 'apartment_sale/telegram');
            if (uploadRes?.secure_url) mediaUrls.push(uploadRes.secure_url);
          }
        } catch { /* ignore */ }
      }

      try {
        await DedupService.processListing({
          sourceType: 'TELEGRAM',
          sourceName: `${chatTitle} - ${targetSender}`,
          rawText,
          mediaUrls,
          managerId: userId,
          sourceChatId: chatId,
        });
      } catch (err: any) {
        console.error('Lỗi nạp tin thời gian thực:', err.message);
      }
    };

    client.addEventHandler(handler, new NewMessage({ chats: [entity] }));
    this.activeListeners.set(userId, {
      client,
      handler,
      chatId,
      chatTitle,
      targetSender,
      startedAt: new Date(),
    });

    return { success: true, chatTitle, targetSender };
  }

  /**
   * Dừng lắng nghe tin thời gian thực
   */
  public static async stopRealtimeListener(userId: string) {
    const active = this.activeListeners.get(userId);
    if (active) {
      try {
        active.client.removeEventHandler(active.handler, new NewMessage({}));
      } catch { /* ignore */ }
      this.activeListeners.delete(userId);
    }
    return { success: true };
  }

  /**
   * Lấy trạng thái của bộ lắng nghe thời gian thực
   */
  public static getRealtimeListenerStatus(userId: string) {
    const active = this.activeListeners.get(userId);
    if (!active) return { isListening: false };
    return {
      isListening: true,
      chatTitle: active.chatTitle,
      targetSender: active.targetSender,
      startedAt: active.startedAt,
    };
  }
}
