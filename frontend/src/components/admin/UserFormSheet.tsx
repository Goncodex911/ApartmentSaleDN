import React, { useState } from 'react';
import { AdminUser, userApi } from '../../api/userApi.js';
import { BottomSheet } from '../layout/BottomSheet.js';
import { Button } from '../ui/Button.js';
import { Input, Select } from '../ui/Input.js';
import { TempPasswordReveal } from './TempPasswordReveal.js';

type Props =
  | { mode: 'create'; onDone: (user: AdminUser) => void; onClose: () => void }
  | { mode: 'edit'; user: AdminUser & { email?: string }; onDone: (user: AdminUser) => void; onClose: () => void };

/**
 * [ADMIN] Story 16.6: thêm thành viên (CTV / Quản lý, mật khẩu tạm hiện 1 lần) hoặc sửa tên / SĐT / email.
 * Đổi SĐT = đổi tên đăng nhập → server đăng xuất mọi thiết bị của người đó (có nhắc trước khi lưu).
 */
export const UserFormSheet: React.FC<Props> = (props) => {
  const initial = props.mode === 'edit' ? props.user : undefined;
  const [name, setName] = useState(initial?.name ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [role, setRole] = useState<'COLLABORATOR' | 'MANAGER'>('COLLABORATOR');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ form?: string; phone?: string }>({});
  const [created, setCreated] = useState<{ name: string; password: string } | null>(null);
  const phoneChanged = props.mode === 'edit' && phone.trim() !== initial?.phone;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const data = { name: name.trim(), phone: phone.trim(), email: email.trim() };
    try {
      if (props.mode === 'create') {
        const result = await userApi.createUser({ ...data, role });
        props.onDone(result.user);
        setCreated({ name: result.user.name, password: result.tempPassword });
      } else {
        props.onDone(await userApi.updateUser(props.user._id, data));
        props.onClose();
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Không lưu được, vui lòng thử lại';
      setErrors(err.response?.status === 409 ? { phone: message } : { form: message });
    } finally {
      setBusy(false);
    }
  };

  const title = props.mode === 'create' ? 'Thêm thành viên' : 'Sửa thông tin';
  return (
    <BottomSheet title={title} onClose={props.onClose} showClose>
      {created ? (
        <div className="space-y-3 pb-2">
          <p className="text-sm text-slate-800">Đã tạo tài khoản cho <strong>{created.name}</strong>. Đăng nhập bằng SĐT {phone.trim()} và mật khẩu tạm dưới đây.</p>
          <TempPasswordReveal name={created.name} password={created.password} />
          <Button variant="outline" onClick={props.onClose} className="w-full">Xong</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3 pb-2" noValidate>
          <Input label="Họ tên" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" required minLength={2} maxLength={100} />
          <Input label="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="off" required error={errors.phone}
            hint={phoneChanged ? 'Đổi SĐT sẽ đăng xuất người này khỏi mọi thiết bị; họ đăng nhập lại bằng SĐT mới.' : 'SĐT là tên đăng nhập.'} />
          <Input label="Email (không bắt buộc)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" autoComplete="off" />
          {props.mode === 'create' && (
            <Select label="Vai trò" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
              <option value="COLLABORATOR">CTV</option>
              <option value="MANAGER">Quản lý (xem được SĐT chủ nhà, duyệt tin)</option>
            </Select>
          )}
          {errors.form && <p role="alert" className="p-3 rounded-xl bg-rose-50 text-sm text-rose-700">{errors.form}</p>}
          <Button type="submit" loading={busy} disabled={name.trim().length < 2 || !phone.trim()} className="w-full">
            {props.mode === 'create' ? 'Tạo tài khoản' : 'Lưu thay đổi'}
          </Button>
        </form>
      )}
    </BottomSheet>
  );
};
