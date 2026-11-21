import React, { useCallback, useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { Announcement, adminApi } from '../../api/adminApi.js';
import { ANNOUNCEMENT_CHANGED } from '../../api/realtimeStream.js';

/**
 * Nội dung chữ thường → đoạn text + link https tự nhận dạng. Chỉ tạo phần tử React (không dangerouslySetInnerHTML)
 * nên nội dung có thẻ <script> vẫn chỉ hiện dạng chữ.
 */
export const Linkified: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(https:\/\/[^\s]+)/g).map((part, index) =>
      index % 2 ? (
        <a key={index} href={part} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold underline break-all">{part}</a>
      ) : (
        <React.Fragment key={index}>{part}</React.Fragment>
      )
    )}
  </>
);

/** Story 16.9: dải ghim thông báo chung đầu Bảng hàng — đóng thì ẩn với riêng mình (mọi thiết bị), cập nhật realtime. */
export const AnnouncementBanner: React.FC = () => {
  const [item, setItem] = useState<Pick<Announcement, '_id' | 'title' | 'body' | 'sentByName'> | null>(null);

  const load = useCallback(() => {
    adminApi.activeAnnouncement().then(setItem).catch(() => undefined); // Lỗi tải → không hiện dải, Bảng hàng vẫn dùng bình thường
  }, []);
  useEffect(() => {
    load();
    window.addEventListener(ANNOUNCEMENT_CHANGED, load);
    return () => window.removeEventListener(ANNOUNCEMENT_CHANGED, load);
  }, [load]);

  if (!item) return null;
  const dismiss = () => {
    setItem(null); // Ẩn ngay, gửi server chạy nền
    adminApi.dismissAnnouncement(item._id).catch(() => undefined);
  };

  return (
    <aside aria-label="Thông báo chung" className="flex items-start gap-3 p-3 rounded-2xl bg-indigo-50 border border-indigo-200">
      <Megaphone className="w-5 h-5 mt-0.5 text-indigo-700 shrink-0" aria-hidden />
      <div className="flex-1 min-w-0 text-sm text-slate-900">
        <p className="font-semibold">{item.title}</p>
        <p className="whitespace-pre-wrap break-words text-slate-800"><Linkified text={item.body} /></p>
        {item.sentByName && <p className="mt-0.5 text-xs text-slate-600">— {item.sentByName}</p>}
      </div>
      <button type="button" onClick={dismiss} aria-label="Đóng thông báo" className="w-11 h-11 -m-2 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer">
        <X className="w-5 h-5" aria-hidden />
      </button>
    </aside>
  );
};
