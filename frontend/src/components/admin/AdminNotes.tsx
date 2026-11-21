import React, { useEffect, useState } from 'react';
import { StickyNote, Trash2 } from 'lucide-react';
import { AdminNote, userApi } from '../../api/userApi.js';
import { Button } from '../ui/Button.js';
import { Skeleton } from '../ui/Skeleton.js';
import { fieldClass } from '../ui/Input.js';
import { timeAgo } from '../../utils/format.js';

const MAX = 500;

/** [ADMIN] Story 16.6: ghi chú nội bộ về thành viên — chỉ Admin thấy; ai viết mới xóa được ghi chú của mình. */
export const AdminNotes: React.FC<{ userId: string; currentUserId?: string }> = ({ userId, currentUserId }) => {
  const [notes, setNotes] = useState<AdminNote[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    userApi.listNotes(userId).then(setNotes).catch(() => setError('Không tải được ghi chú.'));
  }, [userId]);

  const run = async (task: () => Promise<AdminNote[]>, after?: () => void) => {
    setBusy(true);
    setError('');
    try {
      setNotes(await task());
      after?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không lưu được, vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) run(() => userApi.addNote(userId, text.trim()), () => setText(''));
        }}
        className="space-y-2"
      >
        <label className="block">
          <span className="sr-only">Ghi chú mới</span>
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, MAX))} rows={2} placeholder="VD: Đã nhắc CTV cập nhật trạng thái căn sau khi khách xem" className={`${fieldClass} h-auto py-2 resize-y`} />
        </label>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-600 tabular-nums">{text.length}/{MAX}</span>
          <Button type="submit" size="sm" loading={busy} disabled={!text.trim()}>Thêm ghi chú</Button>
        </div>
      </form>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {!notes && !error && <Skeleton className="h-16 rounded-xl" />}
      {notes?.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-slate-600"><StickyNote className="w-4 h-4" aria-hidden /> Chưa có ghi chú nào.</p>
      )}
      <ul className="space-y-2">
        {notes?.map((note) => (
          <li key={note._id} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-sm text-slate-900 whitespace-pre-wrap break-words">{note.text}</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-600">{note.authorName || 'Admin'} · {timeAgo(note.createdAt)}</span>
              {note.authorId === currentUserId && (
                <button type="button" onClick={() => run(() => userApi.deleteNote(userId, note._id))} disabled={busy} aria-label="Xóa ghi chú"
                  className="w-11 h-11 -m-2 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-700 disabled:opacity-50">
                  <Trash2 className="w-4 h-4" aria-hidden />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
