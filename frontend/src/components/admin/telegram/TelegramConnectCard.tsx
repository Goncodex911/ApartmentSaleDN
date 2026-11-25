import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, LogOut, ShieldCheck } from 'lucide-react';
import { telegramUserbotApi, TelegramSessionStatus } from '../../../api/telegramUserbotApi.js';
import { Skeleton } from '../../ui/Skeleton.js';
import { TelegramOtpLogin } from './TelegramOtpLogin.js';
import { TelegramQrLogin } from './TelegramQrLogin.js';
import { ui } from './telegramUi.js';

interface Props {
  session: TelegramSessionStatus | null;
  onConnected: () => void;
  onDisconnected: () => void;
}

// Điện thoại (màn cảm ứng) mặc định Mã OTP; máy tính mặc định quét QR bằng điện thoại (Story 18.4)
const isTouchDevice = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
const timeText = (value?: string | null) => (value ? new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : null);

export const TelegramConnectCard: React.FC<Props> = ({ session, onConnected, onDisconnected }) => {
  const isTouch = isTouchDevice();
  // Đang dở bước nhập mã (tải lại trang / máy chủ khởi động lại) → mở thẳng tab OTP
  const [mode, setMode] = useState<'QR' | 'OTP'>(isTouch || session?.pendingLogin ? 'OTP' : 'QR');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disconnect = async () => {
    if (!window.confirm('Hủy kết nối tài khoản Telegram? Bộ đón tin mới cũng sẽ dừng.')) return;
    setBusy(true);
    try {
      await telegramUserbotApi.disconnect();
      onDisconnected();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không hủy được kết nối');
    } finally {
      setBusy(false);
    }
  };

  const connectedAt = timeText(session?.user?.connectedAt);
  const checkedAt = timeText(session?.lastCheckedAt);

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

      {(error || session?.message) && (
        <p role="alert" className={ui.alert}><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />{error || session?.message}</p>
      )}

      {!session ? (
        <Skeleton className="h-16 rounded-xl" />
      ) : session.isConnected ? (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 truncate">
                {[session.user?.firstName, session.user?.lastName].filter(Boolean).join(' ') || 'Tài khoản Telegram'}
                {session.user?.username && <span className="ml-1.5 text-sm font-medium text-indigo-700">@{session.user.username}</span>}
              </p>
              <p className={ui.hint}>
                SĐT <span className="font-semibold text-slate-800 tabular-nums">{session.user?.phone}</span>
                {connectedAt && <> · Kết nối lúc <span className="tabular-nums">{connectedAt}</span></>}
                {checkedAt && <> · Kiểm tra lần cuối <span className="tabular-nums">{checkedAt}</span></>}
              </p>
            </div>
            <button type="button" onClick={disconnect} disabled={busy} className={ui.dangerBtn}>
              <LogOut className="w-4 h-4" aria-hidden /> Hủy kết nối
            </button>
          </div>
          <p className={ui.hint}>
            Đừng bấm "Chấm dứt các phiên khác" trong Telegram (sẽ ngắt thiết bị "ApartmentSaleDN Web"). Phiên mới có thể bị Telegram giới hạn trong 24 giờ đầu.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Kết nối một lần để hệ thống đọc các nhóm BĐS bạn đang tham gia. Phiên đăng nhập được mã hóa trên máy chủ.</p>
          <div role="tablist" aria-label="Cách kết nối" className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100">
            <button type="button" role="tab" aria-selected={mode === 'QR'} onClick={() => setMode('QR')} className={ui.segment(mode === 'QR')}>Quét QR</button>
            <button type="button" role="tab" aria-selected={mode === 'OTP'} onClick={() => setMode('OTP')} className={ui.segment(mode === 'OTP')}>Mã OTP</button>
          </div>
          {mode === 'QR' ? (
            <TelegramQrLogin isTouch={isTouch} onConnected={onConnected} />
          ) : (
            <TelegramOtpLogin initialPending={session.pendingLogin} onConnected={onConnected} />
          )}
        </div>
      )}
    </section>
  );
};
