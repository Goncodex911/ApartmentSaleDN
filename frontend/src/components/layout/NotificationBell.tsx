import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppNotification, notificationApi } from '../../api/notificationApi.js';
import { User } from '../../api/authApi.js';
import { MatchShareModal } from '../leads/MatchShareModal.js';
import { Bell, Sparkles, MessageSquare } from 'lucide-react';

const POLL_INTERVAL_MS = 30_000;

const timeAgo = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)} giờ trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
};

// Chuông thông báo (Story 6.3 - AC2): hỏi server mỗi 30 giây, chỉ khi tab đang hiển thị
export const NotificationBell: React.FC<{ user: User }> = ({ user }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [match, setMatch] = useState<{ apartmentId: string; leadId: string } | null>(null);

  const refresh = useCallback(() => {
    notificationApi
      .list()
      .then((data) => {
        setItems(data.items);
        setUnreadCount(data.unreadCount);
      })
      .catch(() => undefined); // Lỗi mạng tạm thời: giữ dữ liệu cũ, lần hỏi sau sẽ thử lại
  }, []);

  useEffect(() => {
    // Chỉ hỏi server khi tab đang hiển thị; quay lại tab thì cập nhật ngay
    const refreshIfVisible = () => document.visibilityState === 'visible' && refresh();
    refresh();
    const timer = setInterval(refreshIfVisible, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [refresh]);

  const handleOpenItem = (item: AppNotification) => {
    setIsOpen(false);
    if (!item.readAt) {
      notificationApi.markRead(item._id).then(refresh).catch(() => undefined);
    }
    if (item.type === 'APARTMENT_MATCH' && item.apartmentId && item.leadId) {
      setMatch({ apartmentId: item.apartmentId, leadId: item.leadId });
    } else {
      navigate('/leads');
    }
  };

  return (
    <div className="relative">
      <button onClick={() => setIsOpen((open) => !open)} title="Thông báo" className="relative p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:absolute inset-x-2 sm:inset-x-auto top-16 sm:top-11 sm:right-0 sm:w-96 max-h-[70vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 z-50">
          <div className="flex items-center justify-between p-3 border-b border-slate-100">
            <p className="font-bold text-sm text-slate-800">Thông báo</p>
            {unreadCount > 0 && (
              <button onClick={() => notificationApi.markAllRead().then(refresh)} className="text-xs text-indigo-600 font-semibold">
                Đánh dấu đã đọc tất cả
              </button>
            )}
          </div>
          {items.length === 0 && <p className="p-6 text-center text-xs text-slate-400">Chưa có thông báo nào.</p>}
          {items.map((item) => (
            <button
              key={item._id}
              onClick={() => handleOpenItem(item)}
              className={`w-full text-left p-3 flex gap-2.5 border-b border-slate-50 hover:bg-slate-50 ${item.readAt ? '' : 'bg-indigo-50/50'}`}
            >
              {item.type === 'APARTMENT_MATCH' ? (
                <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              ) : (
                <MessageSquare className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
              )}
              <span className="min-w-0">
                <span className="block text-xs font-bold text-slate-800">{item.title}</span>
                <span className="block text-xs text-slate-600">{item.body}</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">{timeAgo(item.createdAt)}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {match && <MatchShareModal {...match} currentUser={user} onClose={() => setMatch(null)} />}
    </div>
  );
};
