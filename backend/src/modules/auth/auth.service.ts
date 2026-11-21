import jwt from 'jsonwebtoken';
import { User, IUser } from './user.model.js';
import { RegisterInput, LoginInput, ChangePasswordInput } from './auth.validation.js';
import { forgetSession } from '../../middlewares/auth.js';
import { AuditService } from '../audit/audit.service.js';
import { maskPhone } from '../audit/audit-actions.js';
import { JWT_SECRET } from '../../config/env.js';
import { randomCode } from '../../utils/random-code.js';

const ACCESS_TOKEN_EXPIRES = '1h';
const REFRESH_TOKEN_EXPIRES = '7d';
// IP + thiết bị của request — controller truyền xuống để ghi nhật ký đăng nhập (Story 16.2)
export type RequestContext = { ip?: string; userAgent?: string };

const INVALID_LOGIN = { status: 401, message: 'Số điện thoại hoặc mật khẩu không chính xác' };
const SESSION_EXPIRED = { status: 401, message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại' };

// Story 14.5: phiên refresh theo thiết bị
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // Khớp REFRESH_TOKEN_EXPIRES
const ROTATION_GRACE_MS = 60_000; // Token vừa bị xoay vẫn nhận 60 giây: 2 tab / PWA refresh cùng lúc không bị đăng xuất oan
const MAX_SESSIONS = 10;

export class AuthService {
  // Tạo Access Token và Refresh Token (refresh mang jti của phiên thiết bị)
  private static generateTokens(user: IUser, jti: string) {
    const payload = {
      id: user._id.toString(),
      role: user.role,
      ctvCode: user.ctvCode,
      tv: user.tokenVersion ?? 0, // Story 13.2: so với DB để vô hiệu hóa phiên khi khóa / reset mật khẩu
    };

    // Story 16.4: access token mang sid = jti của phiên thiết bị → thu hồi 1 thiết bị có hiệu lực ngay (≤ 30 giây)
    const accessToken = jwt.sign({ ...payload, sid: jti }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
    // type: 'refresh' → middleware không chấp nhận refresh token (hạn 7 ngày) thay cho access token
    const refreshToken = jwt.sign({ ...payload, type: 'refresh', jti }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES });

    return { accessToken, refreshToken };
  }

  /** Mở phiên cho 1 thiết bị (đăng nhập / đăng ký / đổi mật khẩu): giữ tối đa 10 phiên, bỏ phiên hết hạn. Ghi nguyên tử, không dùng save(). */
  private static async openSession(user: IUser, ctx: RequestContext = {}) {
    const jti = randomCode(24);
    const now = Date.now();
    const at = new Date(now);
    await User.updateOne({ _id: user._id }, { $pull: { refreshSessions: { expiresAt: { $lt: new Date(now) } } } });
    await User.updateOne(
      { _id: user._id },
      { $push: { refreshSessions: { $each: [{ jti, expiresAt: new Date(now + REFRESH_TTL_MS), ...ctx, createdAt: at, lastUsedAt: at }], $slice: -MAX_SESSIONS } } } // Story 16.4: thiết bị + IP
    );
    forgetSession(String(user._id)); // Story 16.4: bộ nhớ phiên phải thấy jti mới ngay
    return this.generateTokens(user, jti);
  }

  /**
   * Xoay phiên khi refresh: jti cũ → prevJti (còn nhận ROTATION_GRACE_MS), cấp jti mới.
   * Request đến cùng lúc mang jti vừa bị xoay → trả token của jti hiện tại thay vì báo hết phiên.
   */
  private static async rotateSession(user: IUser, oldJti: string, ctx: RequestContext = {}) {
    const jti = randomCode(24);
    const now = Date.now();
    const rotated = await User.updateOne(
      { _id: user._id, 'refreshSessions.jti': oldJti },
      { $set: { 'refreshSessions.$.jti': jti, 'refreshSessions.$.prevJti': oldJti, 'refreshSessions.$.rotatedAt': new Date(now), 'refreshSessions.$.expiresAt': new Date(now + REFRESH_TTL_MS), 'refreshSessions.$.lastUsedAt': new Date(now), ...(ctx.ip && { 'refreshSessions.$.ip': ctx.ip }) } }
    );
    if (rotated.modifiedCount) {
      forgetSession(String(user._id));
      return this.generateTokens(user, jti);
    }

    const fresh = await User.findOne({ _id: user._id, refreshSessions: { $elemMatch: { prevJti: oldJti, rotatedAt: { $gte: new Date(now - ROTATION_GRACE_MS) } } } })
      .select('refreshSessions')
      .lean();
    const current = fresh?.refreshSessions.find((session) => session.prevJti === oldJti);
    if (!current) throw SESSION_EXPIRED; // Đã đăng xuất / đã bị thu hồi / token cũ quá 60 giây
    return this.generateTokens(user, current.jti);
  }

  /** Đăng xuất: thu hồi đúng phiên của thiết bị này (máy khác vẫn đăng nhập). Token lỗi / hết hạn → bỏ qua. */
  static async logout(refreshToken?: string, ctx: RequestContext = {}) {
    if (!refreshToken) return;
    try {
      const { id, role, jti } = jwt.verify(refreshToken, JWT_SECRET) as { id: string; role: string; jti?: string };
      if (jti) await User.updateOne({ _id: id }, { $pull: { refreshSessions: { $or: [{ jti }, { prevJti: jti }] } } });
      AuditService.log({ id, role, ...ctx }, 'LOGOUT', { type: 'AUTH', title: 'Đăng xuất' });
    } catch {
      // Token hỏng / hết hạn thì phiên cũng đã vô dụng
    }
  }

  /**
   * Tự động sinh ctvCode độc nhất (VD: CTV1024).
   * Thử tối đa 20 lần; từ lần thứ 11 nới lên 6 chữ số → không bị lặp vô tận khi đã dùng gần hết 9000 mã 4 số.
   */
  static async generateUniqueCtvCode(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const min = attempt < 10 ? 1000 : 100000;
      const code = `CTV${Math.floor(min + Math.random() * min * 9)}`;
      if (!(await User.exists({ ctvCode: code }))) return code;
    }
    throw { status: 503, message: 'Không tạo được mã CTV, vui lòng thử lại' };
  }

  // Đăng ký người dùng mới
  static async register(input: RegisterInput, ctx: RequestContext = {}) {
    const existing = await User.exists({ phone: input.phone });
    if (existing) {
      throw { status: 400, message: 'Số điện thoại này đã được đăng ký tài khoản' };
    }

    // Quản lý được xem SĐT chủ nhà → tự đăng ký phải chờ ADMIN duyệt, không cấp token ngay
    // (chặn CTV tự tạo tài khoản MANAGER để vượt qua Data Masking của Story 1.2)
    const ctvCode = await this.generateUniqueCtvCode();
    const user = await User.create({
      ...input,
      ctvCode,
      status: input.role === 'MANAGER' ? 'PENDING' : 'ACTIVE',
    });

    if (user.status === 'PENDING') return { user, pendingApproval: true as const };
    return { user, ...(await this.openSession(user, ctx)) };
  }

  // Đăng nhập
  static async login(input: LoginInput, ctx: RequestContext = {}) {
    const user = await User.findOne({ phone: input.phone });
    if (!user || !(await user.comparePassword(input.password))) {
      // Story 16.2: SĐT lạ vẫn ghi (userId trống) để phát hiện dò mật khẩu — chỉ lưu SĐT đã che
      AuditService.log(user ? { id: user.id, role: user.role, name: user.name, ...ctx } : { id: '', role: '', ...ctx }, 'LOGIN_FAILED', { type: 'AUTH', title: maskPhone(input.phone) }, { phone: maskPhone(input.phone) });
      throw INVALID_LOGIN;
    }

    // Chỉ báo trạng thái tài khoản sau khi đúng mật khẩu → người lạ không dò được trạng thái bằng SĐT
    if (user.status === 'PENDING') {
      throw { status: 403, message: 'Tài khoản Quản lý đang chờ ADMIN duyệt, vui lòng quay lại sau' };
    }
    if (user.status === 'BLOCKED') {
      throw { status: 403, message: 'Tài khoản của bạn đã bị khóa' };
    }

    const now = new Date();
    User.updateOne({ _id: user._id }, { $set: { lastLoginAt: now, lastActiveAt: now } }).catch(() => undefined); // Story 16.3
    AuditService.log({ id: user.id, role: user.role, name: user.name, ...ctx }, 'LOGIN', { type: 'AUTH', title: 'Đăng nhập' }); // Chỉ đăng nhập bằng mật khẩu, không ghi khi làm mới token
    return { user, ...(await this.openSession(user, ctx)) };
  }

  /**
   * Cấp lại Access Token từ Refresh Token trong HttpOnly Cookie (Story 1.1 - AC2).
   * Đọc lại user từ DB: lấy role mới nhất, tài khoản đã bị khóa thì không cấp nữa.
   */
  static async refresh(refreshToken?: string, ctx: RequestContext = {}) {
    if (!refreshToken) throw SESSION_EXPIRED;

    let decoded: { id: string; type?: string; tv?: number; jti?: string };
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET) as typeof decoded;
    } catch {
      throw SESSION_EXPIRED;
    }
    if (decoded.type !== 'refresh') throw SESSION_EXPIRED;

    const user = await User.findById(decoded.id);
    // Story 13.2: tài khoản bị khóa hoặc đã reset mật khẩu (tokenVersion tăng) → không cấp lại token
    if (!user || user.status !== 'ACTIVE' || (decoded.tv ?? 0) !== (user.tokenVersion ?? 0)) throw SESSION_EXPIRED;

    // Story 14.5: token cấp trước khi có phiên theo thiết bị (chưa có jti) → mở phiên mới, không đăng xuất hàng loạt
    const tokens = decoded.jti ? await this.rotateSession(user, decoded.jti, ctx) : await this.openSession(user, ctx);
    return { user, ...tokens };
  }

  /**
   * Story 13.9: tự đổi mật khẩu. Tăng tokenVersion → các thiết bị khác bị đăng xuất; trả token mới để thiết bị đang dùng vẫn đăng nhập.
   * Sai mật khẩu hiện tại trả 400 (không phải 401) để app không hiểu nhầm là hết phiên rồi tự đăng xuất.
   */
  static async changePassword(actor: { id: string; role: string; ip?: string; userAgent?: string }, input: ChangePasswordInput) {
    const user = await User.findById(actor.id);
    if (!user) throw SESSION_EXPIRED;
    if (!(await user.comparePassword(input.currentPassword))) throw { status: 400, message: 'Mật khẩu hiện tại không đúng' };
    user.password = input.newPassword; // pre('save') băm bcrypt
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    user.mustChangePassword = false;
    await user.save();
    forgetSession(actor.id);
    AuditService.log(actor, 'CHANGE_PASSWORD', { type: 'USER', id: user._id, title: `${user.name} (${user.ctvCode})` }); // Không ghi mật khẩu
    return { user, ...(await this.openSession(user, { ip: actor.ip, userAgent: actor.userAgent })) }; // Phiên cũ đã mất hiệu lực nhờ tokenVersion tăng
  }

  // Lấy thông tin tài khoản hiện tại
  static async getMe(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw { status: 404, message: 'Không tìm thấy người dùng' };
    }
    return user;
  }
}
