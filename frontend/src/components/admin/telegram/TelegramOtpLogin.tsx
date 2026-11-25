import React, { useState } from 'react';
import { AlertCircle, ExternalLink, KeyRound, Loader2, Mail, MessageSquare, Phone, RotateCcw, Smartphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { telegramUserbotApi, CodeChannel, PendingCode } from '../../../api/telegramUserbotApi.js';
import { formatSeconds, useCountdown } from '../../../hooks/useCountdown.js';
import { apiError, deliveryText, readFloodUntil, RESEND_LABEL, saveFloodUntil } from './telegramLoginText.js';
import { ui } from './telegramUi.js';

interface Props {
  initialPending?: PendingCode | null; // Đang dở bước nhập mã (tải lại trang / máy chủ khởi động lại)
  onConnected: () => void;
}

const CHANNEL_ICON: Partial<Record<CodeChannel, LucideIcon>> = { APP: Smartphone, EMAIL: Mail, SMS: MessageSquare, CALL: Phone, MISSED_CALL: Phone };

/** Đăng nhập Telegram bằng mã OTP (Story 18.1–18.3): đúng kênh gửi, gửi lại theo kênh kế tiếp, khóa nút khi Telegram tạm khóa */
export const TelegramOtpLogin: React.FC<Props> = ({ initialPending, onConnected }) => {
  const [phone, setPhone] = useState('');
  const [pending, setPending] = useState<PendingCode | null>(initialPending ?? null);
  const [sentAt, setSentAt] = useState(() => Date.now());
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [needs2FA, setNeeds2FA] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [floodUntil, setFloodUntil] = useState<number | null>(readFloodUntil);

  const floodLeft = useCountdown(floodUntil);
  const resendLeft = useCountdown(pending?.delivery.timeoutSec ? sentAt + pending.delivery.timeoutSec * 1000 : null);

  const run = async (task: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (err) {
      const { message, code: errCode, retryAfterSec } = apiError(err, fallback);
      setError(message);
      if (retryAfterSec) {
        const until = Date.now() + retryAfterSec * 1000;
        setFloodUntil(until);
        saveFloodUntil(until);
      }
      if (errCode === 'TELEGRAM_CODE_EXPIRED' || errCode === 'TELEGRAM_AUTH_RESTART') setPending(null);
    } finally {
      setBusy(false);
    }
  };

  const showPending = (next: PendingCode) => {
    setPending(next);
    setSentAt(Date.now());
    setCode('');
  };

  const sendCode = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const res = await telegramUserbotApi.sendCode(phone.trim());
      if (res.status === 'SUCCESS') return onConnected();
      showPending({ phoneMasked: res.phoneMasked!, delivery: res.delivery!, expiresAt: res.expiresAt! });
    }, 'Không gửi được mã');
  };

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const res = await telegramUserbotApi.verifyCode({ code: code.trim(), password: password.trim() || undefined });
      if (res.requires2FA) {
        setNeeds2FA(true);
        setError(res.message ?? 'Nhập thêm mật khẩu 2FA.');
        return;
      }
      onConnected();
    }, 'Xác thực mã thất bại');
  };

  const resend = () => void run(async () => showPending(await telegramUserbotApi.resendCode()), 'Không gửi lại được mã');

  const restart = () =>
    void run(async () => {
      await telegramUserbotApi.cancelCode().catch(() => undefined);
      setPending(null);
      setNeeds2FA(false);
      setCode('');
    }, 'Không hủy được mã');

  const locked = floodLeft > 0;
  const errorBox = (error || locked) && (
    <p role="alert" className={ui.alert}>
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
      <span>
        {error}
        {locked && <strong className="block tabular-nums">Thử lại sau {formatSeconds(floodLeft)}</strong>}
      </span>
    </p>
  );

  if (!pending) {
    return (
      <form onSubmit={sendCode} className="space-y-3">
        {errorBox}
        <div className="space-y-1.5">
          <label htmlFor="tg-phone" className={ui.label}>Số điện thoại Telegram</label>
          <input id="tg-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0905 123 456" className={ui.input} />
        </div>
        <button type="submit" disabled={busy || locked || !phone.trim()} className={`${ui.primaryBtn} w-full sm:w-auto`}>
          {busy ? <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden /> : <Phone className="w-4 h-4" aria-hidden />} Gửi mã
        </button>
      </form>
    );
  }

  const { title, hint } = deliveryText(pending.delivery, pending.phoneMasked);
  const Icon = CHANNEL_ICON[pending.delivery.channel] ?? AlertCircle;
  const blocked = pending.delivery.channel === 'SETUP_EMAIL' || pending.delivery.channel === 'FIREBASE';
  const resendLabel = pending.delivery.nextChannel && RESEND_LABEL[pending.delivery.nextChannel];

  return (
    <form onSubmit={verify} className="space-y-3">
      <div className={`flex gap-3 p-3 rounded-xl border text-sm ${blocked ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-indigo-50 border-indigo-100 text-indigo-950'}`} aria-live="polite">
        <Icon className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
        <div className="space-y-1 min-w-0">
          <p className="font-semibold break-words">{title}</p>
          <p>{hint}</p>
          {pending.delivery.fragmentUrl && (
            <a href={pending.delivery.fragmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold underline underline-offset-2">
              Mở Fragment <ExternalLink className="w-3.5 h-3.5" aria-hidden />
            </a>
          )}
        </div>
      </div>
      {errorBox}

      {!blocked && (
        <>
          <div className="space-y-1.5">
            <label htmlFor="tg-otp" className={ui.label}>Mã xác thực</label>
            <input
              id="tg-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={pending.delivery.length ?? 8}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className={`${ui.input} font-mono tracking-[0.3em] text-center`}
            />
          </div>
          {needs2FA && (
            <div className="space-y-1.5">
              <label htmlFor="tg-otp-2fa" className={ui.label}>Mật khẩu xác thực 2 lớp (2FA)</label>
              <input id="tg-otp-2fa" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={ui.input} />
            </div>
          )}
          <button type="submit" disabled={busy || locked || !code.trim()} className={`${ui.primaryBtn} w-full sm:w-auto`}>
            {busy ? <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden /> : <KeyRound className="w-4 h-4" aria-hidden />} Xác nhận & kết nối
          </button>
        </>
      )}

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        {resendLabel && !blocked && (
          <button type="button" onClick={resend} disabled={busy || locked || resendLeft > 0} className={ui.secondaryBtn}>
            <RotateCcw className="w-4 h-4" aria-hidden />
            {resendLeft > 0 ? <span className="tabular-nums">{resendLabel} sau {formatSeconds(resendLeft)}</span> : resendLabel}
          </button>
        )}
        <button type="button" onClick={restart} disabled={busy} className={ui.secondaryBtn}>
          {blocked ? 'Bắt đầu lại' : 'Đổi số điện thoại'}
        </button>
      </div>
    </form>
  );
};
