import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, QrCode, RefreshCw } from 'lucide-react';
import { telegramUserbotApi, QrCheck } from '../../../api/telegramUserbotApi.js';
import { formatSeconds, useCountdown } from '../../../hooks/useCountdown.js';
import { apiError } from './telegramLoginText.js';
import { ui } from './telegramUi.js';

const POLL_MS = 2500;
const QR_WINDOW_MS = 2 * 60 * 1000; // Máy chủ dừng làm mới QR sau 2 phút (Story 18.4 AC5)

/**
 * Story 18.4: đăng nhập bằng QR trên máy tính — quét bằng Telegram trên điện thoại (Cài đặt → Thiết bị → Liên kết thiết bị máy tính).
 * QR vẽ ngay trên trình duyệt (thư viện qrcode), không gửi token đăng nhập ra dịch vụ ngoài. Token mới từ máy chủ → vẽ lại tại chỗ.
 */
export const TelegramQrLogin: React.FC<{ onConnected: () => void; isTouch: boolean }> = ({ onConnected, isTouch }) => {
  const [state, setState] = useState<QrCheck | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const passwordRef = useRef('');
  const activeRef = useRef(true);
  const left = useCountdown(deadline);

  const stop = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const handle = (next: QrCheck) => {
    if (!activeRef.current) return; // Đã rời tab trong lúc request đang chạy → không hỏi tiếp
    setState(next);
    if (next.status === 'SUCCESS') return onConnected();
    if (next.status === 'WAITING') timerRef.current = setTimeout(() => void poll(), POLL_MS);
  };

  const poll = async () => {
    try {
      handle(await telegramUserbotApi.checkQrAuth(passwordRef.current || undefined));
    } catch (err) {
      setError(apiError(err, 'Không kiểm tra được trạng thái quét').message);
    }
  };

  const start = async () => {
    stop();
    setBusy(true);
    setError(null);
    setImage(null);
    try {
      const first = await telegramUserbotApi.startQrAuth();
      setDeadline(Date.now() + QR_WINDOW_MS);
      handle(first);
    } catch (err) {
      setError(apiError(err, 'Không tạo được mã QR').message);
    } finally {
      setBusy(false);
    }
  };

  // Tự tạo mã khi mở tab; rời tab / rời trang → ngừng hỏi máy chủ
  useEffect(() => {
    activeRef.current = true;
    void start();
    return () => {
      activeRef.current = false;
      stop();
    };
  }, []);

  // Vẽ QR mỗi khi máy chủ cấp token mới
  useEffect(() => {
    if (!state?.tgUrl) return;
    const url = state.tgUrl;
    // Thư viện QR chỉ tải khi mở tab này → không làm nặng bundle chính
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(url, { margin: 2, width: 240, errorCorrectionLevel: 'M' }))
      .then(setImage)
      .catch(() => setError('Không vẽ được mã QR'));
  }, [state?.tgUrl]);

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    passwordRef.current = password;
    stop();
    void poll();
  };

  const expired = state?.status === 'EXPIRED';

  return (
    <div className="space-y-3">
      {isTouch && (
        <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
          Mã QR cần quét bằng <strong>một điện thoại khác</strong>. Trên điện thoại này, hãy dùng tab "Mã OTP".
        </p>
      )}
      {error && <p role="alert" className={ui.alert}><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />{error}</p>}

      {state?.status === 'REQUIRES_2FA' ? (
        <form onSubmit={submitPassword} className="space-y-3">
          <p className="text-sm text-slate-700">{state.message ?? 'Tài khoản bật xác thực 2 lớp, nhập mật khẩu 2FA.'}</p>
          <label htmlFor="tg-qr-2fa" className={ui.label}>Mật khẩu xác thực 2 lớp (2FA)</label>
          <input id="tg-qr-2fa" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={ui.input} />
          <button type="submit" disabled={!password} className={`${ui.primaryBtn} w-full sm:w-auto`}>Xác nhận mật khẩu</button>
        </form>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-[240px] h-[240px] shrink-0 rounded-2xl bg-white border border-slate-200 grid place-items-center overflow-hidden">
            {image && !expired ? (
              <img src={image} alt="Mã QR đăng nhập Telegram" width={240} height={240} className="w-full h-full transition-opacity duration-200 motion-reduce:transition-none" />
            ) : expired ? (
              <QrCode className="w-16 h-16 text-slate-300" aria-hidden />
            ) : (
              <Loader2 className="w-8 h-8 text-indigo-600 motion-safe:animate-spin" aria-label="Đang tạo mã QR" />
            )}
          </div>
          <ol className="space-y-2 text-sm text-slate-700 list-decimal pl-5">
            <li>Mở <strong>Telegram trên điện thoại</strong>.</li>
            <li>Vào <strong>Cài đặt → Thiết bị → Liên kết thiết bị máy tính</strong>.</li>
            <li>Quét mã bên cạnh. Mã tự làm mới, không cần tải lại trang.</li>
            {!expired && left > 0 && <li className="list-none -ml-5 text-xs text-slate-500 tabular-nums" aria-live="off">Mã còn hiệu lực {formatSeconds(left)}</li>}
          </ol>
        </div>
      )}

      {expired && <p className="text-sm text-slate-700">{state?.message}</p>}
      {(expired || error) && (
        <button type="button" onClick={() => void start()} disabled={busy} className={`${ui.secondaryBtn} w-full sm:w-auto`}>
          <RefreshCw className={`w-4 h-4 ${busy ? 'motion-safe:animate-spin' : ''}`} aria-hidden /> Tạo mã mới
        </button>
      )}
    </div>
  );
};
