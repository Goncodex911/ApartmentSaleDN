import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldCheck, WifiOff } from 'lucide-react';
import { useApp } from '../components/layout/AppShell.js';
import { ModerationItem, ResolveAction, reportApi } from '../api/reportApi.js';
import { ModerationCard } from '../components/admin/ModerationCard.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Button } from '../components/ui/Button.js';
import { Skeleton } from '../components/ui/Skeleton.js';

const RESULT_TEXT: Record<ResolveAction['action'], string> = {
  MARK_RENTED: 'Đã chuyển sang Đã thuê',
  UPDATE_PRICE: 'Đã cập nhật giá',
  DISMISS: 'Đã gỡ cờ, tin vẫn hiển thị bình thường',
};

/** Kiểm duyệt báo lỗi tin (Story 13.6 — Admin + Quản lý): căn bị CTV báo lỗi, xử lý 1 chạm để làm sạch Bảng hàng. */
export const ModerationPage: React.FC = () => {
  const { user } = useApp();
  const [items, setItems] = useState<ModerationItem[] | null>(null);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(() => {
    setError(false);
    reportApi.queue().then(setItems).catch(() => setError(true));
  }, []);
  useEffect(load, [load]);

  if (user && user.role === 'COLLABORATOR') return <Navigate to="/apartments" replace />;

  const resolve = async (item: ModerationItem, action: ResolveAction) => {
    setMessage(null);
    try {
      const result = await reportApi.resolve(item._id, action);
      const trust = result.trustDelta ? ` · ${result.trustDelta > 0 ? '+' : ''}${result.trustDelta} điểm tín nhiệm cho ${result.reporters} người báo` : '';
      setMessage({ tone: 'ok', text: `${RESULT_TEXT[action.action]}: ${item.title}${trust}` });
      setItems((list) => list?.filter((current) => current._id !== item._id) ?? null);
    } catch (err: any) {
      setMessage({ tone: 'error', text: err.response?.data?.message || 'Không xử lý được, vui lòng thử lại' });
    }
  };

  const renderList = () => {
    if (error) return <EmptyState icon={WifiOff} title="Không tải được hàng đợi" description="Vui lòng kiểm tra mạng rồi thử lại." action={<Button onClick={load}>Thử lại</Button>} />;
    if (!items) {
      return (
        <div className="space-y-2" aria-busy="true" aria-label="Đang tải báo lỗi">
          {[0, 1].map((i) => <Skeleton key={i} className="h-60 rounded-2xl" />)}
        </div>
      );
    }
    if (!items.length) return <EmptyState icon={ShieldCheck} title="Không có báo lỗi nào" description="Bảng hàng đang sạch. Báo lỗi mới của CTV sẽ hiện ở đây." />;
    return (
      <ul className="grid gap-2 lg:grid-cols-2">
        {items.map((item) => <ModerationCard key={item._id} item={item} onResolve={(action) => resolve(item, action)} />)}
      </ul>
    );
  };

  return (
    <main className="max-w-5xl mx-auto px-4 pt-4 pb-app space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-900">Kiểm duyệt báo lỗi</h1>
        {items && <span className="text-sm text-slate-600">{items.length} căn</span>}
      </div>
      <p className="text-sm text-slate-600">Báo lỗi đúng (Đã thuê / Sửa giá) cộng 5 điểm tín nhiệm cho người báo. Báo sai trừ 5 điểm, dưới −15 tự khóa quyền báo lỗi.</p>
      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`p-3 rounded-xl text-sm ${message.tone === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}>
          {message.text}
        </p>
      )}
      {renderList()}
    </main>
  );
};
