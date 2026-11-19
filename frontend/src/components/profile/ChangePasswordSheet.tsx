import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { User, authApi } from '../../api/authApi.js';
import { BottomSheet } from '../layout/BottomSheet.js';
import { Button } from '../ui/Button.js';
import { fieldClass } from '../ui/Input.js';

/** Ô mật khẩu có nút hiện / ẩn (vùng bấm 44px); autocomplete để iPhone gợi ý & lưu mật khẩu. */
const PasswordField: React.FC<{ label: string; value: string; onChange: (value: string) => void; autoComplete: string; error?: string }> = ({ label, value, onChange, autoComplete, error }) => {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className="relative block">
        <input type={visible ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} className={`${fieldClass} pr-12`} aria-invalid={!!error} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
          className="absolute right-0 top-0 w-11 h-11 flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          {visible ? <EyeOff className="w-5 h-5" aria-hidden /> : <Eye className="w-5 h-5" aria-hidden />}
        </button>
      </span>
      {error && <span className="block text-sm text-rose-700">{error}</span>}
    </label>
  );
};

/**
 * Đổi mật khẩu (Story 13.9). Thiết bị này vẫn đăng nhập (nhận token mới), các thiết bị khác bị đăng xuất.
 * `forced`: vừa nhận mật khẩu tạm từ Admin → hiện dòng nhắc (đóng tạm được, lần mở app sau nhắc lại).
 */
export const ChangePasswordSheet: React.FC<{ forced?: boolean; onDone: (user: User) => void; onClose: () => void }> = ({ forced, onDone, onClose }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // Kiểm tra ngay trên máy — máy chủ vẫn kiểm tra lại
  const nextError = next && next.length < 6 ? 'Tối thiểu 6 ký tự' : next && next === current ? 'Phải khác mật khẩu hiện tại' : '';
  const confirmError = confirm && confirm !== next ? 'Không khớp với mật khẩu mới' : '';
  const ready = current && next && confirm && !nextError && !confirmError;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setSaving(true);
    setError('');
    try {
      onDone(await authApi.changePassword({ currentPassword: current, newPassword: next }));
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không đổi được mật khẩu, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet title="Đổi mật khẩu" onClose={onClose} showClose>
      {done ? (
        <div className="px-4 pb-4 space-y-3" role="status">
          <p className="p-3 rounded-xl bg-emerald-50 text-sm text-emerald-800">Đã đổi mật khẩu. Các thiết bị khác đang đăng nhập tài khoản này đã bị đăng xuất.</p>
          <Button className="w-full" onClick={onClose}>Xong</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="px-4 pb-4 space-y-3" noValidate>
          {forced && <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">Bạn đang dùng mật khẩu tạm do Admin cấp, vui lòng đặt mật khẩu mới.</p>}
          {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 text-sm text-rose-700">{error}</p>}
          <PasswordField label={forced ? 'Mật khẩu tạm' : 'Mật khẩu hiện tại'} value={current} onChange={setCurrent} autoComplete="current-password" />
          <PasswordField label="Mật khẩu mới" value={next} onChange={setNext} autoComplete="new-password" error={nextError} />
          <PasswordField label="Nhập lại mật khẩu mới" value={confirm} onChange={setConfirm} autoComplete="new-password" error={confirmError} />
          <Button type="submit" size="lg" className="w-full" disabled={!ready} loading={saving}>Đổi mật khẩu</Button>
        </form>
      )}
    </BottomSheet>
  );
};
