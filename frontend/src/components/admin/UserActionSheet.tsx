import React, { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Check, Copy, Flag, FlagOff, KeyRound, Lock, Unlock } from 'lucide-react';
import { AdminUser, userApi } from '../../api/userApi.js';
import { BottomSheet } from '../layout/BottomSheet.js';
import { Button } from '../ui/Button.js';
import { copyText } from '../../utils/clipboard.js';
import { ROLE_LABEL, UserBadges } from './UserBadges.js';

type Action = {
  id: string;
  label: string;
  icon: React.ElementType;
  variant: 'primary' | 'outline' | 'danger';
  confirm: string; // Câu hỏi xác nhận trước khi thực hiện
  run: () => Promise<AdminUser | string>;
};

/**
 * [ADMIN] Thao tác trên 1 thành viên (Story 13.2): duyệt, thăng / hạ vai trò, khóa / mở khóa, đặt lại mật khẩu.
 * Mọi thao tác có bước xác nhận; tài khoản ADMIN và chính mình bị khóa nút (backend cũng chặn).
 */
export const UserActionSheet: React.FC<{ user: AdminUser; currentUserId?: string; onChanged: (user: AdminUser) => void; onClose: () => void }> = ({
  user,
  currentUserId,
  onChanged,
  onClose,
}) => {
  const [pending, setPending] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const locked = user.role === 'ADMIN' || user._id === currentUserId;

  const actions: Action[] = [];
  if (user.status === 'PENDING') {
    actions.push({ id: 'approve', label: 'Duyệt tài khoản', icon: Check, variant: 'primary', confirm: `Duyệt cho ${user.name} vào hệ thống?`, run: () => userApi.updateUserStatus(user._id, 'ACTIVE') });
  }
  if (user.role === 'COLLABORATOR') {
    actions.push({ id: 'promote', label: 'Thăng cấp lên Quản lý', icon: ArrowUpCircle, variant: 'outline', confirm: `${user.name} sẽ xem được SĐT chủ nhà và duyệt tin đăng. Tiếp tục?`, run: () => userApi.updateUserRole(user._id, 'MANAGER') });
  } else if (user.role === 'MANAGER') {
    actions.push({ id: 'demote', label: 'Hạ xuống CTV', icon: ArrowDownCircle, variant: 'outline', confirm: `${user.name} sẽ mất quyền xem SĐT chủ nhà và duyệt tin. Tiếp tục?`, run: () => userApi.updateUserRole(user._id, 'COLLABORATOR') });
  }
  actions.push({ id: 'reset', label: 'Đặt lại mật khẩu', icon: KeyRound, variant: 'outline', confirm: `Tạo mật khẩu tạm cho ${user.name}? Các thiết bị đang đăng nhập sẽ bị đăng xuất.`, run: () => userApi.resetUserPassword(user._id) });
  // Story 13.6: quyền báo lỗi tin (tự khóa khi điểm tín nhiệm < −15)
  if (user.canReport === false) {
    actions.push({ id: 'allowReport', label: 'Mở lại quyền báo lỗi', icon: Flag, variant: 'outline', confirm: `Cho ${user.name} báo lỗi tin trở lại? Điểm tín nhiệm âm được đưa về 0.`, run: () => userApi.setCanReport(user._id, true) });
  } else if (user.role === 'COLLABORATOR') {
    actions.push({ id: 'blockReport', label: 'Khóa quyền báo lỗi', icon: FlagOff, variant: 'outline', confirm: `${user.name} sẽ không gửi được báo lỗi tin nữa. Tiếp tục?`, run: () => userApi.setCanReport(user._id, false) });
  }
  if (user.status === 'BLOCKED') {
    actions.push({ id: 'unblock', label: 'Mở khóa tài khoản', icon: Unlock, variant: 'outline', confirm: `Mở khóa cho ${user.name}?`, run: () => userApi.updateUserStatus(user._id, 'ACTIVE') });
  } else if (user.status === 'ACTIVE') {
    actions.push({ id: 'block', label: 'Khóa tài khoản', icon: Lock, variant: 'danger', confirm: `Khóa ${user.name}? Người này bị đăng xuất ngay và không dùng app được nữa.`, run: () => userApi.updateUserStatus(user._id, 'BLOCKED') });
  }

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    setError('');
    try {
      const result = await pending.run();
      if (typeof result === 'string') setTempPassword(result);
      else onChanged(result);
      setPending(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thực hiện được, vui lòng thử lại');
    } finally {
      setBusy(false);
    }
  };

  const copyPassword = async () => {
    if (await copyText(tempPassword)) setCopied(true);
  };

  return (
    <BottomSheet title={user.name} onClose={onClose} showClose>
      <div className="px-4 pb-4 space-y-4">
        <div className="space-y-1.5">
          <UserBadges user={user} />
          <p className="text-sm text-slate-600">
            {user.phone} · {user.ctvCode} · Tham gia {new Date(user.createdAt).toLocaleDateString('vi-VN')}
            {user.trustScore !== undefined && ` · Tín nhiệm ${user.trustScore}${user.canReport === false ? ' (đã khóa báo lỗi)' : ''}`}
          </p>
        </div>

        {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 text-sm text-rose-700">{error}</p>}

        {tempPassword ? (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3" role="status">
            <p className="text-sm text-amber-900">Mật khẩu tạm — chỉ hiện 1 lần. Gửi riêng cho {user.name} (Zalo / điện thoại), không đăng vào nhóm. Lần đăng nhập tới, app sẽ yêu cầu đặt mật khẩu mới.</p>
            <p className="font-mono text-2xl font-bold tracking-wider text-slate-900 select-all break-all">{tempPassword}</p>
            <Button variant="secondary" icon={copied ? Check : Copy} onClick={copyPassword} className="w-full">
              {copied ? 'Đã sao chép' : 'Sao chép mật khẩu'}
            </Button>
          </div>
        ) : pending ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-800">{pending.confirm}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setPending(null)} disabled={busy}>Hủy</Button>
              <Button variant={pending.variant === 'danger' ? 'danger' : 'primary'} loading={busy} onClick={confirm}>Xác nhận</Button>
            </div>
          </div>
        ) : locked ? (
          <p className="p-3 rounded-xl bg-slate-100 text-sm text-slate-700">
            {user._id === currentUserId ? 'Đây là tài khoản của bạn' : `Tài khoản ${ROLE_LABEL.ADMIN}`} — không đổi vai trò, khóa hay đặt lại mật khẩu từ đây để tránh mất quyền quản trị.
          </p>
        ) : (
          <div className="grid gap-2">
            {actions.map((action) => (
              <Button key={action.id} variant={action.variant} icon={action.icon} onClick={() => setPending(action)} className="w-full justify-start">
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
