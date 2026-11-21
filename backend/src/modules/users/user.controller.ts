import { UserService } from './user.service.js';
import { updateProfileSchema, updateUserStatusSchema, listUsersQuerySchema, updateUserRoleSchema, updateCanReportSchema } from './user.validation.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { auditActor } from '../audit/audit.service.js';
import { getUserOverview } from './user-overview.service.js';
import { UserAdminService } from './user-admin.service.js';
import { SessionService, sessionKey } from './session.service.js';
import { adminUpdateUserSchema, createUserSchema, userNoteSchema } from './user.validation.js';

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
  // [Quản lý] GET /api/v1/users/collaborators — danh sách CTV đang hoạt động (Story 11.5)
  static listCollaborators = asyncHandler(async (_req, res) => {
    res.status(200).json({ success: true, data: await UserService.listCollaborators() });
  });

  // [ADMIN] GET /api/v1/users?status=&role=&search=&page= — danh sách thành viên (Story 13.2)
  static listUsers = asyncHandler(async (req, res) => {
    const { items, ...meta } = await UserService.list(listUsersQuerySchema.parse(req.query));
    res.status(200).json({ success: true, data: items, meta });
  });

  // [ADMIN] PATCH /api/v1/users/:id/status — duyệt (ACTIVE) hoặc khóa (BLOCKED) tài khoản
  static updateStatus = asyncHandler(async (req, res) => {
    const { status } = updateUserStatusSchema.parse(req.body);
    const data = await UserService.updateStatus(auditActor(req), String(req.params.id), status);
    res.status(200).json({ success: true, message: 'Cập nhật trạng thái tài khoản thành công', data });
  });

  // [ADMIN] PATCH /api/v1/users/:id/role — Quản lý ↔ CTV (Story 13.2)
  static updateRole = asyncHandler(async (req, res) => {
    const { role } = updateUserRoleSchema.parse(req.body);
    const data = await UserService.updateRole(auditActor(req), String(req.params.id), role);
    res.status(200).json({ success: true, message: 'Đã đổi vai trò', data });
  });

  // [ADMIN] PATCH /api/v1/users/:id/can-report — khóa / mở quyền báo lỗi tin (Story 13.6)
  static updateCanReport = asyncHandler(async (req, res) => {
    const { canReport } = updateCanReportSchema.parse(req.body);
    res.status(200).json({ success: true, data: await UserService.setCanReport(auditActor(req), String(req.params.id), canReport) });
  });

  // [ADMIN] POST /api/v1/users/:id/reset-password — trả mật khẩu tạm đúng 1 lần (Story 13.2)
  static resetPassword = asyncHandler(async (req, res) => {
    const { tempPassword } = await UserService.resetPassword(auditActor(req), String(req.params.id));
    res.set('Cache-Control', 'no-store').status(200).json({ success: true, data: { tempPassword } });
  });

  // [ADMIN] GET /api/v1/users/:id/overview?range=30d|all — Hồ sơ 360° (Story 16.3)
  static overview = asyncHandler(async (req, res) => {
    const range = req.query.range === 'all' ? 'all' : '30d';
    res.status(200).json({ success: true, data: await getUserOverview(String(req.params.id), range) });
  });

  // [ADMIN] POST /api/v1/users — tạo CTV / Quản lý, trả mật khẩu tạm đúng 1 lần (Story 16.6)
  static create = asyncHandler(async (req, res) => {
    const { user, tempPassword } = await UserAdminService.create(auditActor(req), createUserSchema.parse(req.body));
    res.set('Cache-Control', 'no-store').status(201).json({ success: true, message: 'Đã tạo tài khoản', data: { user, tempPassword } });
  });

  // [ADMIN] PATCH /api/v1/users/:id — sửa tên / SĐT / email (Story 16.6)
  static adminUpdate = asyncHandler(async (req, res) => {
    const data = await UserAdminService.update(auditActor(req), String(req.params.id), adminUpdateUserSchema.parse(req.body));
    res.status(200).json({ success: true, message: 'Đã cập nhật thông tin', data });
  });

  // [ADMIN] Ghi chú nội bộ (Story 16.6)
  static listNotes = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: await UserAdminService.listNotes(String(req.params.id)) });
  });
  static addNote = asyncHandler(async (req, res) => {
    const { text } = userNoteSchema.parse(req.body);
    res.status(201).json({ success: true, data: await UserAdminService.addNote(auditActor(req), String(req.params.id), text) });
  });
  static deleteNote = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: await UserAdminService.deleteNote(auditActor(req), String(req.params.id), String(req.params.noteId)) });
  });

  // Story 16.4 — thiết bị đang đăng nhập. [ADMIN] của thành viên bất kỳ; /me: của chính mình
  static listSessions = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: await SessionService.list(String(req.params.id), req.user!.sid) });
  });
  static revokeSession = asyncHandler(async (req, res) => {
    await SessionService.revoke(auditActor(req), String(req.params.id), String(req.params.sessionId));
    res.status(200).json({ success: true, message: 'Đã đăng xuất thiết bị' });
  });
  static revokeAllSessions = asyncHandler(async (req, res) => {
    await SessionService.revokeAll(auditActor(req), String(req.params.id));
    res.status(200).json({ success: true, message: 'Đã đăng xuất mọi thiết bị' });
  });
  static listMySessions = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: await SessionService.list(req.user!.id, req.user!.sid) });
  });
  static revokeMySession = asyncHandler(async (req, res) => {
    const id = String(req.params.sessionId);
    if (req.user!.sid && sessionKey(req.user!.sid) === id) throw { status: 400, message: 'Dùng nút Đăng xuất để thoát thiết bị đang dùng' };
    await SessionService.revoke(auditActor(req), req.user!.id, id);
    res.status(200).json({ success: true, message: 'Đã đăng xuất thiết bị' });
  });

  // Lấy thông tin công khai của CTV theo ctvCode (Public)
  static getPublicCtv = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: await UserService.getPublicCtvByCode(String(req.params.ctvCode)) });
  });
}
