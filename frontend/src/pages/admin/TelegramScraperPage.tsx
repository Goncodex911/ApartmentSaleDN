import React, { useEffect, useState, useRef } from 'react';
import {
  Send,
  Radio,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  LogOut,
  Phone,
  ShieldCheck,
  Play,
  Square,
  Loader2,
  Building2,
  ExternalLink,
  Search,
  KeyRound,
  History,
  QrCode,
  Smartphone,
  Zap,
} from 'lucide-react';
import { telegramUserbotApi, TelegramDialog, TelegramSessionStatus } from '../../api/telegramUserbotApi.js';
import { priceShort } from '../../utils/priceShort.js';

export const TelegramScraperPage: React.FC = () => {
  // Trạng thái kết nối phiên Telegram
  const [session, setSession] = useState<TelegramSessionStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Form đăng nhập SĐT & OTP
  const [authMode, setAuthMode] = useState<'1TAP' | 'OTP'>('1TAP');
  const [qrData, setQrData] = useState<{ tgUrl: string; expiresAt: number } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrRequires2FA, setQrRequires2FA] = useState(false);
  const [qrPassword, setQrPassword] = useState('');
  const pollIntervalRef = useRef<any>(null);

  const [phone, setPhone] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [otp, setOtp] = useState('');
  const [password2FA, setPassword2FA] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Danh sách nhóm & thiết lập cào tin
  const [dialogs, setDialogs] = useState<TelegramDialog[]>([]);
  const [loadingDialogs, setLoadingDialogs] = useState(false);
  const [searchDialog, setSearchDialog] = useState('');
  const [selectedChat, setSelectedChat] = useState('');
  const [customChat, setCustomChat] = useState('');
  const [targetSender, setTargetSender] = useState('');
  const [limit, setLimit] = useState(20);

  // Tiến trình cào bài đăng
  const [isScraping, setIsScraping] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [scrapedApartments, setScrapedApartments] = useState<any[]>([]);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Lắng nghe thời gian thực (Background Daemon)
  const [isListening, setIsListening] = useState(false);
  const [listenerInfo, setListenerInfo] = useState<{ chatTitle?: string; targetSender?: string; startedAt?: string } | null>(null);
  const [listenerLoading, setListenerLoading] = useState(false);

  // Cuộn log tự động xuống đáy
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Tải trạng thái ban đầu
  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const data = await telegramUserbotApi.getStatus();
      setSession(data);
      if (data.isConnected) {
        void fetchDialogs();
        void fetchListenerStatus();
      }
    } catch {
      setSession({ success: false, isConnected: false });
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchDialogs = async () => {
    setLoadingDialogs(true);
    try {
      const list = await telegramUserbotApi.getDialogs();
      setDialogs(list);
      if (list.length > 0 && !selectedChat) {
        setSelectedChat(list[0].id);
      }
    } catch (err: any) {
      console.error('Lỗi lấy danh sách nhóm Telegram:', err.message);
    } finally {
      setLoadingDialogs(false);
    }
  };

  const fetchListenerStatus = async () => {
    try {
      const data = await telegramUserbotApi.getListenerStatus();
      setIsListening(Boolean(data.isListening));
      if (data.isListening) {
        setListenerInfo({
          chatTitle: data.chatTitle,
          targetSender: data.targetSender,
          startedAt: data.startedAt,
        });
      } else {
        setListenerInfo(null);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  // Bắt đầu luồng xác thực 1-Chạm (Deep-link & QR)
  const startQrFlow = async () => {
    setQrLoading(true);
    setAuthError(null);
    setQrRequires2FA(false);
    try {
      const res = await telegramUserbotApi.startQrAuth();
      setQrData(res);
      startPollingQr();
    } catch (err: any) {
      setAuthError(err.response?.data?.message || err.message || 'Lỗi khởi tạo liên kết 1-chạm');
    } finally {
      setQrLoading(false);
    }
  };

  const startPollingQr = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await telegramUserbotApi.checkQrAuth(qrPassword || undefined);
        if (res.status === 'SUCCESS') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setQrData(null);
          void loadStatus();
        } else if (res.status === 'REQUIRES_2FA') {
          setQrRequires2FA(true);
        } else if (res.status === 'EXPIRED') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setQrData(null);
        }
      } catch {
        // tiếp tục polling
      }
    }, 2500);
  };

  useEffect(() => {
    if (authMode === '1TAP' && !session?.isConnected && !qrData && !qrLoading) {
      void startQrFlow();
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [authMode, session?.isConnected]);

  // 1. Gửi mã OTP xác thực
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await telegramUserbotApi.sendCode(phone.trim());
      setPhoneCodeHash(res.phoneCodeHash);
      setCodeSent(true);
    } catch (err: any) {
      setAuthError(err.response?.data?.message || err.message || 'Lỗi gửi mã OTP');
    } finally {
      setAuthLoading(false);
    }
  };

  // 2. Xác thực mã OTP (+ 2FA nếu có)
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await telegramUserbotApi.verifyCode({
        phone: phone.trim(),
        phoneCodeHash,
        code: otp.trim(),
        password: password2FA.trim() || undefined,
      });

      if (res.requires2FA) {
        setRequires2FA(true);
        setAuthError('Tài khoản yêu cầu mật khẩu xác thực 2 bước (2FA). Vui lòng nhập mật khẩu bên dưới.');
        return;
      }

      // Đăng nhập thành công
      setCodeSent(false);
      setRequires2FA(false);
      setOtp('');
      setPassword2FA('');
      void loadStatus();
    } catch (err: any) {
      setAuthError(err.response?.data?.message || err.message || 'Xác thực OTP thất bại');
    } finally {
      setAuthLoading(false);
    }
  };

  // 3. Hủy kết nối Telegram
  const handleDisconnect = async () => {
    if (!window.confirm('Bạn có chắc muốn hủy kết nối tài khoản Telegram khỏi hệ thống?')) return;
    setAuthLoading(true);
    try {
      await telegramUserbotApi.disconnect();
      setSession({ success: false, isConnected: false });
      setDialogs([]);
      setIsListening(false);
      setListenerInfo(null);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Lỗi hủy kết nối');
    } finally {
      setAuthLoading(false);
    }
  };

  // 4. Kích hoạt cào bài đăng
  const handleStartScrape = async () => {
    const chatInput = customChat.trim() || selectedChat;
    if (!chatInput) {
      alert('Vui lòng chọn một nhóm hoặc dán link nhóm Telegram');
      return;
    }
    if (!targetSender.trim()) {
      alert('Vui lòng nhập Tên hoặc Username của người đăng mục tiêu (Ví dụ: Trần Minh Hiếu)');
      return;
    }

    setIsScraping(true);
    setProgressPercent(10);
    setLogs([`🚀 Bắt đầu quét tin từ người đăng "${targetSender}" trong nhóm...`]);
    setScrapedApartments([]);
    setScrapeError(null);

    try {
      const res = await telegramUserbotApi.scrape({
        chat: chatInput,
        targetSender: targetSender.trim(),
        limit: Number(limit) || 20,
      });

      setProgressPercent(100);
      setLogs((prev) => [
        ...prev,
        `✅ Hoàn thành! Đã nạp thành công ${res.total || 0} căn hộ vào hệ thống.`,
      ]);
      setScrapedApartments(res.apartments || []);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi cào tin';
      setScrapeError(msg);
      setLogs((prev) => [...prev, `❌ LỖI: ${msg}`]);
    } finally {
      setIsScraping(false);
    }
  };

  // 5. Bật / Tắt Lắng nghe thời gian thực
  const handleToggleListener = async () => {
    setListenerLoading(true);
    try {
      if (isListening) {
        await telegramUserbotApi.stopListener();
        setIsListening(false);
        setListenerInfo(null);
      } else {
        const chatInput = customChat.trim() || selectedChat;
        if (!chatInput) {
          alert('Vui lòng chọn một nhóm để lắng nghe');
          return;
        }
        if (!targetSender.trim()) {
          alert('Vui lòng nhập Tên hoặc Username người đăng mục tiêu cần lắng nghe');
          return;
        }

        const res = await telegramUserbotApi.startListener({
          chat: chatInput,
          targetSender: targetSender.trim(),
        });
        setIsListening(true);
        setListenerInfo({
          chatTitle: res.chatTitle,
          targetSender: res.targetSender,
          startedAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Lỗi điều khiển bộ lắng nghe');
    } finally {
      setListenerLoading(false);
    }
  };

  const filteredDialogs = dialogs.filter((d) =>
    d.title.toLowerCase().includes(searchDialog.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="w-6 h-6 text-sky-500" />
            Cào Tin Telegram Tự Động
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quét toàn bộ bài đăng cũ và đón tin mới của tài khoản mục tiêu (ví dụ: Trần Minh Hiếu) trong các nhóm BĐS Đà Nẵng (0 VND).
          </p>
        </div>
        <button
          onClick={loadStatus}
          disabled={loadingStatus}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* THẺ 1: KẾT NỐI TÀI KHOẢN TELEGRAM CÁ NHÂN (SELF-SERVICE) */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              1. Tài Khoản Telegram Của Bạn (Tự Phục Vụ)
            </h2>
          </div>
          {session?.isConnected && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="w-3.5 h-3.5" />
              Đã kết nối
            </span>
          )}
        </div>

        {loadingStatus ? (
          <div className="py-8 flex items-center justify-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang kiểm tra phiên Telegram...
          </div>
        ) : session?.isConnected ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/50">
            <div className="space-y-1">
              <div className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <span>
                  {session.user?.firstName} {session.user?.lastName}
                </span>
                {session.user?.username && (
                  <span className="text-xs text-sky-600 dark:text-sky-400">@{session.user.username}</span>
                )}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                <span>SĐT: <strong className="text-slate-700 dark:text-slate-300">{session.user?.phone}</strong></span>
                <span>• Quyền: Đọc nhóm kín & công khai</span>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={authLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/50 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition self-start sm:self-auto"
            >
              <LogOut className="w-3.5 h-3.5" />
              Hủy kết nối / Đăng xuất
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kết nối số Telegram của bạn một lần để hệ thống đọc được các nhóm BĐS kín mà bạn đang là thành viên (mã phiên lưu mã hóa an toàn trên máy chủ).
            </p>

            {authError && (
              <div className="p-3 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {/* Chuyển đổi phương thức: 1-Chạm vs Nhập SĐT/OTP */}
            <div className="flex border-b border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setAuthMode('1TAP')}
                className={`flex items-center gap-2 py-2 px-4 text-xs font-semibold border-b-2 transition ${
                  authMode === '1TAP'
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <Zap className="w-4 h-4 text-amber-500" />
                Xác nhận 1-Chạm / Quét QR (Khuyên dùng)
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('OTP')}
                className={`flex items-center gap-2 py-2 px-4 text-xs font-semibold border-b-2 transition ${
                  authMode === 'OTP'
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <Phone className="w-4 h-4" />
                Nhập Số Điện Thoại & OTP
              </button>
            </div>

            {authMode === '1TAP' ? (
              <div className="space-y-4 py-2">
                {qrLoading ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
                    <span>Đang kết nối cổng xác thực Telegram...</span>
                  </div>
                ) : qrData ? (
                  <div className="flex flex-col items-center text-center space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        Đang chờ bạn xác nhận trên Telegram...
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                        Không cần chờ OTP hay SMS! Bạn chỉ cần bấm nút bên dưới:
                      </p>
                    </div>

                    {/* Nút bấm 1-chạm cho điện thoại */}
                    <a
                      href={qrData.tgUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 rounded-xl hover:from-sky-500 hover:to-indigo-500 shadow-lg shadow-sky-500/25 transition"
                    >
                      <Smartphone className="w-5 h-5" />
                      📲 Mở App Telegram Xác Nhận 1-Chạm (Dành Cho Điện Thoại)
                    </a>

                    <div className="w-full border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col items-center gap-2">
                      <p className="text-xs text-slate-400">
                        Hoặc nếu đang dùng máy tính: Mở Telegram trên điện thoại $\rightarrow$ <strong>Cài đặt → Thiết bị → Quét mã QR</strong>
                      </p>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData.tgUrl)}`}
                        alt="Telegram Login QR"
                        className="w-44 h-44 rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-white shadow-sm"
                      />
                    </div>

                    {qrRequires2FA && (
                      <div className="w-full max-w-sm space-y-2 pt-2 text-left">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Mật khẩu 2FA (Tài khoản của bạn có bật bảo mật 2 lớp)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value={qrPassword}
                            onChange={(e) => setQrPassword(e.target.value)}
                            placeholder="Nhập mật khẩu 2FA..."
                            className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => void telegramUserbotApi.checkQrAuth(qrPassword)}
                            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500"
                          >
                            Xác nhận
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={startQrFlow}
                      className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 pt-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Tải lại mã liên kết mới
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <button
                      type="button"
                      onClick={startQrFlow}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 rounded-xl hover:bg-sky-500 transition"
                    >
                      <Zap className="w-4 h-4" />
                      Bấm để tạo liên kết xác nhận 1-chạm
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* OTP Form */
              <div>
                {!codeSent ? (
                  <form onSubmit={handleSendCode} className="flex flex-col sm:flex-row gap-3 pt-2">
                    <div className="relative flex-1">
                      <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Nhập số điện thoại Telegram (Ví dụ: 0905123456 hoặc +84905123456)"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={authLoading || !phone.trim()}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-500 disabled:opacity-50 transition"
                    >
                      {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Gửi mã OTP về Telegram
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyCode} className="space-y-3 pt-2">
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300">
                      Telegram vừa gửi mã xác thực 5 số vào <strong>ứng dụng Telegram</strong> trên điện thoại của bạn ({phone}).
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          placeholder="Nhập mã 5 chữ số từ Telegram..."
                          maxLength={8}
                          className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-slate-900 dark:text-white"
                        />
                      </div>

                      {requires2FA && (
                        <div className="relative flex-1">
                          <input
                            type="password"
                            value={password2FA}
                            onChange={(e) => setPassword2FA(e.target.value)}
                            placeholder="Mật khẩu 2FA (nếu có cài)..."
                            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
                          />
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={authLoading || !otp.trim()}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition"
                      >
                        {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Xác nhận & Kết nối
                      </button>

                      <button
                        type="button"
                        onClick={() => { setCodeSent(false); setRequires2FA(false); }}
                        className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        Đổi SĐT
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* THẺ 2: CẤU HÌNH CÀO BÀI ĐĂNG THEO TÀI KHOẢN MỤC TIÊU */}
      <div className={`bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm transition ${!session?.isConnected ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-sky-500" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            2. Cấu Hình Quét Lịch Sử & Lọc Người Đăng Mục Tiêu
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nhóm Telegram */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nhóm Telegram cần quét
              </label>
              {loadingDialogs && <span className="text-xs text-slate-400">Đang tải nhóm...</span>}
            </div>

            {dialogs.length > 0 && (
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchDialog}
                    onChange={(e) => setSearchDialog(e.target.value)}
                    placeholder="Tìm trong danh sách nhóm đã tham gia..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none"
                  />
                </div>
                <select
                  value={selectedChat}
                  onChange={(e) => { setSelectedChat(e.target.value); setCustomChat(''); }}
                  className="w-full p-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="">-- Hoặc chọn nhóm từ danh sách dưới đây --</option>
                  {filteredDialogs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} {d.isChannel ? '(Kênh)' : '(Nhóm)'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-1">
              <input
                type="text"
                value={customChat}
                onChange={(e) => { setCustomChat(e.target.value); }}
                placeholder="Hoặc dán link nhóm/kênh: t.me/... hoặc @ten_nhom"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-white"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Hỗ trợ cả link công khai (`t.me/bdsdanang`) lẫn link mời nhóm kín (`t.me/+AbCdEf...`).
              </span>
            </div>
          </div>

          {/* Người đăng mục tiêu & Giới hạn */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Tài khoản người đăng mục tiêu <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={targetSender}
                onChange={(e) => setTargetSender(e.target.value)}
                placeholder="Ví dụ: Trần Minh Hiếu hoặc @minhhieu_bds"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium text-slate-900 dark:text-white"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Hệ thống chỉ lấy bài của người này và tự động bỏ qua mọi thành viên khác trong nhóm (0đ quota).
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Số lượng bài cần lấy
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 30, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setLimit(num)}
                    className={`py-1.5 text-xs font-medium rounded-lg border transition ${limit === num ? 'bg-sky-600 text-white border-sky-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    {num} bài
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Nút thao tác chính */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleListener}
              disabled={listenerLoading}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition ${isListening ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-100'}`}
            >
              {listenerLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isListening ? (
                <Square className="w-3.5 h-3.5" />
              ) : (
                <Radio className="w-3.5 h-3.5 text-sky-500" />
              )}
              {isListening ? 'Dừng đón tin thời gian thực' : 'Bật đón tin thời gian thực'}
            </button>
            {isListening && listenerInfo && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                ● Đang lắng nghe: {listenerInfo.targetSender} trong {listenerInfo.chatTitle}
              </span>
            )}
          </div>

          <button
            onClick={handleStartScrape}
            disabled={isScraping || (!customChat && !selectedChat) || !targetSender.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-sky-600 to-indigo-600 rounded-xl hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 shadow-md shadow-sky-500/20 transition"
          >
            {isScraping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang quét & nạp căn hộ...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                Bắt đầu quét & Nạp vào Bảng hàng
              </>
            )}
          </button>
        </div>
      </div>

      {/* THẺ 3: TIẾN TRÌNH THỜI GIAN THỰC & NHẬT KÝ */}
      {(isScraping || logs.length > 0) && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
              Tiến Trình Cào Tin & Bóc Tách AI
            </h3>
            <span className="text-xs font-mono font-medium text-sky-600 dark:text-sky-400">
              {progressPercent}%
            </span>
          </div>

          {/* Thanh Progress */}
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Hộp Console Log */}
          <div className="p-3 bg-slate-950 rounded-lg text-slate-300 font-mono text-xs max-h-48 overflow-y-auto space-y-1 border border-slate-800">
            {logs.map((log, i) => (
              <div key={i} className="leading-relaxed">
                <span className="text-slate-500">[{new Date().toLocaleTimeString('vi-VN')}]</span> {log}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>

          {scrapeError && (
            <div className="p-3 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
              {scrapeError}
            </div>
          )}
        </div>
      )}

      {/* THẺ 4: DANH SÁCH CĂN HỘ VỪA NẠP THÀNH CÔNG */}
      {scrapedApartments.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-500" />
              Kết Quả Nạp Bảng Hàng ({scrapedApartments.length} căn hộ)
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Đã tự động lưu vào kho hàng
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scrapedApartments.map((apt) => (
              <div
                key={apt._id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-sky-500/50 transition bg-slate-50/50 dark:bg-slate-900/50 space-y-2"
              >
                {apt.images && apt.images.length > 0 ? (
                  <img
                    src={apt.images[0]}
                    alt={apt.title}
                    className="w-full h-36 object-cover rounded-md"
                  />
                ) : (
                  <div className="w-full h-36 bg-slate-200 dark:bg-slate-800 rounded-md flex items-center justify-center text-xs text-slate-400">
                    Không có ảnh
                  </div>
                )}
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1" title={apt.title}>
                    {apt.title}
                  </h4>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {priceShort(apt.price)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {apt.location?.district || 'Đà Nẵng'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 line-clamp-1">
                    {apt.location?.address}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] px-2 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                    {apt.images?.length || 0} ảnh gốc
                  </span>
                  <a
                    href={`/apartments`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    Xem trên Bảng hàng
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
