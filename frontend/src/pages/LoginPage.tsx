import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi.js';
import { Building2, Lock, Phone, User as UserIcon, Shield, Loader2, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoginTab, setIsLoginTab] = useState(true);

  // Form states
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'MANAGER' | 'COLLABORATOR'>('COLLABORATOR');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      if (isLoginTab) {
        // Đăng nhập
        const res = await authApi.login({ phone, password });
        localStorage.setItem('token', res.data.accessToken);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        navigate('/apartments');
      } else {
        // Đăng ký
        const res = await authApi.register({ name, phone, password, role });
        localStorage.setItem('token', res.data.accessToken);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        navigate('/apartments');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50/50 via-slate-50 to-blue-50/40">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 sm:p-8 animate-in fade-in">
        {/* Logo & Slogan */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-indigo-600 rounded-2xl text-white shadow-md mb-3">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">RoomMaster Portal</h1>
          <p className="text-xs text-slate-500 mt-1">Hệ thống Quản lý Bảng hàng Căn hộ & CTV Môi giới</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setIsLoginTab(true); setError(null); }}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
              isLoginTab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => { setIsLoginTab(false); setError(null); }}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
              !isLoginTab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Đăng ký mới
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {!isLoginTab && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Họ và tên *</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn Hải"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 block">Số điện thoại *</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="tel"
                required
                placeholder="VD: 0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 block">Mật khẩu *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {!isLoginTab && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Vai trò tham gia *</label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <label
                  className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    role === 'COLLABORATOR'
                      ? 'border-indigo-600 bg-indigo-50/60 text-indigo-700 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="COLLABORATOR"
                    checked={role === 'COLLABORATOR'}
                    onChange={() => setRole('COLLABORATOR')}
                    className="hidden"
                  />
                  <Shield className="w-4 h-4" />
                  <span className="text-xs">Cộng tác viên</span>
                </label>

                <label
                  className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    role === 'MANAGER'
                      ? 'border-indigo-600 bg-indigo-50/60 text-indigo-700 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="MANAGER"
                    checked={role === 'MANAGER'}
                    onChange={() => setRole('MANAGER')}
                    className="hidden"
                  />
                  <Building2 className="w-4 h-4" />
                  <span className="text-xs">Quản lý kho</span>
                </label>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>{isLoginTab ? 'Đăng nhập vào Hệ thống' : 'Tạo tài khoản & Nhận mã CTV'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

