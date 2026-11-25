import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { User } from '../auth/user.model.js';
import { encryptSession, decryptSession } from '../../utils/crypto.util.js';
import { NotificationService } from '../notifications/notification.service.js';
import { TelegramHarvestService } from './telegram-harvest.service.js';
import { TelegramUserError, toTelegramError } from './telegram-errors.js';

// Phiên chết / tài khoản bị hạn chế → xóa phiên đã lưu, đưa người dùng về màn hình kết nối lại
const DROP_SESSION_CODES = new Set(['TELEGRAM_SESSION_DEAD', 'TELEGRAM_ACCOUNT_RESTRICTED']);
const HEALTH_CHECK_MS = 5 * 60 * 1000;
const DEAD_NOTIFY_GAP_MS = 6 * 60 * 60 * 1000;

export class TelegramUserbotService {
  private static activeClients = new Map<string, TelegramClient>();
  private static connecting = new Map<string, Promise<TelegramClient | null>>();
  private static lastChecked = new Map<string, number>();
  private static deadNotifiedAt = new Map<string, number>();

  /** API ID / Hash của ứng dụng Telegram (lấy tại my.telegram.org → API development tools) */
  public static getApiCredentials() {
    const apiId = Number(process.env.TELEGRAM_API_ID);
    const apiHash = process.env.TELEGRAM_API_HASH;
    if (!apiId || !apiHash) throw new Error('Chưa cấu hình TELEGRAM_API_ID / TELEGRAM_API_HASH trong biến môi trường');
    return { apiId, apiHash };
  }

  /**
   * Story 18.5: thông số thiết bị cố định cho mọi lần kết nối → Telegram coi là cùng 1 thiết bị "ApartmentSaleDN Web".
   * forLogin: luồng đăng nhập không tự ngủ khi FLOOD_WAIT (báo ngay cho người dùng thời gian chờ thay vì treo request).
   */
  public static newClient(session = '', forLogin = false) {
    const { apiId, apiHash } = this.getApiCredentials();
    return new TelegramClient(new StringSession(session), apiId, apiHash, {
      connectionRetries: 5,
      deviceModel: 'ApartmentSaleDN Web',
      systemVersion: 'Web/Node',
      appVersion: '1.0.0',
      langCode: 'vi',
      systemLangCode: 'vi',
      ...(forLogin && { floodSleepThreshold: 0 }),
    });
  }

  /** Chuẩn hóa SĐT về định dạng quốc tế Telegram (+84...) */
  public static normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return `+${digits.startsWith('0') ? `84${digits.slice(1)}` : digits}`;
  }

  /** Mã hóa và lưu phiên vào DB sau khi đăng nhập thành công */
  public static async saveSession(userId: string, client: TelegramClient, phoneOverride?: string) {
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

  /**
   * Chạy thao tác cần phiên Telegram; lỗi Telegram → thông điệp tiếng Việt (Story 18.3).
   * Phiên bị hủy / tài khoản bị hạn chế → xóa phiên hỏng (DB + bộ nhớ) để trang không hiện "Đã kết nối" sai
   * và báo chuông cho người dùng (Story 18.5: bộ đón tin cũng đã dừng).
   */
  public static async withSession<T>(userId: string, task: () => Promise<T>): Promise<T> {
    try {
      return await task();
    } catch (err) {
      const mapped = toTelegramError(err);
      if (mapped instanceof TelegramUserError && DROP_SESSION_CODES.has(mapped.code)) {
        await this.disconnect(userId).catch(() => undefined);
        this.notifyDisconnected(userId);
      }
      throw mapped;
    }
  }

  private static notifyDisconnected(userId: string) {
    const now = Date.now();
    if ((this.deadNotifiedAt.get(userId) ?? 0) > now - DEAD_NOTIFY_GAP_MS) return;
    this.deadNotifiedAt.set(userId, now);
    NotificationService.notify({
      userId,
      type: 'SERVICE_INCIDENT',
      title: 'Kết nối Telegram đã bị ngắt',
      body: 'Telegram đã thu hồi phiên đăng nhập, bộ đón tin mới đã dừng. Vào Cào tin Telegram để kết nối lại.',
    }).catch(() => undefined);
  }

  /**
   * Máy chủ sắp tắt (Render deploy bản mới): đóng mọi kết nối Telegram nhưng GIỮ phiên trong DB.
   * Nếu bản cũ và bản mới cùng giữ kết nối bằng 1 phiên, Telegram có thể coi là bất thường và thu hồi phiên.
   */
  public static async disconnectAll() {
    const clients = [...this.activeClients.values()];
    this.activeClients.clear();
    await Promise.all(clients.map((client) => client.disconnect().catch(() => undefined)));
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

  /**
   * Trạng thái kết nối. Story 18.5: kiểm tra nhẹ bằng getMe (tối đa 1 lần / 5 phút / người) → phiên đã chết thì
   * withSession tự xóa và trả "chưa kết nối" ngay khi mở trang, không đợi người dùng thao tác mới gặp lỗi.
   */
  public static async getStatus(userId: string) {
    const user = await User.findById(userId);
    const saved = user?.telegramSession;
    if (!saved?.isActive) return { isConnected: false };

    const now = Date.now();
    if ((this.lastChecked.get(userId) ?? 0) < now - HEALTH_CHECK_MS) {
      try {
        const client = await this.getClient(userId);
        if (client) await this.withSession(userId, () => client.getMe());
        this.lastChecked.set(userId, now);
      } catch (err) {
        if (err instanceof TelegramUserError && DROP_SESSION_CODES.has(err.code)) return { isConnected: false, message: err.message };
        // Lỗi mạng tạm thời → vẫn coi là đã kết nối, lần sau kiểm tra lại
      }
    }
    return {
      isConnected: true,
      lastCheckedAt: this.lastChecked.has(userId) ? new Date(this.lastChecked.get(userId)!) : null,
      user: { phone: saved.phone, firstName: saved.firstName, lastName: saved.lastName, username: saved.username, connectedAt: saved.connectedAt },
    };
  }

  /** Các nhóm / kênh tài khoản đang tham gia */
  public static async getDialogs(userId: string) {
    const client = await this.getClient(userId);
    if (!client) throw new Error('Chưa kết nối tài khoản Telegram cá nhân');

    const dialogs = await this.withSession(userId, () => client.getDialogs({ limit: 200 }));
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
