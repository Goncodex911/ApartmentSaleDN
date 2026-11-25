import { Api, TelegramClient } from 'telegram';
import { Raw } from 'telegram/events/index.js';
import { StringSession } from 'telegram/sessions/index.js';
import { TelegramUserbotService } from './telegram-userbot.service.js';
import { TelegramUserError, toTelegramError } from './telegram-errors.js';
import { deletePendingLogin, loadPendingLogin, PendingLogin, savePendingLogin } from './telegram-pending-login.model.js';
import { maskPhone } from '../audit/audit-actions.js';

/**
 * Epic 18: đăng nhập Telegram cá nhân bằng mã OTP hoặc QR.
 * - 18.0/18.1: đọc đúng kênh Telegram gửi mã (app / SMS / email / cuộc gọi / Fragment...), gửi lại, hủy mã.
 * - 18.2: lượt đăng nhập dở lưu DB (mã hóa) → Render khởi động lại vẫn nhập mã được.
 * - 18.4: QR tự làm mới token trước khi hết hạn, dừng sau 2 phút; chỉ gọi lại Telegram khi cần (tránh FLOOD_WAIT).
 */
export type CodeChannel = 'APP' | 'SMS' | 'EMAIL' | 'CALL' | 'MISSED_CALL' | 'FRAGMENT' | 'SETUP_EMAIL' | 'FIREBASE' | 'OTHER';
export interface CodeDelivery {
  channel: CodeChannel;
  length?: number;
  emailPattern?: string;
  fragmentUrl?: string;
  missedCallPrefix?: string;
  nextChannel?: CodeChannel;
  timeoutSec?: number;
}

const OTP_TTL_MS = 10 * 60 * 1000;
const QR_MAX_MS = 2 * 60 * 1000;
const QR_REFRESH_BEFORE_MS = 5000;

const SENT_TYPES: Record<string, CodeChannel> = {
  SentCodeTypeApp: 'APP',
  SentCodeTypeSms: 'SMS',
  SentCodeTypeSmsWord: 'SMS',
  SentCodeTypeSmsPhrase: 'SMS',
  SentCodeTypeCall: 'CALL',
  SentCodeTypeFlashCall: 'CALL',
  SentCodeTypeMissedCall: 'MISSED_CALL',
  SentCodeTypeEmailCode: 'EMAIL',
  SentCodeTypeSetUpEmailRequired: 'SETUP_EMAIL',
  SentCodeTypeFragmentSms: 'FRAGMENT',
  SentCodeTypeFirebaseSms: 'FIREBASE',
};
const NEXT_TYPES: Record<string, CodeChannel> = {
  CodeTypeSms: 'SMS',
  CodeTypeCall: 'CALL',
  CodeTypeFlashCall: 'CALL',
  CodeTypeMissedCall: 'MISSED_CALL',
  CodeTypeFragmentSms: 'FRAGMENT',
};
const shortName = (obj: any) => String(obj?.className ?? '').split('.').pop() ?? '';

function describe(sent: Api.auth.SentCode): CodeDelivery {
  const type: any = sent.type;
  return {
    channel: SENT_TYPES[shortName(type)] ?? 'OTHER',
    length: type.length,
    emailPattern: type.emailPattern,
    fragmentUrl: type.url,
    missedCallPrefix: type.prefix,
    nextChannel: sent.nextType ? NEXT_TYPES[shortName(sent.nextType)] : undefined,
    timeoutSec: sent.timeout,
  };
}

// Story 18.0: log chẩn đoán — chỉ loại kênh, KHÔNG ghi mã / phoneCodeHash / SĐT / email
const logSentCode = (userId: string, step: string, sent: Api.auth.SentCode) =>
  console.info(`[Telegram login] ${step} type=${shortName(sent.type)} next=${shortName(sent.nextType) || '-'} timeout=${sent.timeout ?? '-'} user=${userId}`);

const codeExpired = () => new TelegramUserError('Mã đã hết hạn, vui lòng gửi mã mới.', 'TELEGRAM_CODE_EXPIRED');
const sessionOf = (client: TelegramClient) => (client.session as StringSession).save();

interface LiveLogin {
  client: TelegramClient;
  timer: NodeJS.Timeout;
  pending?: PendingLogin; // Bản sao trong RAM → lượt hỏi QR mỗi 2,5 giây không phải đọc + giải mã DB
  tgUrl?: string;
  tokenExpiresAt?: number;
  scanned?: boolean;
  awaiting2FA?: boolean;
}

export class TelegramLoginService {
  private static live = new Map<string, LiveLogin>();

  private static keepLive(userId: string, client: TelegramClient, ttlMs: number): LiveLogin {
    const entry: LiveLogin = {
      client,
      // Quá hạn → đóng kết nối tạm tới Telegram (bản ghi DB tự xóa theo TTL)
      timer: setTimeout(() => this.live.get(userId) === entry && this.cleanup(userId, true), ttlMs + 5000).unref(),
    };
    this.live.set(userId, entry);
    return entry;
  }

  /** Bỏ lượt đăng nhập dở: xóa RAM + DB; disconnect = false khi client đã thành phiên chính thức */
  private static async cleanup(userId: string, disconnect: boolean) {
    const entry = this.live.get(userId);
    this.live.delete(userId);
    if (entry) clearTimeout(entry.timer);
    await deletePendingLogin(userId);
    if (entry && disconnect) await entry.client.disconnect().catch(() => undefined);
  }

  /** Client đang chờ: lấy trong RAM, mất (máy chủ khởi động lại) → khôi phục từ phiên tạm trong DB */
  private static async resume(userId: string, kind: PendingLogin['kind']) {
    let entry = this.live.get(userId);
    const pending = entry?.pending ?? (await loadPendingLogin(userId));
    if (!pending || pending.kind !== kind || pending.expiresAt.getTime() < Date.now()) return null;
    if (!entry) {
      const client = TelegramUserbotService.newClient(pending.session, true);
      await client.connect();
      entry = this.keepLive(userId, client, pending.expiresAt.getTime() - Date.now());
      if (kind === 'QR') this.listenScan(entry);
    }
    entry.pending = pending;
    return { entry, pending };
  }

  // Telegram báo ngay khi điện thoại quét → lượt hỏi kế tiếp mới gọi lại Telegram
  private static listenScan(entry: LiveLogin) {
    entry.client.addEventHandler(() => void (entry.scanned = true), new Raw({ types: [Api.UpdateLoginToken] }));
  }

  private static async finish(userId: string, client: TelegramClient, phone?: string) {
    const user = await TelegramUserbotService.saveSession(userId, client, phone);
    await this.cleanup(userId, false);
    return user;
  }

  // ---------- Mã OTP ----------

  public static async sendCode(userId: string, rawPhone: string) {
    await this.cleanup(userId, true);
    const { apiId, apiHash } = TelegramUserbotService.getApiCredentials();
    const phone = TelegramUserbotService.normalizePhone(rawPhone);
    const client = TelegramUserbotService.newClient('', true);
    try {
      await client.connect();
      let sent = await client.invoke(new Api.auth.SendCode({ phoneNumber: phone, apiId, apiHash, settings: new Api.CodeSettings({}) }));
      if (sent instanceof Api.auth.SentCodeSuccess) return { status: 'SUCCESS' as const, user: await this.finish(userId, client, phone) };
      logSentCode(userId, 'sendCode', sent);

      // SMS qua Firebase cần xác minh của app chính thức → ứng dụng bên thứ ba không nhận được: chuyển ngay sang kênh kế tiếp
      if (describe(sent).channel === 'FIREBASE' && sent.nextType) {
        const next = await client.invoke(new Api.auth.ResendCode({ phoneNumber: phone, phoneCodeHash: sent.phoneCodeHash }));
        if (next instanceof Api.auth.SentCode) {
          sent = next;
          logSentCode(userId, 'resendFromFirebase', sent);
        }
      }

      const delivery = describe(sent);
      const expiresAt = new Date(Date.now() + OTP_TTL_MS);
      await savePendingLogin(userId, { kind: 'OTP', session: sessionOf(client), phone, phoneCodeHash: sent.phoneCodeHash, delivery: { ...delivery }, expiresAt });
      this.keepLive(userId, client, OTP_TTL_MS);
      return { status: 'CODE_SENT' as const, phoneMasked: this.mask(phone), delivery, expiresAt };
    } catch (err) {
      await client.disconnect().catch(() => undefined);
      throw toTelegramError(err);
    }
  }

  public static async resendCode(userId: string) {
    const resumed = await this.resume(userId, 'OTP');
    if (!resumed?.pending.phone || !resumed.pending.phoneCodeHash) throw codeExpired();
    const { entry, pending } = resumed;
    try {
      const sent = await entry.client.invoke(new Api.auth.ResendCode({ phoneNumber: pending.phone!, phoneCodeHash: pending.phoneCodeHash! }));
      if (!(sent instanceof Api.auth.SentCode)) throw codeExpired();
      logSentCode(userId, 'resendCode', sent);
      const delivery = describe(sent);
      entry.pending = { ...pending, phoneCodeHash: sent.phoneCodeHash, delivery: { ...delivery } };
      await savePendingLogin(userId, entry.pending);
      return { delivery, phoneMasked: this.mask(pending.phone!), expiresAt: pending.expiresAt };
    } catch (err) {
      throw toTelegramError(err);
    }
  }

  /** Đổi số / bỏ ngang: hủy mã cũ phía Telegram rồi dọn dẹp */
  public static async cancelCode(userId: string) {
    const resumed = await this.resume(userId, 'OTP').catch(() => null);
    const { phone, phoneCodeHash } = resumed?.pending ?? {};
    if (resumed && phone && phoneCodeHash) {
      await resumed.entry.client.invoke(new Api.auth.CancelCode({ phoneNumber: phone, phoneCodeHash })).catch(() => undefined);
    }
    await this.cleanup(userId, true);
    return {};
  }

  public static async verifyCode(userId: string, code: string, password?: string) {
    const resumed = await this.resume(userId, 'OTP');
    if (!resumed?.pending.phone || !resumed.pending.phoneCodeHash) throw codeExpired();
    const { entry, pending } = resumed;
    try {
      try {
        const res = await entry.client.invoke(new Api.auth.SignIn({ phoneNumber: pending.phone!, phoneCodeHash: pending.phoneCodeHash!, phoneCode: code.trim() }));
        if (res instanceof Api.auth.AuthorizationSignUpRequired) throw new TelegramUserError('Số này chưa đăng ký Telegram.', 'TELEGRAM_PHONE_UNREGISTERED');
      } catch (err: any) {
        if (err?.errorMessage !== 'SESSION_PASSWORD_NEEDED') throw err;
        if (!password) return { requires2FA: true, message: 'Tài khoản bật xác thực 2 lớp: nhập thêm mật khẩu 2FA rồi bấm Xác nhận.' };
        await this.signInWithPassword(entry.client, password);
      }
      return { success: true, user: await this.finish(userId, entry.client, pending.phone) };
    } catch (err) {
      throw toTelegramError(err);
    }
  }

  // ---------- QR (máy tính) ----------

  public static async startQr(userId: string) {
    await this.cleanup(userId, true);
    const client = TelegramUserbotService.newClient('', true);
    try {
      await client.connect();
      this.listenScan(this.keepLive(userId, client, QR_MAX_MS));
      await savePendingLogin(userId, { kind: 'QR', session: sessionOf(client), expiresAt: new Date(Date.now() + QR_MAX_MS) });
      return await this.checkQr(userId);
    } catch (err) {
      await this.cleanup(userId, true);
      throw toTelegramError(err);
    }
  }

  public static async checkQr(userId: string, password?: string) {
    const resumed = await this.resume(userId, 'QR');
    if (!resumed || Date.now() - resumed.pending.startedAt.getTime() > QR_MAX_MS) {
      await this.cleanup(userId, true);
      return { status: 'EXPIRED' as const, message: 'Mã QR đã hết hạn sau 2 phút, bấm "Tạo mã mới".' };
    }
    const { entry } = resumed;
    const waiting = () => ({ status: 'WAITING' as const, tgUrl: entry.tgUrl, expiresAt: entry.tokenExpiresAt });
    const { apiId, apiHash } = TelegramUserbotService.getApiCredentials();

    try {
      if (entry.awaiting2FA) {
        if (!password) return { status: 'REQUIRES_2FA' as const, message: 'Tài khoản bật xác thực 2 lớp, nhập mật khẩu 2FA.' };
        await this.signInWithPassword(entry.client, password);
        return { status: 'SUCCESS' as const, user: await this.finish(userId, entry.client) };
      }
      // Token còn hạn và chưa quét → không gọi Telegram
      if (entry.tgUrl && !entry.scanned && (entry.tokenExpiresAt ?? 0) - Date.now() > QR_REFRESH_BEFORE_MS) return waiting();

      let res: any = await entry.client.invoke(new Api.auth.ExportLoginToken({ apiId, apiHash, exceptIds: [] }));
      if (res instanceof Api.auth.LoginTokenMigrateTo) {
        await (entry.client as any)._switchDC(res.dcId);
        res = await entry.client.invoke(new Api.auth.ImportLoginToken({ token: res.token }));
      }
      if (res instanceof Api.auth.LoginToken) {
        entry.scanned = false;
        entry.tgUrl = `tg://login?token=${Buffer.from(res.token).toString('base64url')}`;
        entry.tokenExpiresAt = res.expires * 1000;
        return waiting();
      }
      console.info(`[Telegram login] qr result=${shortName(res)} user=${userId}`);
      return { status: 'SUCCESS' as const, user: await this.finish(userId, entry.client) };
    } catch (err: any) {
      if (err?.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        entry.awaiting2FA = true;
        return { status: 'REQUIRES_2FA' as const, message: 'Tài khoản bật xác thực 2 lớp, nhập mật khẩu 2FA.' };
      }
      const mapped = toTelegramError(err) as TelegramUserError;
      if (mapped.code === 'TELEGRAM_2FA_INVALID') return { status: 'REQUIRES_2FA' as const, message: mapped.message };
      throw mapped;
    }
  }

  // ---------- Chung ----------

  /** Story 18.2 AC4: tải lại trang khi đang chờ mã → mở thẳng bước nhập mã */
  public static async pendingStatus(userId: string) {
    const pending = await loadPendingLogin(userId).catch(() => null);
    if (pending?.kind !== 'OTP' || !pending.phone) return null;
    return { phoneMasked: this.mask(pending.phone), delivery: pending.delivery as unknown as CodeDelivery, expiresAt: pending.expiresAt };
  }

  private static signInWithPassword(client: TelegramClient, password: string) {
    const { apiId, apiHash } = TelegramUserbotService.getApiCredentials();
    return client.signInWithPassword({ apiId, apiHash }, { password: async () => password, onError: (e) => { throw e; } });
  }

  private static mask(phone: string) {
    return maskPhone(phone.replace(/^\+84/, '0'));
  }
}
