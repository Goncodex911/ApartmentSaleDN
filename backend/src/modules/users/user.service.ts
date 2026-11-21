import { randomInt } from 'node:crypto';
import { isValidObjectId } from 'mongoose';
import { User } from '../auth/user.model.js';
import { TelegramService } from '../ingestion/telegram.service.js';
import { randomCode } from '../../utils/random-code.js';
import { escapeRegex } from '../../utils/phone-text.js';
import { forgetSession } from '../../middlewares/auth.js';
import { AuditActor, AuditService } from '../audit/audit.service.js';
import { ListUsersQuery, UpdateProfileInput } from './user.validation.js';

// Mật khẩu tạm: bỏ ký tự dễ nhầm khi đọc qua điện thoại (0/O, 1/l/I)
// Story 16.3: lastActive = hoạt động gần nhất trước; inactive = lâu không dùng app trước (chưa từng hoạt động = null xếp đầu)
const SORTS = { newest: { createdAt: -1 }, lastActive: { lastActiveAt: -1 }, inactive: { lastActiveAt: 1 } } as const;
const PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
// Mật khẩu tạm 12 ký tự (bỏ ký tự dễ nhầm 0/O, 1/l/I) — reset 13.2 và tạo tài khoản 16.6
export const generateTempPassword = () => Array.from({ length: 12 }, () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]).join('');

export const userTarget = (user: { _id: unknown; name: string; ctvCode: string }) => ({ type: 'USER' as const, id: user._id, title: `${user.name} (${user.ctvCode})` });

export const findTarget = async (userId: string) => {
  const user = isValidObjectId(userId) ? await User.findById(userId) : null;
  if (!user) throw { status: 404, message: 'Không tìm thấy người dùng' };
  return user;
};

export class UserService {
  // Lấy hồ sơ cá nhân đầy đủ của user hiện tại
  static async getProfile(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw { status: 404, message: 'Không tìm thấy người dùng' };
    }
    return user;
  }

  // Cập nhật thông tin hồ sơ cá nhân
  static async updateProfile(userId: string, input: UpdateProfileInput) {
    const updateData: any = { ...input };

    // Tự động sinh link Zalo nếu có cập nhật số điện thoại Zalo
    if (input.zaloPhone) {
      updateData.zaloLink = `https://zalo.me/${input.zaloPhone}`;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      throw { status: 404, message: 'Không tìm thấy người dùng để cập nhật' };
    }

    return updatedUser;
  }

  /**
   * Quản lý mặc định nhận căn từ các cổng nhập tin không đăng nhập (Telegram, Webhook).
   * Chỉ chọn tài khoản ACTIVE (không chọn trúng tài khoản chờ duyệt/bị khóa); lấy người tạo sớm nhất cho ổn định.
   */
  static async findDefaultManagerId(): Promise<string> {
    const manager = await User.findOne({ role: { $in: ['ADMIN', 'MANAGER'] }, status: 'ACTIVE' })
      .sort({ createdAt: 1 })
      .select('_id')
      .lean();
    // Không tạo căn "mồ côi" với managerId giả như trước — báo lỗi rõ ràng
    if (!manager) throw { status: 503, message: 'Chưa có tài khoản Quản lý/ADMIN đang hoạt động để nhận tin' };
    return String(manager._id);
  }

  // [ADMIN] Danh sách thành viên (Story 13.2) — Story 16.3: sắp theo hoạt động cuối (người chưa từng hoạt động xếp cuối / đầu): lọc trạng thái / vai trò, tìm tên – SĐT – mã CTV, phân trang
  static async list({ status, role, search, sort, page, limit }: ListUsersQuery) {
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (role) filter.role = role;
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: pattern }, { phone: pattern }, { ctvCode: pattern }];
    }
    const [items, total] = await Promise.all([
      User.find(filter)
        .select('name phone role ctvCode status createdAt trustScore canReport lastActiveAt')
        .sort(SORTS[sort ?? 'newest']).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  // [Quản lý] CTV đang hoạt động — chọn "CTV chốt căn" khi ghi hợp đồng thuê (Story 11.5); chỉ trả tên + mã CTV
  static async listCollaborators() {
    return User.find({ role: 'COLLABORATOR', status: 'ACTIVE' }).select('name ctvCode').sort({ name: 1 }).limit(500).lean();
  }

  /**
   * [ADMIN] Duyệt / khóa / mở khóa — không đổi trạng thái tài khoản ADMIN qua API (gồm cả tự khóa mình).
   * Khóa → tăng tokenVersion: phiên đang mở bị từ chối ngay, refresh token cũ cũng hết hiệu lực (Story 13.2).
   */
  static async updateStatus(actor: AuditActor, userId: string, status: 'ACTIVE' | 'BLOCKED') {
    const user = await findTarget(userId);
    if (user.role === 'ADMIN') throw { status: 403, message: 'Không thể thay đổi trạng thái tài khoản ADMIN' };
    const previousStatus = user.status;
    user.status = status;
    if (status === 'BLOCKED') user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();
    forgetSession(userId);
    AuditService.log(actor, 'CHANGE_USER_STATUS', userTarget(user), { from: previousStatus, to: status });
    return user;
  }

  /**
   * [ADMIN] Thăng cấp CTV → Quản lý hoặc hạ Quản lý → CTV (Story 13.2).
   * Không tự đổi vai trò của mình, không hạ ADMIN qua API. Phiên của người được đổi tự làm mới token theo vai trò mới.
   */
  static async updateRole(actor: AuditActor, userId: string, role: 'MANAGER' | 'COLLABORATOR') {
    if (actor.id === userId) throw { status: 400, message: 'Không thể tự đổi vai trò của chính mình' };
    const user = await findTarget(userId);
    if (user.role === 'ADMIN') throw { status: 403, message: 'Không thể đổi vai trò tài khoản ADMIN' };
    const previousRole = user.role;
    user.role = role;
    await user.save();
    forgetSession(userId);
    AuditService.log(actor, 'CHANGE_ROLE', userTarget(user), { from: previousRole, to: role });
    return user;
  }

  // [ADMIN] Khóa / mở quyền báo lỗi tin (Story 13.6) — mở lại thì đưa điểm tín nhiệm âm về 0 để không bị khóa ngay lần sau
  static async setCanReport(actor: AuditActor, userId: string, canReport: boolean) {
    const user = await findTarget(userId);
    user.canReport = canReport;
    if (canReport && user.trustScore < 0) user.trustScore = 0;
    await user.save();
    AuditService.log(actor, 'CHANGE_USER_STATUS', userTarget(user), { canReport });
    return user;
  }

  /**
   * [ADMIN] Đặt mật khẩu tạm cho thành viên quên mật khẩu (Story 13.2). Mật khẩu rõ chỉ trả về 1 lần cho Admin,
   * không ghi log. Tăng tokenVersion → các thiết bị đang đăng nhập bằng mật khẩu cũ bị đăng xuất.
   */
  static async resetPassword(actor: AuditActor, userId: string) {
    if (actor.id === userId) throw { status: 400, message: 'Đổi mật khẩu của chính mình trong Hồ sơ cá nhân' };
    const user = await findTarget(userId);
    if (user.role === 'ADMIN') throw { status: 403, message: 'Không thể đặt lại mật khẩu tài khoản ADMIN' };
    const tempPassword = generateTempPassword();
    user.password = tempPassword; // pre('save') băm bcrypt
    user.mustChangePassword = true; // Story 13.9: lần đăng nhập tới app nhắc đổi mật khẩu
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();
    forgetSession(userId);
    AuditService.log(actor, 'RESET_PASSWORD', userTarget(user)); // Không ghi mật khẩu tạm vào nhật ký
    return { user, tempPassword };
  }

  /**
   * Tạo mã liên kết Telegram dùng 1 lần, hết hạn sau 10 phút (Story 6.2 - AC5).
   * Trả về deep link t.me/<bot>?start=<mã> — mở trên điện thoại là liên kết xong.
   */
  static async createTelegramLink(userId: string) {
    const botUsername = await TelegramService.getBotUsername();
    if (!botUsername) throw { status: 503, message: 'Hệ thống chưa cấu hình bot Telegram (TELEGRAM_BOT_TOKEN)' };

    const code = randomCode(8);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await User.updateOne({ _id: userId }, { telegramLinkCode: code, telegramLinkExpiresAt: expiresAt });
    return { deepLink: `https://t.me/${botUsername}?start=${code}`, code, expiresAt };
  }

  static async unlinkTelegram(userId: string) {
    await User.updateOne({ _id: userId }, { $unset: { telegramChatId: 1 } });
  }

  // Lấy thông tin công khai của CTV thông qua ctvCode (dùng cho Public Landing Page)
  static async getPublicCtvByCode(ctvCode: string) {
    const ctv = await User.findOne({
      ctvCode: ctvCode.toUpperCase().trim(),
      status: 'ACTIVE',
    }).select('name ctvCode zaloPhone zaloLink avatarUrl greetingMessage');

    if (!ctv) {
      throw { status: 404, message: `Không tìm thấy CTV với mã giới thiệu '${ctvCode}'` };
    }

    return ctv;
  }
}

