import jwt from 'jsonwebtoken';
import { User, IUser } from './user.model.js';
import { RegisterInput, LoginInput } from './auth.validation.js';

const JWT_SECRET = process.env.JWT_SECRET || 'apartment_default_secret_key_change_me';
const ACCESS_TOKEN_EXPIRES = '1h';
const REFRESH_TOKEN_EXPIRES = '7d';

export class AuthService {
  // Tạo Access Token và Refresh Token
  static generateTokens(user: IUser) {
    const payload = {
      id: user._id.toString(),
      role: user.role,
      ctvCode: user.ctvCode,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
    const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES });

    return { accessToken, refreshToken };
  }

  // Tự động sinh ctvCode độc nhất (VD: CTV1024)
  static async generateUniqueCtvCode(): Promise<string> {
    let code = '';
    let exists = true;
    while (exists) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      code = `CTV${randomNum}`;
      const found = await User.exists({ ctvCode: code });
      if (!found) exists = false;
    }
    return code;
  }

  // Đăng ký người dùng mới
  static async register(input: RegisterInput) {
    const existing = await User.findOne({ phone: input.phone });
    if (existing) {
      throw { status: 400, message: 'Số điện thoại này đã được đăng ký tài khoản' };
    }

    const ctvCode = await this.generateUniqueCtvCode();
    const user = await User.create({
      ...input,
      ctvCode,
      status: 'ACTIVE',
    });

    const tokens = this.generateTokens(user);
    return { user, ...tokens };
  }

  // Đăng nhập
  static async login(input: LoginInput) {
    const user = await User.findOne({ phone: input.phone });
    if (!user) {
      throw { status: 401, message: 'Số điện thoại hoặc mật khẩu không chính xác' };
    }

    if (user.status === 'BLOCKED') {
      throw { status: 403, message: 'Tài khoản của bạn đã bị khóa' };
    }

    const isMatch = await user.comparePassword(input.password);
    if (!isMatch) {
      throw { status: 401, message: 'Số điện thoại hoặc mật khẩu không chính xác' };
    }

    const tokens = this.generateTokens(user);
    return { user, ...tokens };
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

