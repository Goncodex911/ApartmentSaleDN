import { useCallback, useEffect, useState } from 'react';
import { User } from '../api/authApi.js';
import { ANNOUNCEMENT_CHANGED, APARTMENT_REALTIME, connectRealtime, RealtimeMessage } from '../api/realtimeStream.js';
import { formatVnd } from '../utils/format.js';
import { APARTMENTS_CHANGED } from './useApartmentSearch.js';

export type LiveToastKind = 'deposited' | 'created' | 'available' | 'price';
export interface LiveToastData {
  key: number;
  kind: LiveToastKind;
  text: string;
  canView: boolean; // Căn mới → nút "Xem" tải lại danh sách
}

function toastFor({ type, data }: RealtimeMessage): Omit<LiveToastData, 'key'> | null {
  if (!data.label) return null; // CTV nhận căn đã cho thuê không kèm tên → chỉ làm mờ thẻ, không báo
  if (type === 'apartment.flagged') return null; // Story 13.6: gắn / gỡ "Chờ xác minh" chỉ đổi nhãn trên thẻ, không báo nổi
  if (type === 'apartment.created') return { kind: 'created', text: `Có căn mới: ${data.label}`, canView: true };
  if (type === 'apartment.price') return { kind: 'price', text: `${data.label} vừa giảm giá còn ${formatVnd(data.price || 0)}`, canView: false };
  if (data.status === 'DEPOSITED') return { kind: 'deposited', text: `${data.label} vừa được đặt cọc`, canView: false };
  if (data.status === 'AVAILABLE') return { kind: 'available', text: `${data.label} đã trống trở lại`, canView: false };
  return null;
}

/** Nối luồng cập nhật kho phòng khi đã đăng nhập (Story 11.4); trả thông báo nhỏ đang hiện. */
export function useRealtimeInventory(user: User | null) {
  const [toast, setToast] = useState<LiveToastData | null>(null);
  const userId = user?._id;

  useEffect(() => {
    if (!userId) return;
    return connectRealtime((message) => {
      // Máy chủ vừa khởi động lại / mất quá nhiều sự kiện → tải lại toàn bộ danh sách
      if (message.type === 'reset') return void window.dispatchEvent(new Event(APARTMENTS_CHANGED));
      if (message.type === 'announcement.changed') return void window.dispatchEvent(new Event(ANNOUNCEMENT_CHANGED)); // Story 16.9
      window.dispatchEvent(new CustomEvent<RealtimeMessage>(APARTMENT_REALTIME, { detail: message }));
      if (message.data.by === userId) return; // Thay đổi do chính mình → không báo lại
      const next = toastFor(message);
      if (next) setToast({ ...next, key: Date.now() });
    });
  }, [userId]);

  const dismiss = useCallback(() => setToast(null), []);
  return { toast, dismiss };
}
