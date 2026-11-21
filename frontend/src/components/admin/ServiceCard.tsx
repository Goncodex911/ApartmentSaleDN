import React, { useState } from 'react';
import { AlertTriangle, BookOpen, CheckCircle2, CircleHelp, KeyRound, MinusCircle, RefreshCw, XCircle, LucideIcon } from 'lucide-react';
import { ServiceState, ServiceStatus } from '../../api/adminApi.js';
import { BottomSheet } from '../layout/BottomSheet.js';
import { Button } from '../ui/Button.js';
import { timeAgo } from '../../utils/format.js';
import { SERVICE_INFO } from './serviceGuides.js';

// Nhãn chữ + icon + màu (không chỉ dùng màu) — Story 16.8a
export const STATE_STYLE: Record<ServiceState, { label: string; icon: LucideIcon; className: string }> = {
  OK: { label: 'Bình thường', icon: CheckCircle2, className: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  DEGRADED: { label: 'Chập chờn', icon: AlertTriangle, className: 'bg-amber-50 border-amber-200 text-amber-900' },
  DOWN: { label: 'Lỗi', icon: XCircle, className: 'bg-rose-50 border-rose-200 text-rose-800' },
  KEY_INVALID: { label: 'Cần thay key', icon: KeyRound, className: 'bg-rose-50 border-rose-200 text-rose-800' },
  NOT_CONFIGURED: { label: 'Chưa cấu hình', icon: MinusCircle, className: 'bg-slate-100 border-slate-300 text-slate-700' },
  UNKNOWN: { label: 'Chưa có dữ liệu', icon: CircleHelp, className: 'bg-slate-100 border-slate-300 text-slate-700' },
};

/** 1 dịch vụ: trạng thái, lần kiểm tra, độ trễ, lỗi 24h, [Kiểm tra lại], hướng dẫn thay key khi cần. */
export const ServiceCard: React.FC<{ status: ServiceStatus; checking: boolean; onCheck: () => void }> = ({ status, checking, onCheck }) => {
  const [guideOpen, setGuideOpen] = useState(false);
  const info = SERVICE_INFO[status.service];
  const style = STATE_STYLE[status.state];
  const needsAction = status.state === 'KEY_INVALID' || status.state === 'DOWN' || status.state === 'NOT_CONFIGURED';

  return (
    <li className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900">{info.label}</h2>
          <p className="text-xs text-slate-600">{info.purpose}</p>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${style.className}`}>
          <style.icon className="w-3.5 h-3.5" aria-hidden /> {style.label}
        </span>
      </div>

      {status.state === 'KEY_INVALID' && <p role="alert" className="text-sm font-medium text-rose-800">API key của {info.label} không hợp lệ hoặc đã hết hạn.</p>}
      {status.message && <p className="text-xs text-slate-700 break-words bg-slate-50 rounded-lg p-2">{status.message}</p>}

      <p className="text-xs text-slate-600">
        {status.lastCheckedAt ? `Lần gần nhất ${timeAgo(status.lastCheckedAt)}` : 'Chưa kiểm tra'}
        {status.latencyMs !== null && ` · ${status.latencyMs} ms`}
        {status.calls24h > 0 && ` · 24 giờ: ${status.calls24h} lượt`}
        {status.rateLimited24h > 0 && `, ${status.rateLimited24h} lần quá hạn mức (429)`}
        {status.errors24h > 0 && `, ${status.errors24h} lỗi`}
      </p>

      <div className="flex flex-wrap gap-2">
        {status.service !== 'nominatim' && status.state !== 'NOT_CONFIGURED' && (
          <Button size="sm" variant="outline" icon={RefreshCw} loading={checking} onClick={onCheck}>Kiểm tra lại</Button>
        )}
        <Button size="sm" variant={needsAction ? 'primary' : 'ghost'} icon={BookOpen} onClick={() => setGuideOpen(true)}>
          {status.state === 'KEY_INVALID' ? 'Xem cách lấy key mới' : 'Hướng dẫn cấu hình'}
        </Button>
      </div>

      {guideOpen && (
        <BottomSheet title={`Cấu hình ${info.label}`} onClose={() => setGuideOpen(false)} showClose>
          <div className="space-y-3 pb-2 text-sm text-slate-800">
            <ol className="list-decimal pl-5 space-y-2">{info.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            <p className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              Biến cần sửa trên <strong>{status.env.where}</strong>: {status.env.vars.map((name) => <code key={name} className="mx-0.5 px-1 rounded bg-white border border-slate-200 text-xs">{name}</code>)}
            </p>
            {info.dashboard && (
              <a href={info.dashboard} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[44px] font-semibold text-indigo-700 hover:underline">Mở trang quản lý {info.label}</a>
            )}
          </div>
        </BottomSheet>
      )}
    </li>
  );
};
