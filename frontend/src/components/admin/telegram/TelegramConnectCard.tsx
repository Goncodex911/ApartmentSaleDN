import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Loader2, LogOut, Phone, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react';
import { telegramUserbotApi, TelegramSessionStatus } from '../../../api/telegramUserbotApi.js';
import { Skeleton } from '../../ui/Skeleton.js';
import { ui } from './telegramUi.js';

interface Props {
  session: TelegramSessionStatus | null;
  onConnected: () => void;
  onDisconnected: () => void;
}

const errorMessage = (err: any, fallback: string) => err?.response?.data?.message || err?.message || fallback;
// Điện thoại (màn cảm ứng) mặc định xác nhận 1-chạm; máy tính mặc định nhập OTP
const isTouchDevice = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

export const TelegramConnectCard: React.FC<Props> = ({ session, onConnected, onDisconnected }) => {
  const [mode, setMode] = useState<'1TAP' | 'OTP'>(isTouchDevice() ? '1TAP' : 'OTP');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Xác nhận 1-chạm
  const [tgUrl, setTgUrl] = useState<string | null>(null);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [password, setPassword] = useState('');
  const passwordRef = useRef(''); // Vòng hỏi trạng thái đọc mật khẩu mới nhất (tránh closure cũ)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mã OTP
  const [phone, setPhone] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [otp, setOtp] = useState('');

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };
  useEffect(() => stopPolling, []);

  const checkQr = async () => {
    try {
      const res = await telegramUserbotApi.checkQrAuth(passwordRef.current || undefined);
      if (res.status === 'SUCCESS') {
        stopPolling();
        setTgUrl(null);
        onConnected();
      } else if (res.status === 'REQUIRES_2FA') {
        setNeeds2FA(true);
        if (passwordRef.current) setError(res.message || 'Mật khẩu 2FA không đúng');
      } else if (res.status === 'EXPIRED') {
        stopPolling();
        setTgUrl(null);
      }
    } catch {
      // Lỗi mạng tạm thời → lượt hỏi sau thử lại
    }
  };

  const startQr = async () => {
    setBusy(true);
    setError(null);
    setNeeds2FA(false);
    try {
      const res = await telegramUserbotApi.startQrAuth();
      setTgUrl(res.tgUrl);
      stopPolling();
      pollRef.current = setInterval(checkQr, 2500);
    } catch (err) {
      setError(errorMessage(err, 'Không tạo được liên kết xác nhận'));
    } finally {
      setBusy(false);
    }
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await telegramUserbotApi.sendCode(phone.trim());
      setPhoneCodeHash(res.phoneCodeHash);
    } catch (err) {
      setError(errorMessage(err, 'Không gửi được mã OTP'));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await telegramUserbotApi.verifyCode({ phone: phone.trim(), phoneCodeHash, code: otp.trim(), password: password.trim() || undefined });
      if (res.requires2FA) {
        setNeeds2FA(true);
        setError('Tài khoản bật xác thực 2 lớp: nhập thêm mật khẩu 2FA rồi bấm Xác nhận.');
        return;
      }
      setPhoneCodeHash('');
      setOtp('');
      onConnected();
    } catch (err) {
      setError(errorMessage(err, 'Xác thực OTP thất bại'));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Hủy kết nối tài khoản Telegram? Bộ đón tin thời gian thực cũng sẽ dừng.')) return;
    setBusy(true);
    try {
      await telegramUserbotApi.disconnect();
      onDisconnected();
    } catch (err) {
      setError(errorMessage(err, 'Không hủy được kết nối'));
    } finally {
      setBusy(false);
    }
  };

  const passwordField = needs2FA && (
    <div className="space-y-1.5">
      <label htmlFor="tg-2fa" className={ui.label}>Mật khẩu xác thực 2 lớp (2FA)</label>
      <input
        id="tg-2fa"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => { setPassword(e.target.value); passwordRef.current = e.target.value; }}
        className={ui.input}
      />
    </div>
  );

  return (
    <section className={ui.card} aria-labelledby="tg-connect-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="tg-connect-title" className={ui.cardTitle}>
          <ShieldCheck className="w-5 h-5 text-indigo-600" aria-hidden /> Tài khoản Telegram
        </h2>
        {session?.isConnected && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden /> Đã kết nối
          </span>
        )}
      </div>

      {error && <p role="alert" className={ui.alert}><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />{error}</p>}

      {!session ? (
        <Skeleton className="h-16 rounded-xl" />
      ) : session.isConnected ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate">
              {[session.user?.firstName, session.user?.lastName].filter(Boolean).join(' ') || 'Tài khoản Telegram'}
              {session.user?.username && <span className="ml-1.5 text-sm font-medium text-indigo-700">@{session.user.username}</span>}
            </p>
            <p className={ui.hint}>SĐT <span className="font-semibold text-slate-800 tabular-nums">{session.user?.phone}</span> · Đọc được nhóm kín bạn đang tham gia</p>
          </div>
          <button type="button" onClick={disconnect} disabled={busy} className={ui.dangerBtn}>
            <LogOut className="w-4 h-4" aria-hidden /> Hủy kết nối
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Kết nối một lần để hệ thống đọc các nhóm BĐS bạn đang tham gia. Phiên đăng nhập được mã hóa trên máy chủ.</p>

          <div role="tablist" aria-label="Cách kết nối" className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100">
            <button type="button" role="tab" aria-selected={mode === '1TAP'} onClick={() => setMode('1TAP')} className={ui.segment(mode === '1TAP')}>
              Xác nhận 1-chạm
            </button>
            <button type="button" role="tab" aria-selected={mode === 'OTP'} onClick={() => setMode('OTP')} className={ui.segment(mode === 'OTP')}>
              Mã OTP
            </button>
          </div>

          {mode === '1TAP' ? (
            tgUrl ? (
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-800" aria-live="polite">
                  <Loader2 className="w-4 h-4 text-indigo-600 motion-safe:animate-spin" aria-hidden /> Đang chờ bạn bấm xác nhận trong Telegram...
                </p>
                <a href={tgUrl} className={`${ui.primaryBtn} w-full`}>
                  <Smartphone className="w-5 h-5" aria-hidden /> Mở Telegram để xác nhận
                </a>
                <p className={ui.hint}>Nút này cần bấm trên điện thoại đang cài Telegram. Đang dùng máy tính? Chuyển sang tab "Mã OTP".</p>
                {passwordField}
                {needs2FA && <button type="button" onClick={checkQr} className={`${ui.primaryBtn} w-full`}>Xác nhận mật khẩu</button>}
                <button type="button" onClick={startQr} disabled={busy} className={`${ui.secondaryBtn} w-full`}>
                  <RefreshCw className="w-4 h-4" aria-hidden /> Tạo liên kết mới
                </button>
              </div>
            ) : (
              <button type="button" onClick={startQr} disabled={busy} className={`${ui.primaryBtn} w-full`}>
                {busy ? <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden /> : <Smartphone className="w-4 h-4" aria-hidden />}
                Tạo liên kết xác nhận 1-chạm
              </button>
            )
          ) : !phoneCodeHash ? (
            <form onSubmit={sendCode} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="tg-phone" className={ui.label}>Số điện thoại Telegram</label>
                <input id="tg-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0905 123 456" className={ui.input} />
              </div>
              <button type="submit" disabled={busy || !phone.trim()} className={`${ui.primaryBtn} w-full sm:w-auto`}>
                {busy ? <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden /> : <Phone className="w-4 h-4" aria-hidden />} Gửi mã OTP
              </button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="space-y-3">
              <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
                Telegram vừa gửi mã vào <strong>ứng dụng Telegram</strong> của số {phone}.
              </p>
              <div className="space-y-1.5">
                <label htmlFor="tg-otp" className={ui.label}>Mã xác thực</label>
                <input id="tg-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={otp} onChange={(e) => setOtp(e.target.value)} className={`${ui.input} font-mono tracking-widest`} />
              </div>
              {passwordField}
              <div className="flex flex-col sm:flex-row gap-2">
                <button type="submit" disabled={busy || !otp.trim()} className={ui.primaryBtn}>
                  {busy ? <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden /> : <KeyRound className="w-4 h-4" aria-hidden />} Xác nhận & kết nối
                </button>
                <button type="button" onClick={() => { setPhoneCodeHash(''); setNeeds2FA(false); setOtp(''); }} className={ui.secondaryBtn}>Đổi số điện thoại</button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
};
