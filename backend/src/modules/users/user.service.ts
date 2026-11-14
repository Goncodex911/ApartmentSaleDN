import { User, IUser } from '../auth/user.model.js';
import { TelegramService } from '../ingestion/telegram.service.js';
import { randomCode } from '../../utils/random-code.js';
import { UpdateProfileInput } from './user.validation.js';

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

  // [ADMIN] Danh sách tài khoản theo trạng thái (mặc định: đang chờ duyệt)
  static async listByStatus(status: IUser['status']) {
    return User.find({ status, role: { $ne: 'ADMIN' } }).select('name phone role ctvCode status createdAt').sort({ createdAt: -1 }).lean();
  }

  // [ADMIN] Duyệt / khóa tài khoản — không cho đổi trạng thái tài khoản ADMIN khác qua API
  static async updateStatus(userId: string, status: 'ACTIVE' | 'BLOCKED') {
    const user = await User.findById(userId);
    if (!user) throw { status: 404, message: 'Không tìm thấy người dùng' };
    if (user.role === 'ADMIN') throw { status: 403, message: 'Không thể thay đổi trạng thái tài khoản ADMIN' };
    user.status = status;
    await user.save();
    return user;
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

