import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle, Info } from 'lucide-react';
import { useApp } from '../../components/layout/AppShell.js';
import { telegramUserbotApi, TelegramDialog, TelegramSessionStatus } from '../../api/telegramUserbotApi.js';
import { useScrapeTask } from '../../hooks/useScrapeTask.js';
import { TelegramConnectCard } from '../../components/admin/telegram/TelegramConnectCard.js';
import { ScrapeSetupCard, ScrapeTarget } from '../../components/admin/telegram/ScrapeSetupCard.js';
import { ScrapeProgressCard } from '../../components/admin/telegram/ScrapeProgressCard.js';
import { ui } from '../../components/admin/telegram/telegramUi.js';

type ListenerState = { isListening: boolean; chatTitle?: string; targetSender?: string };

const errorMessage = (err: any, fallback: string) => err?.response?.data?.message || err?.message || fallback;

/**
 * Cào tin Telegram (Story CE-01, CE-02): kết nối tài khoản → chọn nhóm + người đăng → quét lịch sử / đón tin mới.
 * Admin mở trong khu Quản trị (/admin/telegram-scraper), Quản lý mở ở /telegram-scraper; CTV không được vào.
 */
export const TelegramScraperPage: React.FC = () => {
  const { user } = useApp();
  if (user && user.role === 'COLLABORATOR') return <Navigate to="/apartments" replace />;
  return <TelegramScraperContent isManager={user?.role === 'MANAGER'} />;
};

const TelegramScraperContent: React.FC<{ isManager: boolean }> = ({ isManager }) => {
  const [session, setSession] = useState<TelegramSessionStatus | null>(null);
  const [dialogs, setDialogs] = useState<TelegramDialog[]>([]);
  const [loadingDialogs, setLoadingDialogs] = useState(false);
  const [listener, setListener] = useState<ListenerState>({ isListening: false });
  const [listenerBusy, setListenerBusy] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  // Telegram đã hủy phiên (máy chủ đã tự xóa phiên hỏng) → hiện lại màn hình kết nối thay vì "Đã kết nối" sai
  const markDisconnected = useCallback(() => {
    setSession({ success: true, isConnected: false });
    setDialogs([]);
    setListener({ isListening: false });
  }, []);
  const scrape = useScrapeTask(markDisconnected);

  const loadDialogs = useCallback(async () => {
    setLoadingDialogs(true);
    try {
      setDialogs(await telegramUserbotApi.getDialogs());
    } catch (err: any) {
      setPageError(errorMessage(err, 'Không tải được danh sách nhóm Telegram'));
      if (err?.response?.data?.code === 'TELEGRAM_SESSION_DEAD') markDisconnected();
    } finally {
      setLoadingDialogs(false);
    }
  }, [markDisconnected]);

  const loadStatus = useCallback(async () => {
    try {
      const status = await telegramUserbotApi.getStatus();
      setSession(status);
      if (!status.isConnected) return;
      void loadDialogs();
      telegramUserbotApi.getListenerStatus().then(setListener).catch(() => undefined);
    } catch (err) {
      setSession({ success: false, isConnected: false });
      setPageError(errorMessage(err, 'Không kiểm tra được phiên Telegram'));
    }
  }, [loadDialogs]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const toggleListener = async (target: ScrapeTarget) => {
    setListenerBusy(true);
    setPageError(null);
    try {
      if (listener.isListening) {
        await telegramUserbotApi.stopListener();
        setListener({ isListening: false });
      } else {
        const res = await telegramUserbotApi.startListener({ chat: target.chat, targetSender: target.targetSender });
        setListener({ isListening: true, chatTitle: res.chatTitle, targetSender: res.targetSender });
      }
    } catch (err: any) {
      setPageError(errorMessage(err, 'Không điều khiển được bộ đón tin'));
      if (err?.response?.data?.code === 'TELEGRAM_SESSION_DEAD') markDisconnected();
    } finally {
      setListenerBusy(false);
    }
  };

  const connected = Boolean(session?.isConnected);

  return (
    <main className="max-w-3xl mx-auto px-4 pt-4 pb-app space-y-3">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Cào tin Telegram</h1>
        <p className="text-sm text-slate-600">Quét bài cũ và tự đón bài mới của một người đăng (theo SĐT hoặc tên) trong nhóm BĐS, AI bóc tách rồi nạp vào Bảng hàng.</p>
        {isManager && (
          <p className="flex items-start gap-2 p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-sm text-indigo-900">
            <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
            <span>
              Kết nối bằng <strong>tài khoản Telegram cá nhân của bạn</strong>, hệ thống chỉ đọc các nhóm bạn đang tham gia. Căn quét được sẽ vào <strong>Bảng hàng chung</strong>, và
              thao tác quét được ghi vào nhật ký để Admin theo dõi.
            </span>
          </p>
        )}
      </header>

      {pageError && <p role="alert" className={ui.alert}><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />{pageError}</p>}

      <TelegramConnectCard
        session={session}
        onConnected={() => {
          setPageError(null);
          void loadStatus();
        }}
        onDisconnected={() => {
          setSession({ success: true, isConnected: false });
          setDialogs([]);
          setListener({ isListening: false });
        }}
      />

      {connected && (
        <ScrapeSetupCard
          dialogs={dialogs}
          loadingDialogs={loadingDialogs}
          onReloadDialogs={() => void loadDialogs()}
          isRunning={scrape.isRunning}
          starting={scrape.starting}
          onStart={(target) => void scrape.start(target)}
          listener={listener}
          listenerBusy={listenerBusy}
          onToggleListener={(target) => void toggleListener(target)}
        />
      )}

      {scrape.task ? (
        <ScrapeProgressCard task={scrape.task} error={scrape.error} onCancel={() => void scrape.cancel()} />
      ) : (
        scrape.error && <p role="alert" className={ui.alert}><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />{scrape.error}</p>
      )}
    </main>
  );
};
