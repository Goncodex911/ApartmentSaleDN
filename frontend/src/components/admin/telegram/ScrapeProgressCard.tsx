import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Building2, CheckCircle2, ChevronRight, CircleDot, Loader2, Square, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ScrapeLog, ScrapeTask } from '../../../api/telegramUserbotApi.js';
import { priceShort } from '../../../utils/priceShort.js';
import { ui } from './telegramUi.js';

interface Props {
  task: ScrapeTask;
  error: string | null;
  onCancel: () => void;
}

const LEVEL: Record<ScrapeLog['level'], { icon: LucideIcon; className: string }> = {
  info: { icon: CircleDot, className: 'text-slate-400' },
  success: { icon: CheckCircle2, className: 'text-emerald-400' },
  warn: { icon: AlertTriangle, className: 'text-amber-400' },
  error: { icon: XCircle, className: 'text-rose-400' },
};

const STATUS: Record<ScrapeTask['status'], { label: string; icon: LucideIcon; className: string }> = {
  RUNNING: { label: 'Đang quét', icon: Loader2, className: 'text-indigo-700' },
  COMPLETED: { label: 'Hoàn tất', icon: CheckCircle2, className: 'text-emerald-700' },
  CANCELLED: { label: 'Đã dừng', icon: Square, className: 'text-slate-700' },
  FAILED: { label: 'Lỗi', icon: XCircle, className: 'text-rose-700' },
};

const timeOf = (at: number) => new Date(at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const ScrapeProgressCard: React.FC<Props> = ({ task, error, onCancel }) => {
  const logBoxRef = useRef<HTMLOListElement>(null);
  const running = task.status === 'RUNNING';
  const status = STATUS[task.status];

  // Tự cuộn xuống log mới — chỉ khi người dùng đang ở cuối (không giật khi họ kéo lên đọc log cũ)
  useEffect(() => {
    const box = logBoxRef.current;
    if (box && box.scrollHeight - box.scrollTop - box.clientHeight < 80) box.scrollTop = box.scrollHeight;
  }, [task.logs.length]);

  return (
    <section className={ui.card} aria-labelledby="tg-progress-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="tg-progress-title" className={`${ui.cardTitle} ${status.className}`}>
          <status.icon className={`w-5 h-5 ${running ? 'motion-safe:animate-spin' : ''}`} aria-hidden />
          {status.label}
          {running && task.stopRequested && <span className="text-sm font-medium text-slate-600">· sẽ dừng sau bài hiện tại</span>}
        </h2>
        <span className="text-sm font-semibold text-slate-700 tabular-nums">{task.percent}%</span>
      </div>

      {/* Thanh tiến trình: scaleX (chạy trên GPU) thay vì đổi width */}
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={task.percent} aria-label="Tiến trình cào tin">
        <div
          className={`h-full origin-left rounded-full transition-transform duration-500 ease-out motion-reduce:transition-none ${task.status === 'FAILED' ? 'bg-rose-500' : 'bg-indigo-600'}`}
          style={{ transform: `scaleX(${Math.max(task.percent, 2) / 100})` }}
        />
      </div>

      <ol ref={logBoxRef} aria-live="polite" className="max-h-56 overflow-y-auto overscroll-contain rounded-xl bg-slate-900 p-3 space-y-1.5 font-mono text-xs leading-relaxed text-slate-200">
        {task.logs.length === 0 && <li className="text-slate-400">Đang chuẩn bị...</li>}
        {task.logs.map((log, i) => {
          const level = LEVEL[log.level] ?? LEVEL.info;
          return (
            <li key={i} className="flex gap-2">
              <span className="shrink-0 text-slate-500 tabular-nums">{timeOf(log.at)}</span>
              <level.icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${level.className}`} aria-hidden />
              <span className="min-w-0 break-words">{log.text}</span>
            </li>
          );
        })}
      </ol>

      {error && <p role="alert" className={ui.alert}><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />{error}</p>}

      {running && (
        <button type="button" onClick={onCancel} disabled={task.stopRequested} className={`${ui.secondaryBtn} w-full sm:w-auto`}>
          <Square className="w-4 h-4" aria-hidden /> Dừng quét
        </button>
      )}

      {/* Căn hộ đã nạp — hiện dần trong lúc quét */}
      {task.apartments.length > 0 ? (
        <div className="space-y-2 pt-1">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Building2 className="w-4 h-4 text-emerald-600" aria-hidden /> Đã nạp {task.apartments.length} căn vào Bảng hàng
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {task.apartments.map((apt) => (
              <li key={apt._id}>
                <Link
                  to="/apartments"
                  state={{ openApartmentId: apt._id }}
                  className="flex gap-3 p-2 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {apt.images?.[0] ? (
                    <img src={apt.images[0]} alt="" loading="lazy" className="w-20 h-20 shrink-0 rounded-lg object-cover bg-slate-100" />
                  ) : (
                    <div className="w-20 h-20 shrink-0 rounded-lg bg-slate-100 grid place-items-center text-xs text-slate-500">Không ảnh</div>
                  )}
                  <div className="min-w-0 flex-1 py-0.5">
                    <p className="text-sm font-semibold text-slate-900 line-clamp-2">{apt.title}</p>
                    <p className="text-sm font-bold text-emerald-700 tabular-nums">{priceShort(apt.price)}</p>
                    <p className="text-xs text-slate-600 truncate">{apt.location?.district || 'Đà Nẵng'} · {apt.images?.length || 0} ảnh</p>
                  </div>
                  <ChevronRight className="w-4 h-4 self-center shrink-0 text-slate-400" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        !running &&
        task.status !== 'FAILED' && (
          <p className="p-3 rounded-xl bg-slate-50 text-sm text-slate-700">
            Không có căn mới được nạp. Thử tăng số bài, kiểm tra lại SĐT, hoặc người này chưa đăng bài mới từ lần quét trước.
          </p>
        )
      )}
    </section>
  );
};
