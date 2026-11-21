import React, { useCallback, useEffect, useState } from 'react';
import { LogOut, Monitor, Smartphone, Tablet } from 'lucide-react';
import { DeviceSession, userApi } from '../../api/userApi.js';
import { Button } from '../ui/Button.js';
import { Skeleton } from '../ui/Skeleton.js';
import { deviceOf } from '../../utils/device.js';
import { timeAgo } from '../../utils/format.js';

const iconOf = (userAgent: string) => (/iPad|Tablet/.test(userAgent) ? Tablet : /iPhone|Android|Mobile/.test(userAgent) ? Smartphone : Monitor);

/**
 * Story 16.4: thiết bị đang đăng nhập. `userId` → Admin xem của thành viên (có "Đăng xuất tất cả");
 * không truyền → của chính mình (thiết bị đang dùng không có nút — đã có nút Đăng xuất chung).
 * Mọi thao tác đăng xuất đều hỏi xác nhận tại chỗ (2 chạm), không mở thêm hộp thoại chồng.
 */
export const SessionList: React.FC<{ userId?: string }> = ({ userId }) => {
  const [sessions, setSessions] = useState<DeviceSession[] | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null); // id phiên hoặc 'all'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    userApi.listSessions(userId).then(setSessions).catch(() => setError('Không tải được danh sách thiết bị.'));
  }, [userId]);
  useEffect(load, [load]);

  const revoke = async (target: string) => {
    setBusy(true);
    setError('');
    try {
      if (target === 'all') await userApi.revokeAllSessions(userId!);
      else await userApi.revokeSession(target, userId);
      setConfirming(null);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không đăng xuất được, vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const confirmRow = (target: string, text: string) => (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-sm text-slate-800 flex-1 min-w-[10rem]">{text}</span>
      <Button size="sm" variant="outline" onClick={() => setConfirming(null)} disabled={busy}>Hủy</Button>
      <Button size="sm" variant="danger" loading={busy} onClick={() => revoke(target)}>Đăng xuất</Button>
    </div>
  );

  if (!sessions && !error) return <div className="space-y-2" aria-busy="true" aria-label="Đang tải thiết bị">{[0, 1].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  return (
    <div className="space-y-2">
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {sessions?.length === 0 && <p className="text-sm text-slate-600">Không có thiết bị nào đang đăng nhập.</p>}
      <ul className="space-y-2">
        {sessions?.map((session) => {
          const Icon = iconOf(session.userAgent);
          return (
            <li key={session.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 mt-0.5 text-slate-600 shrink-0" aria-hidden />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {session.userAgent ? deviceOf(session.userAgent) : 'Thiết bị không xác định'}
                    {session.current && <span className="ml-2 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">Thiết bị này</span>}
                  </p>
                  <p className="text-xs text-slate-600">
                    {session.ip || 'Không rõ IP'}
                    {session.createdAt && ` · Đăng nhập ${new Date(session.createdAt).toLocaleDateString('vi-VN')}`}
                    {session.lastUsedAt && ` · Dùng ${timeAgo(session.lastUsedAt)}`}
                  </p>
                </div>
                {!session.current && confirming !== session.id && (
                  <button type="button" onClick={() => setConfirming(session.id)} aria-label="Đăng xuất thiết bị này"
                    className="w-11 h-11 -m-2 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-700 cursor-pointer">
                    <LogOut className="w-4 h-4" aria-hidden />
                  </button>
                )}
              </div>
              {confirming === session.id && confirmRow(session.id, 'Đăng xuất thiết bị này?')}
            </li>
          );
        })}
      </ul>
      {userId && !!sessions?.length && (
        confirming === 'all'
          ? confirmRow('all', 'Đăng xuất khỏi mọi thiết bị? Tài khoản vẫn hoạt động, người dùng đăng nhập lại được.')
          : <Button variant="outline" icon={LogOut} onClick={() => setConfirming('all')} className="w-full">Đăng xuất tất cả thiết bị</Button>
      )}
    </div>
  );
};
