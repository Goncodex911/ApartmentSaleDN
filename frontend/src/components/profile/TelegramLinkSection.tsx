import React, { useState } from 'react';
import { userApi } from '../../api/userApi.js';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';

// Liên kết Telegram nhận thông báo khách mới / căn phù hợp (Story 6.2 - AC5)
export const TelegramLinkSection: React.FC<{ linked: boolean }> = ({ linked }) => {
  const [isLinked, setIsLinked] = useState(linked);
  const [deepLink, setDeepLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateLink = async () => {
    setLoading(true);
    setError('');
    try {
      const { deepLink: link } = await userApi.createTelegramLink();
      setDeepLink(link);
      window.open(link, '_blank', 'noopener');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không tạo được mã liên kết');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    setLoading(true);
    try {
      await userApi.unlinkTelegram();
      setIsLinked(false);
    } catch {
      setError('Không hủy được liên kết, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1.5 p-3 rounded-xl border border-sky-100 bg-sky-50/50 text-xs">
      <p className="font-semibold text-slate-700 flex items-center gap-1">
        <Send className="w-3.5 h-3.5 text-sky-600" /> Nhận thông báo qua Telegram
      </p>
      {isLinked ? (
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-emerald-700 font-medium">
            <CheckCircle2 className="w-4 h-4" /> Đã liên kết
          </span>
          <button type="button" onClick={handleUnlink} disabled={loading} className="text-rose-600 hover:underline">
            Hủy liên kết
          </button>
        </div>
      ) : (
        <>
          <p className="text-slate-500">Báo ngay khi có khách nhắn tin hoặc căn mới hợp với khách của bạn.</p>
          <button
            type="button"
            onClick={handleCreateLink}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white font-semibold disabled:opacity-50"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Liên kết Telegram
          </button>
          {deepLink && (
            <p className="text-slate-500">
              Bấm <b>Start</b> trong Telegram để hoàn tất (mã hết hạn sau 10 phút). Chưa mở được?{' '}
              <a href={deepLink} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline break-all">
                {deepLink}
              </a>
            </p>
          )}
        </>
      )}
      {error && <p className="text-rose-600">{error}</p>}
    </div>
  );
};
