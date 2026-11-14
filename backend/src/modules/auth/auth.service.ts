import jwt from 'jsonwebtoken';
import { User, IUser } from './user.model.js';
import { RegisterInput, LoginInput } from './auth.validation.js';
import { JWT_SECRET } from '../../config/env.js';

const ACCESS_TOKEN_EXPIRES = '1h';
const REFRESH_TOKEN_EXPIRES = '7d';
const INVALID_LOGIN = { status: 401, message: 'Số điện thoại hoặc mật khẩu không chính xác' };
const SESSION_EXPIRED = { status: 401, message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại' };

export class AuthService {
  // Tạo Access Token và Refresh Token
  static generateTokens(user: IUser) {
    const payload = {
      id: user._id.toString(),
      role: user.role,
      ctvCode: user.ctvCode,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
    // type: 'refresh' → middleware không chấp nhận refresh token (hạn 7 ngày) thay cho access token
    const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES });

    return { accessToken, refreshToken };
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
  static async register(input: RegisterInput) {
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
    return { user, ...this.generateTokens(user) };
  }

  // Đăng nhập
  static async login(input: LoginInput) {
    const user = await User.findOne({ phone: input.phone });
    if (!user || !(await user.comparePassword(input.password))) throw INVALID_LOGIN;

    // Chỉ báo trạng thái tài khoản sau khi đúng mật khẩu → người lạ không dò được trạng thái bằng SĐT
    if (user.status === 'PENDING') {
      throw { status: 403, message: 'Tài khoản Quản lý đang chờ ADMIN duyệt, vui lòng quay lại sau' };
    }
    if (user.status === 'BLOCKED') {
      throw { status: 403, message: 'Tài khoản của bạn đã bị khóa' };
    }

    const tokens = this.generateTokens(user);
    return { user, ...tokens };
  }

  /**
   * Cấp lại Access Token từ Refresh Token trong HttpOnly Cookie (Story 1.1 - AC2).
   * Đọc lại user từ DB: lấy role mới nhất, tài khoản đã bị khóa thì không cấp nữa.
   */
  static async refresh(refreshToken?: string) {
    if (!refreshToken) throw SESSION_EXPIRED;

    let decoded: { id: string; type?: string };
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET) as { id: string; type?: string };
    } catch {
      throw SESSION_EXPIRED;
    }
    if (decoded.type !== 'refresh') throw SESSION_EXPIRED;

    const user = await User.findById(decoded.id);
    if (!user || user.status !== 'ACTIVE') throw SESSION_EXPIRED;

    return { user, ...this.generateTokens(user) };
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
