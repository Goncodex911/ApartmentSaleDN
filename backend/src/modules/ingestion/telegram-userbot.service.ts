import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { User } from '../auth/user.model.js';
import { encryptSession, decryptSession } from '../../utils/crypto.util.js';
import { TelegramHarvestService } from './telegram-harvest.service.js';

interface PendingAuth {
  client: TelegramClient;
  phone: string;
  phoneCodeHash: string;
  expiresAt: number;
}

interface PendingQrAuth {
  client: TelegramClient;
  expiresAt: number;
}

const OTP_TTL_MS = 10 * 60 * 1000;

export class TelegramUserbotService {
  private static pendingAuths = new Map<string, PendingAuth>();
  private static pendingQrAuths = new Map<string, PendingQrAuth>();
  private static activeClients = new Map<string, TelegramClient>();
  private static connecting = new Map<string, Promise<TelegramClient | null>>();

  /** API ID / Hash của ứng dụng Telegram (lấy tại my.telegram.org → API development tools) */
  public static getApiCredentials() {
    const apiId = Number(process.env.TELEGRAM_API_ID);
    const apiHash = process.env.TELEGRAM_API_HASH;
    if (!apiId || !apiHash) throw new Error('Chưa cấu hình TELEGRAM_API_ID / TELEGRAM_API_HASH trong biến môi trường');
    return { apiId, apiHash };
  }

  private static newClient(session = '') {
    const { apiId, apiHash } = this.getApiCredentials();
    return new TelegramClient(new StringSession(session), apiId, apiHash, {
      connectionRetries: 5,
      deviceModel: 'ApartmentSaleDN Web',
      systemVersion: 'Web/Node',
      appVersion: '1.0.0',
    });
  }

  /** Phiên đăng nhập chờ quá hạn → tự ngắt kết nối để không giữ socket tới Telegram mãi */
  private static expireLater<T extends { client: TelegramClient }>(store: Map<string, T>, userId: string, entry: T, ttlMs: number) {
    setTimeout(() => {
      if (store.get(userId) !== entry) return;
      store.delete(userId);
      entry.client.disconnect().catch(() => undefined);
    }, ttlMs).unref();
  }

  private static async dropPending<T extends { client: TelegramClient }>(store: Map<string, T>, userId: string) {
    const old = store.get(userId);
    if (!old) return;
    store.delete(userId);
    await old.client.disconnect().catch(() => undefined);
  }

  /** Chuẩn hóa SĐT về định dạng quốc tế Telegram (+84...) */
  public static normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return `+${digits.startsWith('0') ? `84${digits.slice(1)}` : digits}`;
  }

  /** Mã hóa và lưu phiên vào DB sau khi đăng nhập thành công */
  private static async saveSession(userId: string, client: TelegramClient, phoneOverride?: string) {
    const me: any = await client.getMe();
    const { encrypted, iv, tag } = encryptSession((client.session as StringSession).save());
    const phone = phoneOverride || (me?.phone ? `+${me.phone}` : '');
    await User.findByIdAndUpdate(userId, {
      telegramSession: {
        encryptedString: encrypted,
        iv,
        tag,
        phone,
        telegramUserId: me?.id?.toString() || '',
        firstName: me?.firstName || '',
        lastName: me?.lastName || '',
        username: me?.username || '',
        connectedAt: new Date(),
        isActive: true,
      },
    });
    this.activeClients.set(userId, client);
    return { phone, firstName: me?.firstName || '', lastName: me?.lastName || '', username: me?.username || '' };
  }

  /** Cách 1: đăng nhập 1-chạm qua deep-link tg://login (hoặc quét QR) */
  public static async startQrAuth(userId: string) {
    const { apiId, apiHash } = this.getApiCredentials();
    await this.dropPending(this.pendingQrAuths, userId);

    const client = this.newClient();
    await client.connect();
    const res: any = await client.invoke(new Api.auth.ExportLoginToken({ apiId, apiHash, exceptIds: [] }));
    if (!(res instanceof Api.auth.LoginToken)) {
      await client.disconnect().catch(() => undefined);
      throw new Error('Không thể khởi tạo mã xác nhận Telegram');
    }

    const expiresAt = res.expires * 1000;
    const entry = { client, expiresAt };
    this.pendingQrAuths.set(userId, entry);
    this.expireLater(this.pendingQrAuths, userId, entry, Math.max(expiresAt - Date.now(), 0) + 60_000);

    return { success: true, tgUrl: `tg://login?token=${Buffer.from(res.token).toString('base64url')}`, expiresAt };
  }

  /** Kiểm tra người dùng đã bấm xác nhận trên app Telegram chưa */
  public static async checkQrAuth(userId: string, password2FA?: string) {
    const pending = this.pendingQrAuths.get(userId);
    if (!pending) return { status: 'EXPIRED', message: 'Mã xác thực đã hết hạn, vui lòng tạo mã mới' };

    const { client } = pending;
    const { apiId, apiHash } = this.getApiCredentials();

    try {
      let res: any = await client.invoke(new Api.auth.ExportLoginToken({ apiId, apiHash, exceptIds: [] }));
      if (res instanceof Api.auth.LoginTokenMigrateTo) {
        await (client as any)._switchDC(res.dcId);
        res = await client.invoke(new Api.auth.ImportLoginToken({ token: res.token }));
      }
      if (!(res instanceof Api.auth.LoginTokenSuccess)) return { status: 'WAITING' };
    } catch (err: any) {
      if (err.errorMessage !== 'SESSION_PASSWORD_NEEDED') return { status: 'WAITING' };
      if (!password2FA) return { status: 'REQUIRES_2FA', message: 'Tài khoản yêu cầu mật khẩu xác thực 2 bước (2FA)' };
      try {
        await client.signInWithPassword({ apiId, apiHash }, { password: async () => password2FA, onError: (e) => { throw e; } });
      } catch {
        return { status: 'REQUIRES_2FA', message: 'Mật khẩu 2FA không đúng, vui lòng thử lại' };
      }
    }

    this.pendingQrAuths.delete(userId);
    const user = await this.saveSession(userId, client);
    return { status: 'SUCCESS', user };
  }

  /** Cách 2: gửi mã OTP vào app Telegram */
  public static async sendAuthCode(userId: string, rawPhone: string) {
    const { apiId, apiHash } = this.getApiCredentials();
    const phone = this.normalizePhone(rawPhone);
    await this.dropPending(this.pendingAuths, userId);

    const client = this.newClient();
    await client.connect();
    const res = await client.sendCode({ apiId, apiHash }, phone);
    const entry = { client, phone, phoneCodeHash: res.phoneCodeHash, expiresAt: Date.now() + OTP_TTL_MS };
    this.pendingAuths.set(userId, entry);
    this.expireLater(this.pendingAuths, userId, entry, OTP_TTL_MS);

    return { success: true, phone, phoneCodeHash: res.phoneCodeHash, isCodeViaApp: res.isCodeViaApp };
  }

  /** Xác thực OTP (+ mật khẩu 2FA nếu có) và lưu phiên mã hóa */
  public static async verifyAuthCode(userId: string, phone: string, phoneCodeHash: string, code: string, password?: string) {
    const { apiId, apiHash } = this.getApiCredentials();
    const normPhone = this.normalizePhone(phone);
    const pending = this.pendingAuths.get(userId);
    if (!pending || pending.phone !== normPhone || pending.expiresAt < Date.now()) {
      throw new Error('Mã OTP đã hết hạn, vui lòng gửi lại mã mới');
    }
    const { client } = pending;

    try {
      await client.invoke(new Api.auth.SignIn({ phoneNumber: normPhone, phoneCodeHash, phoneCode: code.trim() }));
    } catch (err: any) {
      if (err.errorMessage !== 'SESSION_PASSWORD_NEEDED') throw new Error('Mã xác thực Telegram không đúng hoặc đã hết hạn');
      if (!password) return { requires2FA: true, message: 'Tài khoản yêu cầu mật khẩu xác thực 2 lớp (2FA).' };
      try {
        await client.signInWithPassword({ apiId, apiHash }, { password: async () => password, onError: (e) => { throw e; } });
      } catch {
        throw new Error('Mật khẩu 2FA không đúng');
      }
    }

    this.pendingAuths.delete(userId);
    const user = await this.saveSession(userId, client, normPhone);
    return { success: true, user };
  }

  /** Ngắt kết nối phiên Telegram cá nhân */
  public static async disconnect(userId: string) {
    await TelegramHarvestService.stopRealtimeListener(userId);
    const client = this.activeClients.get(userId);
    if (client) {
      this.activeClients.delete(userId);
      await client.disconnect().catch(() => undefined);
    }
    await User.findByIdAndUpdate(userId, { $unset: { telegramSession: 1 } });
    return { success: true };
  }

  /** Lấy client đang kết nối hoặc khôi phục từ phiên lưu trong DB (gọi đồng thời chỉ tạo 1 kết nối) */
  public static async getClient(userId: string): Promise<TelegramClient | null> {
    const existing = this.activeClients.get(userId);
    if (existing?.connected) return existing;

    const inFlight = this.connecting.get(userId);
    if (inFlight) return inFlight;

    const task = (async () => {
      const user = await User.findById(userId).select('+telegramSession');
      const saved = user?.telegramSession;
      if (!saved?.isActive) return null;
      const client = existing ?? this.newClient(decryptSession(saved.encryptedString, saved.iv, saved.tag));
      await client.connect();
      this.activeClients.set(userId, client);
      return client;
    })().finally(() => this.connecting.delete(userId));

    this.connecting.set(userId, task);
    return task;
  }

  public static async getStatus(userId: string) {
    const user = await User.findById(userId);
    const saved = user?.telegramSession;
    if (!saved?.isActive) return { isConnected: false };
    return {
      isConnected: true,
      user: { phone: saved.phone, firstName: saved.firstName, lastName: saved.lastName, username: saved.username, connectedAt: saved.connectedAt },
    };
  }

  /** Các nhóm / kênh tài khoản đang tham gia */
  public static async getDialogs(userId: string) {
    const client = await this.getClient(userId);
    if (!client) throw new Error('Chưa kết nối tài khoản Telegram cá nhân');

    const dialogs = await client.getDialogs({ limit: 200 });
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

  /** Tìm nhóm theo link mời kín (t.me/+...), link công khai / @username hoặc ID số */
  public static async resolveAndJoinChat(client: TelegramClient, input: string): Promise<any> {
    const clean = input.trim();
    if (!clean) throw new Error('Vui lòng chọn hoặc nhập nhóm Telegram');

    // 1. Link mời nhóm kín
    const inviteMatch = clean.match(/(?:t\.me\/|telegram\.me\/)(?:\+|joinchat\/)([\w-]+)/);
    if (inviteMatch) {
      try {
        const res: any = await client.invoke(new Api.messages.ImportChatInvite({ hash: inviteMatch[1] }));
        return res?.chats?.[0] || res;
      } catch (err: any) {
        if (err.errorMessage !== 'USER_ALREADY_PARTICIPANT') {
          throw new Error(`Không thể tham gia nhóm kín qua link mời: ${err.errorMessage || err.message}`);
        }
        // Đã là thành viên → xem trước link để lấy thông tin nhóm
        const check: any = await client.invoke(new Api.messages.CheckChatInvite({ hash: inviteMatch[1] }));
        if (check?.chat) return check.chat;
        throw new Error('Bạn đã ở trong nhóm này, hãy chọn nhóm từ danh sách');
      }
    }

    // 2. ID số (chọn từ danh sách nhóm) — tìm trong danh sách hội thoại để có đủ access hash
    if (/^-?\d+$/.test(clean)) {
      const bareId = clean.replace(/^-100/, '').replace(/^-/, '');
      const dialogs = await client.getDialogs({ limit: 200 });
      const found = dialogs.find((d) => [d.id?.toString(), (d.entity as any)?.id?.toString()].some((id) => id === clean || id === bareId));
      if (found?.entity) return found.entity;
      try {
        return await client.getEntity(BigInt(clean) as any);
      } catch (err: any) {
        throw new Error(`Không tìm thấy nhóm Telegram (ID: ${clean}). Bạn cần là thành viên của nhóm. ${err.message}`);
      }
    }

    // 3. Link công khai t.me/username hoặc @username
    const username = clean.match(/(?:t\.me\/|telegram\.me\/|@)?([a-zA-Z][\w]{3,})/)?.[1];
    if (!username) throw new Error('Link hoặc tên nhóm Telegram không hợp lệ');
    try {
      await client.invoke(new Api.channels.JoinChannel({ channel: username }));
    } catch {
      // Đã ở trong nhóm hoặc nhóm không cần tham gia để đọc
    }
    return client.getEntity(username);
  }
}
