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

interface PendingQrAuth {
  client: TelegramClient;
  tokenBase64: string;
  tgUrl: string;
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
  private static pendingQrAuths = new Map<string, PendingQrAuth>();
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
   * Phương thức 1: Khởi tạo phiên xác thực bằng Deep-link 1-Chạm (hoặc Quét mã QR)
   */
  public static async startQrAuth(userId: string) {
    const { apiId, apiHash } = this.getApiCredentials();

    // Dọn dẹp phiên QR cũ nếu có
    const old = this.pendingQrAuths.get(userId);
    if (old) {
      try { await old.client.disconnect(); } catch { /* ignore */ }
      this.pendingQrAuths.delete(userId);
    }

    const client = new TelegramClient(new StringSession(''), apiId, apiHash, {
      connectionRetries: 5,
      deviceModel: 'ApartmentSaleDN Web',
      systemVersion: 'Web/Node',
      appVersion: '1.0.0',
    });
    await client.connect();

    const res: any = await client.invoke(
      new Api.auth.ExportLoginToken({
        apiId,
        apiHash,
        exceptIds: [],
      })
    );

    if (!(res instanceof Api.auth.LoginToken)) {
      throw new Error('Không thể khởi tạo mã xác nhận Telegram');
    }

    const tokenBase64 = Buffer.from(res.token).toString('base64url');
    const tgUrl = `tg://login?token=${tokenBase64}`;
    const expiresAt = res.expires * 1000;

    this.pendingQrAuths.set(userId, {
      client,
      tokenBase64,
      tgUrl,
      expiresAt,
    });

    return {
      success: true,
      tgUrl,
      expiresAt,
    };
  }

  /**
   * Kiểm tra trạng thái người dùng đã xác nhận trên App Telegram qua Deep-link/QR hay chưa
   */
  public static async checkQrAuth(userId: string, password2FA?: string) {
    const pending = this.pendingQrAuths.get(userId);
    if (!pending) {
      return { status: 'EXPIRED', message: 'Mã xác thực đã hết hạn, vui lòng bấm thử lại' };
    }

    const { client } = pending;
    const { apiId, apiHash } = this.getApiCredentials();

    try {
      const res: any = await client.invoke(
        new Api.auth.ExportLoginToken({
          apiId,
          apiHash,
          exceptIds: [],
        })
      );

      let user: any = null;

      if (res instanceof Api.auth.LoginTokenSuccess && res.authorization instanceof Api.auth.Authorization) {
        user = res.authorization.user;
      } else if (res instanceof Api.auth.LoginTokenMigrateTo) {
        await (client as any)._switchDC(res.dcId);
        const migrated: any = await client.invoke(new Api.auth.ImportLoginToken({ token: res.token }));
        if (migrated instanceof Api.auth.LoginTokenSuccess && migrated.authorization instanceof Api.auth.Authorization) {
          user = migrated.authorization.user;
        }
      }

      if (user) {
        // Đã xác thực thành công trên Telegram!
        const sessionString = (client.session as StringSession).save();
        const { encrypted, iv, tag } = encryptSession(sessionString);

        await User.findByIdAndUpdate(userId, {
          telegramSession: {
            encryptedString: encrypted,
            iv,
            tag,
            phone: user.phone ? `+${user.phone}` : '',
            telegramUserId: user.id?.toString() || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            username: user.username || '',
            connectedAt: new Date(),
            isActive: true,
          },
        });

        this.pendingQrAuths.delete(userId);
        this.activeClients.set(userId, client);

        return {
          status: 'SUCCESS',
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone ? `+${user.phone}` : '',
            username: user.username,
          },
        };
      }

      return { status: 'WAITING' };
    } catch (err: any) {
      if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        if (!password2FA) {
          return { status: 'REQUIRES_2FA', message: 'Tài khoản yêu cầu mật khẩu xác thực 2 bước (2FA)' };
        }
        await client.signInWithPassword(
          { apiId, apiHash },
          {
            password: async () => password2FA,
            onError: (e) => { throw e; },
          }
        );
        const sessionString = (client.session as StringSession).save();
        const me: any = await client.getMe();
        const { encrypted, iv, tag } = encryptSession(sessionString);
        await User.findByIdAndUpdate(userId, {
          telegramSession: {
            encryptedString: encrypted,
            iv,
            tag,
            phone: me?.phone ? `+${me.phone}` : '',
            telegramUserId: me?.id?.toString() || '',
            firstName: me?.firstName || '',
            lastName: me?.lastName || '',
            username: me?.username || '',
            connectedAt: new Date(),
            isActive: true,
          },
        });
        this.pendingQrAuths.delete(userId);
        this.activeClients.set(userId, client);
        return { status: 'SUCCESS', user: { firstName: me?.firstName, phone: me?.phone } };
      }
      return { status: 'WAITING' };
    }
  }

  /**
   * Phương thức 2: Gửi mã OTP xác nhận tới ứng dụng Telegram của người dùng
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

    // 0. Nếu input là ID (số hoặc bắt đầu bằng -100), kiểm tra trong dialogs cache trước để phản hồi tức thì 0ms
    if (!isNaN(Number(clean)) || clean.startsWith('-100')) {
      try {
        const dialogs = await client.getDialogs({ limit: 100 });
        const cleanNoPrefix = clean.replace(/^-100/, '');
        const found = dialogs.find((d) => {
          const idStr = d.id?.toString();
          const entityIdStr = (d.entity as any)?.id?.toString();
          return (
            idStr === clean ||
            idStr === cleanNoPrefix ||
            entityIdStr === clean ||
            entityIdStr === cleanNoPrefix
          );
        });
        if (found && found.entity) return found.entity;
      } catch { /* ignore */ }
    }

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

    // 3. Entity ID số nguyên (hỗ trợ cả string và BigInt)
    try {
      return await client.getEntity(clean);
    } catch {
      try {
        return await client.getEntity(BigInt(clean) as any);
      } catch (err: any) {
        throw new Error(`Không thể tìm thấy nhóm Telegram (ID: ${clean}): ${err.message}`);
      }
    }
  }

  /**
   * Kiểm tra xem chuỗi có phải là số điện thoại hay không
   */
  public static isPhoneNumber(input: string): boolean {
    if (!input) return false;
    // Bỏ qua các ký tự định dạng phổ biến: khoảng trắng, dấu chấm, gạch ngang, ngoặc, dấu +
    const digits = input.replace(/[\s.\-+()]/g, '');
    // SĐT Việt Nam thông thường có 9 đến 12 chữ số
    return /^\d{9,12}$/.test(digits);
  }

  /**
   * Chuẩn hóa số điện thoại về dạng số thuần túy (bắt đầu bằng 0)
   */
  public static normalizeDomesticPhone(phone: string): string {
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('84') && digits.length >= 11) {
      digits = '0' + digits.slice(2);
    }
    return digits;
  }

  /**
   * Tạo biểu thức chính quy (Regex) bắt trúng số điện thoại bất kể người đăng viết cách nào
   * Ví dụ: SĐT 0905123456 sẽ khớp với:
   * "0905123456", "0905.123.456", "0905 123 456", "0905-123-456", "+84905123456", "+84 905 123 456"
   */
  public static buildPhoneRegex(phone: string): RegExp | null {
    const norm = this.normalizeDomesticPhone(phone);
    if (!norm || norm.length < 8) return null;

    // Lấy chuỗi số sau số 0 đầu tiên (ví dụ 0905123456 -> 905123456)
    const coreDigits = norm.startsWith('0') ? norm.slice(1) : norm;
    // Mỗi số có thể cách nhau bởi dấu chấm, khoảng trắng, gạch nối hoặc dấu ngoặc
    const sep = '[\\s.\\-()]*';
    const digitsPattern = coreDigits.split('').join(sep);

    // Bắt đầu bằng 0 hoặc (+84) hoặc +84 hoặc 84
    const prefixPattern = `(?:\\+?84|0)${sep}`;
    return new RegExp(`${prefixPattern}${digitsPattern}`, 'i');
  }

  /**
   * Chuẩn hóa chuỗi tiếng Việt không dấu để so sánh tên hoặc từ khóa
   */
  private static normalizeText(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  /**
   * So khớp toàn diện: Kiểm tra bài đăng (hoặc nhóm tin nhắn album) có khớp với định danh mục tiêu
   * Hỗ trợ:
   * 1. Số điện thoại trong nội dung bài viết (chuẩn 100% cho bài BĐS)
   * 2. Tên / từ khóa nhận diện trong nội dung bài viết (ví dụ: "LH: Trần Minh Hiếu")
   * 3. Tên người gửi Telegram (firstName, lastName, username, senderId)
   * 4. Tên tác giả bài đăng (postAuthor) hoặc tin chuyển tiếp (fwdFrom)
   */
  public static matchesTargetListing(
    msgOrGroup: any | any[],
    target: string,
    rawTextOverride?: string
  ): boolean {
    if (!target || !target.trim() || target.trim() === '*' || target.trim().toLowerCase() === 'all') {
      return true;
    }

    const targetTrimmed = target.trim();
    const isPhone = this.isPhoneNumber(targetTrimmed);
    const messages = Array.isArray(msgOrGroup) ? msgOrGroup : [msgOrGroup];

    // Gom toàn bộ nội dung văn bản trong bài đăng / album
    const combinedText = (
      rawTextOverride ||
      messages.map((m: any) => m.text || m.message || '').join('\n')
    ).trim();

    // 1. NẾU MỤC TIÊU LÀ SỐ ĐIỆN THOẠI
    if (isPhone) {
      const phoneRegex = this.buildPhoneRegex(targetTrimmed);
      if (phoneRegex && combinedText && phoneRegex.test(combinedText)) {
        return true;
      }

      // Kiểm tra thêm số điện thoại của người gửi nếu có trong danh bạ
      for (const msg of messages) {
        if (msg.sender?.phone) {
          const senderPhoneNorm = this.normalizeDomesticPhone(msg.sender.phone);
          const targetPhoneNorm = this.normalizeDomesticPhone(targetTrimmed);
          if (senderPhoneNorm === targetPhoneNorm) return true;
        }
      }

      // Nếu target là SĐT mà nội dung chưa khớp bằng Regex, thử so sánh chuỗi số thuần túy
      const cleanDigits = this.normalizeDomesticPhone(targetTrimmed);
      const textDigits = combinedText.replace(/\D/g, '');
      if (cleanDigits && textDigits.includes(cleanDigits)) {
        return true;
      }

      return false;
    }

    // 2. NẾU MỤC TIÊU LÀ TÊN / TỪ KHÓA / USERNAME
    const targetNorm = this.normalizeText(targetTrimmed.replace(/^@/, ''));

    // 2.1. So khớp trong nội dung bài viết (người đăng thường ghi "LH: [Tên]" trong bài)
    if (combinedText && this.normalizeText(combinedText).includes(targetNorm)) {
      return true;
    }

    // 2.2. So khớp với tài khoản người gửi Telegram (Sender Entity)
    for (const msg of messages) {
      const sender = msg.sender;
      if (sender) {
        const fullName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim();
        if (fullName && this.normalizeText(fullName).includes(targetNorm)) return true;
        if (sender.username && this.normalizeText(sender.username).includes(targetNorm)) return true;
        if (sender.id && sender.id.toString() === targetTrimmed) return true;
      }

      if (msg.senderId && msg.senderId.toString() === targetTrimmed) return true;

      // 2.3. So khớp tác giả bài viết của kênh (Channel post author)
      if (msg.postAuthor && this.normalizeText(msg.postAuthor).includes(targetNorm)) {
        return true;
      }

      // 2.4. So khớp tin chuyển tiếp (Forwarded message)
      if (msg.fwdFrom) {
        if (msg.fwdFrom.fromName && this.normalizeText(msg.fwdFrom.fromName).includes(targetNorm)) return true;
        if (msg.fwdFrom.fromId && msg.fwdFrom.fromId.toString() === targetTrimmed) return true;
      }
    }

    return false;
  }

  /**
   * Giữ hàm matchesSender để tương thích ngược
   */
  public static matchesSender(msg: any, target: string): boolean {
    return this.matchesTargetListing(msg, target);
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

    const isPhone = this.isPhoneNumber(options.targetSender);
    const filterDescription = isPhone
      ? `Số điện thoại "${options.targetSender}"`
      : `Người đăng / Từ khóa "${options.targetSender}"`;

    options.onProgress?.({
      log: `🔍 Đang quét tin trong "${chatTitle}" theo ${filterDescription}...`,
      percent: 15,
    });

    const messageMap = new Map<number, any>();

    // 1. Truy vấn trực tiếp từ máy chủ Telegram bằng search nếu có từ khóa / SĐT
    if (options.targetSender && options.targetSender.trim()) {
      const cleanTarget = options.targetSender.trim();
      const queries = [cleanTarget];
      if (isPhone) {
        const norm = this.normalizeDomesticPhone(cleanTarget);
        if (norm && norm !== cleanTarget) queries.push(norm);
      }

      for (const q of queries) {
        try {
          const searchMessages = await client.getMessages(entity, {
            search: q,
            limit: Math.max(limit * 3, 50),
          });
          for (const m of searchMessages) {
            messageMap.set(m.id, m);
          }
        } catch {
          // Nhóm không hỗ trợ server-side search hoặc lỗi query, tiếp tục quét lịch sử
        }
      }
    }

    // 2. Quét thêm tin nhắn mới nhất trong nhóm để đảm bảo không sót bài gần đây và lấy đủ Album ảnh
    try {
      const recentMessages = await client.getMessages(entity, {
        limit: Math.max(limit * 5, 80),
      });
      for (const m of recentMessages) {
        messageMap.set(m.id, m);
      }
    } catch (err: any) {
      console.warn('Lỗi lấy lịch sử tin nhắn gần đây:', err?.message);
    }

    const allMessages = Array.from(messageMap.values());

    // 3. Gom nhóm theo Album (groupedId) hoặc bài đơn lẻ trước khi lọc
    const postGroups = new Map<string, any[]>();
    for (const msg of allMessages) {
      const key = msg.groupedId ? msg.groupedId.toString() : `single_${msg.id}`;
      if (!postGroups.has(key)) postGroups.set(key, []);
      postGroups.get(key)!.push(msg);
    }

    // 4. Lọc các nhóm bài viết khớp với tiêu chí người dùng (SĐT trong bài hoặc Tên người đăng)
    const matchedGroups: any[][] = [];
    for (const groupMessages of postGroups.values()) {
      if (this.matchesTargetListing(groupMessages, options.targetSender)) {
        matchedGroups.push(groupMessages);
      }
    }

    if (matchedGroups.length === 0) {
      options.onProgress?.({
        log: `⚠️ Không tìm thấy bài đăng nào khớp với ${filterDescription} trong nhóm.`,
        percent: 100,
      });
      return { total: 0, apartments: [] };
    }

    const postsToProcess = matchedGroups.slice(0, limit);
    options.onProgress?.({
      log: `📋 Tìm thấy ${matchedGroups.length} bài đăng phù hợp (${postsToProcess.length} bài được chọn). Bắt đầu tải album ảnh & nạp kho...`,
      percent: 25,
    });

    const results: any[] = [];
    let processed = 0;

    for (const postMessages of postsToProcess) {
      processed++;
      const currentPercent = 25 + Math.round((processed / postsToProcess.length) * 70);

      // Sắp xếp theo ID tin nhắn
      postMessages.sort((a, b) => a.id - b.id);
      const textParts = postMessages.map((m: any) => (m.text || m.message || '').trim()).filter(Boolean);
      const rawText = textParts.join('\n\n');

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
