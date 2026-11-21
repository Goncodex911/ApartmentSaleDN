import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi.js';
import { clearOfflineData } from '../utils/offlineCache.js';
import { Loader2, ArrowRight, Eye, EyeOff, Phone, Lock, UserRound } from 'lucide-react';
import { ACTIVITY_LOG_NOTICE } from '../utils/format.js';

type Role = 'MANAGER' | 'COLLABORATOR';
const ROLES: { value: Role; label: string }[] = [
  { value: 'COLLABORATOR', label: 'Cộng tác viên' },
  { value: 'MANAGER', label: 'Quản lý kho' },
];

// Ô nhập có icon bên trái — cao 48px, chữ 16px trên điện thoại (iPhone không tự phóng to)
const inputClass =
  'w-full h-12 pl-11 pr-3 text-base sm:text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy/40 focus:border-brand-navy';
const IconField: React.FC<{ label: string; icon: React.ElementType; children: React.ReactNode }> = ({ label, icon: Icon, children }) => (
  <label className="block space-y-1.5">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    <span className="relative block">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" aria-hidden />
      {children}
    </span>
  </label>
);

/**
 * Trang đăng nhập theo nhận diện ApartmentDN (Story 10.5): nửa trên nền navy + logo DN, thẻ đăng nhập trắng phủ lên.
 * Chuyển tab có thanh trượt (≤ 200ms, tắt khi người dùng bật "giảm chuyển động"); nút nhấn co nhẹ ngay khi chạm.
 */
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('COLLABORATOR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const switchTab = (login: boolean) => {
    setIsLoginTab(login);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      setLoading(true);
      const res = isLoginTab ? await authApi.login({ phone, password }) : await authApi.register({ name, phone, password, role });
      // Tài khoản Quản lý tự đăng ký phải chờ ADMIN duyệt → chưa có token, quay về tab đăng nhập
      if (!isLoginTab && res.data.pendingApproval) {
        setNotice(res.message);
        setIsLoginTab(true);
        return;
      }
      localStorage.setItem('token', res.data.accessToken);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      await clearOfflineData(); // Bỏ dữ liệu offline của tài khoản trước trên máy này (Story 9.1)
      navigate('/apartments');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-100">
      {/* Phần thương hiệu: nền navy, ánh vàng nhẹ phía sau logo */}
      <header className="relative overflow-hidden bg-brand-navy pt-[calc(env(safe-area-inset-top)+3rem)] pb-20 px-6 text-center">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-brand-gold/10 blur-3xl" aria-hidden />
        <img src="/icons/icon-192.png" alt="" className="relative mx-auto w-20 h-20 rounded-[22px] shadow-lg shadow-black/30 ring-1 ring-brand-gold/40" />
        <h1 className="relative mt-4 text-3xl font-bold tracking-tight text-white">ApartmentDN</h1>
        <p className="relative mt-1.5 text-sm text-brand-gold-light">Kho căn hộ cho thuê Đà Nẵng cho CTV & Quản lý</p>
      </header>

      <main className="relative -mt-12 flex-1 px-4 pb-badge-safe">
        <div className="mx-auto w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-900/10 p-5 sm:p-7">
          {/* Tab: thanh trượt nền trắng di chuyển theo lựa chọn */}
          <div role="tablist" className="relative grid grid-cols-2 p-1 mb-5 bg-slate-100 rounded-xl">
            <span
              aria-hidden
              className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none ${isLoginTab ? '' : 'translate-x-full'}`}
            />
            {[true, false].map((login) => (
              <button
                key={String(login)}
                type="button"
                role="tab"
                aria-selected={isLoginTab === login}
                onClick={() => switchTab(login)}
                className={`relative h-11 text-sm font-semibold rounded-lg transition-colors ${isLoginTab === login ? 'text-brand-navy' : 'text-slate-500'}`}
              >
                {login ? 'Đăng nhập' : 'Đăng ký mới'}
              </button>
            ))}
          </div>

          {notice && <p role="status" className="mb-4 p-3 rounded-xl bg-emerald-50 text-sm text-emerald-800">{notice}</p>}
          {error && <p role="alert" className="mb-4 p-3 rounded-xl bg-rose-50 text-sm text-rose-700">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLoginTab && (
              <IconField label="Họ và tên" icon={UserRound}>
                <input required autoComplete="name" placeholder="VD: Nguyễn Văn Hải" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              </IconField>
            )}
            <IconField label="Số điện thoại" icon={Phone}>
              <input type="tel" inputMode="tel" name="phone" autoComplete="username" required placeholder="0912 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </IconField>
            <IconField label="Mật khẩu" icon={Lock}>
              {/* autoComplete đúng loại → iPhone / Chrome điền đúng mật khẩu theo SĐT */}
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete={isLoginTab ? 'current-password' : 'new-password'}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                minLength={6}
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((shown) => !shown)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute right-0.5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-slate-500 hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </IconField>

            {!isLoginTab && (
              <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium text-slate-700">Vai trò</legend>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      aria-pressed={role === item.value}
                      onClick={() => setRole(item.value)}
                      className={`h-12 rounded-xl border text-sm font-medium transition-colors ${role === item.value ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-200 text-slate-600'}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                {role === 'MANAGER' && <p className="text-xs text-amber-700">Tài khoản Quản lý cần ADMIN duyệt trước khi đăng nhập.</p>}
              </fieldset>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 flex items-center justify-center gap-2 rounded-xl bg-brand-navy text-white text-base font-semibold shadow-md shadow-brand-navy/20 hover:bg-brand-navy-soft active:scale-[0.98] transition-transform duration-100 motion-reduce:transform-none disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" aria-label="Đang xử lý" />
              ) : (
                <>
                  {isLoginTab ? 'Đăng nhập' : 'Tạo tài khoản & nhận mã CTV'}
                  <ArrowRight className="w-5 h-5 text-brand-gold-light" aria-hidden />
                </>
              )}
            </button>
          </form>
        </div>
        {/* Story 16.9 (Q5): minh bạch việc ghi nhật ký — Nghị định 13/2023 */}
        <p className="mt-4 text-center text-xs text-slate-600">{ACTIVITY_LOG_NOTICE}</p>
        <p className="mt-2 text-center text-xs text-slate-500">© ApartmentDN · Đà Nẵng</p>
      </main>
    </div>
  );
};
