import { UserService } from './user.service.js';
import { updateProfileSchema, updateUserStatusSchema, listUsersQuerySchema } from './user.validation.js';
import { asyncHandler } from '../../utils/async-handler.js';

export class UserController {
  // Xem hồ sơ cá nhân hiện tại
  static getProfile = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: await UserService.getProfile(req.user!.id) });
  });

  // Cập nhật hồ sơ cá nhân
  static updateProfile = asyncHandler(async (req, res) => {
    const data = await UserService.updateProfile(req.user!.id, updateProfileSchema.parse(req.body));
    res.status(200).json({ success: true, message: 'Cập nhật hồ sơ thành công', data });
  });

  // POST /api/v1/users/telegram-link — tạo deep link liên kết Telegram nhận thông báo
  static createTelegramLink = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: await UserService.createTelegramLink(req.user!.id) });
  });

  // DELETE /api/v1/users/telegram-link — hủy liên kết Telegram
  static unlinkTelegram = asyncHandler(async (req, res) => {
    await UserService.unlinkTelegram(req.user!.id);
    res.status(200).json({ success: true, message: 'Đã hủy liên kết Telegram' });
  });

  // [ADMIN] GET /api/v1/users?status=PENDING — danh sách tài khoản chờ duyệt
  static listUsers = asyncHandler(async (req, res) => {
    const { status } = listUsersQuerySchema.parse(req.query);
    res.status(200).json({ success: true, data: await UserService.listByStatus(status) });
  });

  // [ADMIN] PATCH /api/v1/users/:id/status — duyệt (ACTIVE) hoặc khóa (BLOCKED) tài khoản
  static updateStatus = asyncHandler(async (req, res) => {
    const { status } = updateUserStatusSchema.parse(req.body);
    const data = await UserService.updateStatus(String(req.params.id), status);
    res.status(200).json({ success: true, message: 'Cập nhật trạng thái tài khoản thành công', data });
  });

  // Lấy thông tin công khai của CTV theo ctvCode (Public)
  static getPublicCtv = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: await UserService.getPublicCtvByCode(String(req.params.ctvCode)) });
  });
}
