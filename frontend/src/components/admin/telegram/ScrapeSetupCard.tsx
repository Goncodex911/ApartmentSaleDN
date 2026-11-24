import React, { useMemo, useState } from 'react';
import { History, Info, Loader2, Play, Radio, RefreshCw, Search, Square } from 'lucide-react';
import { TelegramDialog } from '../../../api/telegramUserbotApi.js';
import { ui } from './telegramUi.js';

export interface ScrapeTarget {
  chat: string;
  targetSender: string;
  limit: number;
}

interface ListenerInfo {
  isListening: boolean;
  chatTitle?: string;
  targetSender?: string;
}

interface Props {
  dialogs: TelegramDialog[];
  loadingDialogs: boolean;
  onReloadDialogs: () => void;
  isRunning: boolean;
  starting: boolean;
  onStart: (target: ScrapeTarget) => void;
  listener: ListenerInfo;
  listenerBusy: boolean;
  onToggleListener: (target: ScrapeTarget) => void;
}

const LIMITS = [10, 20, 30, 50];
const RECENT_KEY = 'tg-scraper-recent-targets';

// Ghi nhớ SĐT / tên đã quét gần đây trên máy này (tiện chạm lại, không lưu lên máy chủ)
const readRecent = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string').slice(0, 4) : [];
  } catch {
    return [];
  }
};
const saveRecent = (value: string) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([value, ...readRecent().filter((v) => v !== value)].slice(0, 4)));
  } catch {
    /* Trình duyệt chặn bộ nhớ → bỏ qua */
  }
};

export const ScrapeSetupCard: React.FC<Props> = (props) => {
  const { dialogs, loadingDialogs, isRunning, starting, listener, listenerBusy } = props;
  const [source, setSource] = useState<'LIST' | 'LINK'>('LIST');
  const [query, setQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState('');
  const [link, setLink] = useState('');
  const [targetSender, setTargetSender] = useState('');
  const [limit, setLimit] = useState(20);
  const [recent, setRecent] = useState(readRecent);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? dialogs.filter((d) => d.title.toLowerCase().includes(q)) : dialogs;
  }, [dialogs, query]);

  const chat = source === 'LINK' ? link.trim() : selectedChat || filtered[0]?.id || '';
  const ready = Boolean(chat && targetSender.trim());

  const submit = (action: (t: ScrapeTarget) => void) => {
    if (!ready) return;
    const target = targetSender.trim();
    saveRecent(target);
    setRecent(readRecent());
    action({ chat, targetSender: target, limit });
  };

  return (
    <section className={ui.card} aria-labelledby="tg-setup-title">
      <h2 id="tg-setup-title" className={ui.cardTitle}>
        <History className="w-5 h-5 text-indigo-600" aria-hidden /> Quét bài theo người đăng
      </h2>

      {/* 1. Nhóm nguồn */}
      <fieldset className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <legend className={ui.label}>Nhóm Telegram</legend>
          {source === 'LIST' && (
            <button type="button" onClick={props.onReloadDialogs} disabled={loadingDialogs} className="inline-flex items-center gap-1 min-h-11 px-2 text-sm font-medium text-indigo-700 cursor-pointer disabled:opacity-50" aria-label="Tải lại danh sách nhóm">
              <RefreshCw className={`w-4 h-4 ${loadingDialogs ? 'motion-safe:animate-spin' : ''}`} aria-hidden /> Tải lại
            </button>
          )}
        </div>
        <div role="tablist" aria-label="Nguồn nhóm" className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100">
          <button type="button" role="tab" aria-selected={source === 'LIST'} onClick={() => setSource('LIST')} className={ui.segment(source === 'LIST')}>Nhóm đã tham gia</button>
          <button type="button" role="tab" aria-selected={source === 'LINK'} onClick={() => setSource('LINK')} className={ui.segment(source === 'LINK')}>Dán link nhóm</button>
        </div>

        {source === 'LIST' ? (
          dialogs.length === 0 ? (
            <p className={ui.hint}>{loadingDialogs ? 'Đang tải danh sách nhóm...' : 'Chưa thấy nhóm nào. Hãy tham gia nhóm trên Telegram rồi bấm Tải lại, hoặc dán link nhóm.'}</p>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Tìm trong ${dialogs.length} nhóm...`} aria-label="Tìm nhóm" className={`${ui.input} pl-9`} />
              </div>
              <select value={chat} onChange={(e) => setSelectedChat(e.target.value)} aria-label="Chọn nhóm" className={ui.input}>
                {filtered.length === 0 && <option value="">Không có nhóm khớp "{query}"</option>}
                {filtered.map((d) => (
                  <option key={d.id} value={d.id}>{d.title} · {d.isChannel ? 'Kênh' : 'Nhóm'}</option>
                ))}
              </select>
            </div>
          )
        ) : (
          <div className="space-y-1.5">
            <input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" autoCapitalize="off" autoCorrect="off" placeholder="t.me/ten_nhom, @ten_nhom hoặc t.me/+maMoi" aria-label="Link nhóm Telegram" className={ui.input} />
            <p className={ui.hint}>Nhận cả link công khai lẫn link mời nhóm kín. Hệ thống sẽ tự tham gia nhóm nếu cần.</p>
          </div>
        )}
      </fieldset>

      {/* 2. Người đăng mục tiêu */}
      <div className="space-y-1.5">
        <label htmlFor="tg-target" className={ui.label}>SĐT hoặc tên người đăng</label>
        <input id="tg-target" value={targetSender} onChange={(e) => setTargetSender(e.target.value)} autoComplete="off" placeholder="0905 123 456" className={`${ui.input} tabular-nums`} />
        {recent.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className={ui.hint}>Gần đây:</span>
            {recent.map((value) => (
              <button key={value} type="button" onClick={() => setTargetSender(value)} className="min-h-9 px-3 rounded-full bg-slate-100 text-sm text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer tabular-nums">
                {value}
              </button>
            ))}
          </div>
        )}
        <p className="flex items-start gap-1.5 text-xs text-slate-600">
          <Info className="w-4 h-4 shrink-0 text-indigo-600" aria-hidden />
          Nên nhập SĐT: tin BĐS luôn ghi SĐT liên hệ, còn tên Telegram hay bị ẩn hoặc dùng nick phụ. Hệ thống nhận mọi cách viết (0905.123.456, +84 905...).
        </p>
      </div>

      {/* 3. Số bài */}
      <fieldset className="space-y-1.5">
        <legend className={ui.label}>Số bài tối đa</legend>
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100">
          {LIMITS.map((n) => (
            <button key={n} type="button" aria-pressed={limit === n} onClick={() => setLimit(n)} className={`${ui.segment(limit === n)} tabular-nums`}>{n}</button>
          ))}
        </div>
        <p className={ui.hint}>Bài đã nạp ở lần quét trước được bỏ qua, không tốn thêm lượt AI.</p>
      </fieldset>

      {/* Thao tác */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t border-slate-100">
        <button type="button" onClick={() => (listener.isListening ? props.onToggleListener({ chat, targetSender, limit }) : submit(props.onToggleListener))} disabled={listenerBusy || (!listener.isListening && !ready)} className={listener.isListening ? ui.dangerBtn : ui.secondaryBtn}>
          {listenerBusy ? <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden /> : listener.isListening ? <Square className="w-4 h-4" aria-hidden /> : <Radio className="w-4 h-4" aria-hidden />}
          {listener.isListening ? 'Dừng đón tin mới' : 'Tự đón tin mới'}
        </button>
        <button type="button" onClick={() => submit(props.onStart)} disabled={!ready || isRunning || starting} className={ui.primaryBtn}>
          {starting || isRunning ? <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden /> : <Play className="w-4 h-4" aria-hidden />}
          {isRunning ? 'Đang quét...' : 'Quét & nạp vào Bảng hàng'}
        </button>
      </div>
      {listener.isListening && (
        <p className="flex items-center gap-2 text-sm text-emerald-800" aria-live="polite">
          <span className="w-2 h-2 rounded-full bg-emerald-500 motion-safe:animate-pulse" aria-hidden />
          Đang đón bài mới của <strong>{listener.targetSender}</strong> trong {listener.chatTitle}
        </p>
      )}
    </section>
  );
};
