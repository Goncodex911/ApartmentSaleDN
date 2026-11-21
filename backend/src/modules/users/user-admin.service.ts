import { z } from 'zod';
import { User } from '../auth/user.model.js';
import { AuthService } from '../auth/auth.service.js';
import { forgetSession } from '../../middlewares/auth.js';
import { AuditActor, AuditService } from '../audit/audit.service.js';
import { maskPhone } from '../audit/audit-actions.js';
import { findTarget, generateTempPassword, userTarget } from './user.service.js';
import { adminUpdateUserSchema, createUserSchema } from './user.validation.js';

const ADMIN_LOCKED = { status: 403, message: 'Không thể sửa tài khoản ADMIN từ trang Thành viên' };

async function assertPhoneFree(phone: string, exceptId?: string) {
  const owner = await User.findOne({ phone, ...(exceptId && { _id: { $ne: exceptId } }) }).select('name').lean();
  if (owner) throw { status: 409, message: `SĐT đã thuộc tài khoản ${owner.name}` };
}

/** [ADMIN] Story 16.6: tạo / sửa tài khoản trực tiếp và ghi chú nội bộ về thành viên. */
export class UserAdminService {
  /** Tạo CTV / Quản lý đang hoạt động + mật khẩu tạm 1 lần (bắt đổi ở lần đăng nhập đầu — 13.9). Không lưu / ghi log mật khẩu tạm. */
  static async create(actor: AuditActor, input: z.infer<typeof createUserSchema>) {
    await assertPhoneFree(input.phone);
    const tempPassword = generateTempPassword();
    const user = await User.create({
      name: input.name,
      phone: input.phone,
      email: input.email || undefined,
      role: input.role,
      status: 'ACTIVE',
      ctvCode: await AuthService.generateUniqueCtvCode(),
      password: tempPassword, // pre('save') băm bcrypt
      mustChangePassword: true,
    }).catch((err) => {
      if (err.code === 11000) throw { status: 409, message: 'SĐT đã được đăng ký' }; // 2 Admin tạo cùng lúc
      throw err;
    });
    AuditService.log(actor, 'CREATE_USER', userTarget(user), { role: input.role, phone: maskPhone(input.phone) });
    return { user, tempPassword };
  }

  /** Sửa tên / SĐT / email. Đổi SĐT (= tên đăng nhập) → đăng xuất mọi thiết bị của người đó. */
  static async update(actor: AuditActor, userId: string, input: z.infer<typeof adminUpdateUserSchema>) {
    const user = await findTarget(userId);
    if (user.role === 'ADMIN') throw ADMIN_LOCKED;
    if (input.phone && input.phone !== user.phone) await assertPhoneFree(input.phone, userId);

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const field of ['name', 'phone', 'email'] as const) {
      const next = input[field] === '' ? undefined : input[field];
      if (input[field] === undefined || next === user[field]) continue;
      changes[field] = field === 'phone' ? { from: maskPhone(user.phone), to: maskPhone(next!) } : { from: user[field] ?? null, to: next ?? null };
      user.set(field, next);
    }
    if (!Object.keys(changes).length) return user;
    if (changes.phone) {
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
      user.refreshSessions = [];
    }
    await user.save();
    if (changes.phone) forgetSession(userId);
    AuditService.log(actor, 'UPDATE_USER', userTarget(user), { changes });
    return user;
  }

  static async listNotes(userId: string) {
    const user = await User.findById(userId).select('adminNotes').lean();
    return (user?.adminNotes ?? []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async addNote(actor: AuditActor, userId: string, text: string) {
    const [user, author] = await Promise.all([findTarget(userId), User.findById(actor.id).select('name').lean()]);
    user.adminNotes.push({ text, authorId: actor.id, authorName: author?.name ?? '' } as never);
    await user.save();
    AuditService.log(actor, 'ADD_USER_NOTE', userTarget(user));
    return this.listNotes(userId);
  }

  /** Chỉ người viết mới xóa được ghi chú của mình. */
  static async deleteNote(actor: AuditActor, userId: string, noteId: string) {
    const result = await User.updateOne({ _id: userId }, { $pull: { adminNotes: { _id: noteId, authorId: actor.id } } });
    if (!result.modifiedCount) throw { status: 404, message: 'Không tìm thấy ghi chú của bạn' };
    const user = await findTarget(userId);
    AuditService.log(actor, 'DELETE_USER_NOTE', userTarget(user));
    return this.listNotes(userId);
  }
}
