import { User } from '../auth/user.model.js';
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

