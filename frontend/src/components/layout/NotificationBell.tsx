import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppNotification, notificationApi } from '../../api/notificationApi.js';
import { User } from '../../api/authApi.js';
import { MatchShareModal } from '../leads/MatchShareModal.js';
import { Bell, Target, MessageSquare, ClipboardCheck, CalendarClock, X, AlertTriangle, RefreshCcw, HandCoins, LogOut, ShieldAlert, Activity, Megaphone, LucideIcon } from 'lucide-react';
import { timeAgo } from '../../utils/format.js';

const POLL_INTERVAL_MS = 30_000;

// Thông báo bấm vào mở chi tiết căn: nhắc tái ký, báo lỗi, căn đã thuê được đăng lại (14.2), khách đã cọc (14.8)
const OPENS_APARTMENT = new Set<AppNotification['type']>(['LEASE_EXPIRING', 'LISTING_FLAGGED', 'SOURCE_AVAILABLE_AGAIN', 'LEAD_DEPOSITED']);
const ICONS: Partial<Record<AppNotification['type'], [LucideIcon, string]>> = {
  APARTMENT_MATCH: [Target, 'text-emerald-600'],
  LISTING_FLAGGED: [AlertTriangle, 'text-amber-600'],
  LEASE_EXPIRING: [CalendarClock, 'text-amber-600'],
  SOURCE_AVAILABLE_AGAIN: [RefreshCcw, 'text-amber-600'],
  LEAD_DEPOSITED: [HandCoins, 'text-emerald-600'],
  SESSION_REVOKED: [LogOut, 'text-rose-600'], // Story 16.4
  SECURITY_ALERT: [ShieldAlert, 'text-rose-600'], // Story 16.5
  SERVICE_INCIDENT: [Activity, 'text-rose-600'], // Story 16.8a
  ANNOUNCEMENT: [Megaphone, 'text-indigo-600'], // Story 16.9
};

const NotificationIcon: React.FC<{ type: AppNotification['type'] }> = ({ type }) => {
  const [Icon, color] = ICONS[type] ?? (type.startsWith('LISTING_') ? [ClipboardCheck, 'text-indigo-500'] : [MessageSquare, 'text-violet-500']);
  return <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${color}`} aria-hidden />;
};

// Chuông thông báo (Story 6.3 - AC2): hỏi server mỗi 30 giây, chỉ khi tab đang hiển thị
export const NotificationBell: React.FC<{ user: User }> = ({ user }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [match, setMatch] = useState<{ apartmentId: string; leadId: string } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Story 10.1: chạm ra ngoài hoặc bấm Esc → đóng khung thông báo
  useEffect(() => {
    if (!isOpen) return;
    const onPointer = (e: PointerEvent) => !wrapperRef.current?.contains(e.target as Node) && setIsOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

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
    } else if (OPENS_APARTMENT.has(item.type) && item.apartmentId) {
      navigate('/apartments', { state: { openApartmentId: item.apartmentId } }); // Mở chi tiết căn (Story 11.5, 13.6, 14.2, 14.8)
    } else if (item.type === 'SECURITY_ALERT') {
      navigate('/admin/alerts'); // Story 16.5
    } else if (item.type === 'SERVICE_INCIDENT') {
      navigate('/admin/health'); // Story 16.8a
    } else if (item.type === 'ANNOUNCEMENT') {
      navigate('/apartments'); // Story 16.9: nội dung đầy đủ ở dải ghim đầu Bảng hàng
    } else if (item.type === 'SESSION_REVOKED') {
      // Story 16.4: chỉ để thông báo, không mở trang nào
    } else if (item.type.startsWith('LISTING_')) {
      navigate('/submissions'); // Tin đăng chờ duyệt / kết quả duyệt (Story 8.6)
    } else {
      navigate('/leads');
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button onClick={() => setIsOpen((open) => !open)} title="Thông báo" aria-label="Thông báo" aria-expanded={isOpen} className="relative w-11 h-11 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:absolute inset-x-2 sm:inset-x-auto top-[calc(4rem+env(safe-area-inset-top))] sm:top-12 sm:right-0 sm:w-96 max-h-[70vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 z-50">
          <div className="sticky top-0 flex items-center gap-2 pl-3 border-b border-slate-100 bg-white">
            <p className="flex-1 font-bold text-sm text-slate-800">Thông báo</p>
            {unreadCount > 0 && (
              <button onClick={() => notificationApi.markAllRead().then(refresh)} className="min-h-[44px] px-2 text-xs text-indigo-600 font-semibold">
                Đã đọc tất cả
              </button>
            )}
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Đóng thông báo" className="w-11 h-11 flex items-center justify-center text-slate-600 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          {items.length === 0 && <p className="p-6 text-center text-xs text-slate-600">Chưa có thông báo nào.</p>}
          {items.map((item) => (
            <button
              key={item._id}
              onClick={() => handleOpenItem(item)}
              className={`w-full text-left p-3 flex gap-2.5 border-b border-slate-50 hover:bg-slate-50 ${item.readAt ? '' : 'bg-indigo-50/50'}`}
            >
              <NotificationIcon type={item.type} />
              <span className="min-w-0">
                <span className="block text-xs font-bold text-slate-800">{item.title}</span>
                <span className="block text-xs text-slate-600">{item.body}</span>
                <span className="block text-[10px] text-slate-600 mt-0.5">{timeAgo(item.createdAt)}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {match && <MatchShareModal {...match} currentUser={user} onClose={() => setMatch(null)} />}
    </div>
  );
};
