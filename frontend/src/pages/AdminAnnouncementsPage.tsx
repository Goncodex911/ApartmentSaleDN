import React, { useState } from 'react';
import { Megaphone, Send, WifiOff } from 'lucide-react';
import { Announcement, Audience, SendAnnouncementInput, adminApi } from '../api/adminApi.js';
import { usePagedList } from '../hooks/usePagedList.js';
import { BottomSheet } from '../components/layout/BottomSheet.js';
import { Linkified } from '../components/layout/AnnouncementBanner.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Input, Select, fieldClass } from '../components/ui/Input.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { timeAgo } from '../utils/format.js';

const AUDIENCE_LABEL: Record<Audience, string> = { ALL: 'Tất cả', COLLABORATOR: 'CTV', MANAGER: 'Quản lý' };

/** Soạn → xem trước ("Gửi tới N người" sau khi gửi) → gửi. Nội dung chữ thường ≤ 500 ký tự. */
const ComposeSheet: React.FC<{ onSent: (message: string) => void; onClose: () => void }> = ({ onSent, onClose }) => {
  const [form, setForm] = useState<SendAnnouncementInput>({ title: '', body: '', audience: 'ALL', pinDays: 3, viaTelegram: false });
  const [previewing, setPreviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid = form.title.trim().length >= 3 && form.body.trim().length >= 3;

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      const sent = await adminApi.sendAnnouncement({ ...form, title: form.title.trim(), body: form.body.trim() });
      onSent(`Đã gửi "${sent.title}" tới ${sent.recipientCount} người`);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không gửi được, vui lòng thử lại');
      setBusy(false);
    }
  };

  return (
    <BottomSheet title={previewing ? 'Xem trước' : 'Soạn thông báo'} onClose={onClose} showClose>
      {previewing ? (
        <div className="space-y-3 pb-2">
          <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-sm">
            <p className="font-semibold text-slate-900">{form.title}</p>
            <p className="whitespace-pre-wrap break-words text-slate-800"><Linkified text={form.body} /></p>
          </div>
          <p className="text-sm text-slate-700">
            Gửi tới: <strong>{AUDIENCE_LABEL[form.audience]}</strong> (thành viên đang hoạt động) · ghim {form.pinDays} ngày{form.viaTelegram ? ' · kèm Telegram' : ''}.
          </p>
          {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 text-sm text-rose-700">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setPreviewing(false)} disabled={busy}>Sửa lại</Button>
            <Button icon={Send} loading={busy} onClick={send}>Gửi</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (valid) setPreviewing(true); }} className="space-y-3 pb-2" noValidate>
          <Input label="Tiêu đề" value={form.title} maxLength={80} onChange={(e) => setForm({ ...form, title: e.target.value })} hint={`${form.title.length}/80`} />
          <label className="block space-y-1">
            <span className="block text-sm font-medium text-slate-700">Nội dung</span>
            <textarea value={form.body} maxLength={500} rows={4} onChange={(e) => setForm({ ...form, body: e.target.value })} className={`${fieldClass} h-auto py-2 resize-y`} />
            <span className="block text-xs text-slate-600">{form.body.length}/500 · Link https:// tự thành liên kết</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Select label="Gửi tới" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value as Audience })}>
              {(Object.keys(AUDIENCE_LABEL) as Audience[]).map((key) => <option key={key} value={key}>{AUDIENCE_LABEL[key]}</option>)}
            </Select>
            <Select label="Ghim trên Bảng hàng" value={form.pinDays} onChange={(e) => setForm({ ...form, pinDays: Number(e.target.value) as 1 | 3 | 7 })}>
              {[1, 3, 7].map((days) => <option key={days} value={days}>{days} ngày</option>)}
            </Select>
          </div>
          <label className="flex items-center gap-3 min-h-[44px] text-sm text-slate-800 cursor-pointer">
            <input type="checkbox" checked={form.viaTelegram} onChange={(e) => setForm({ ...form, viaTelegram: e.target.checked })} className="w-5 h-5 accent-indigo-600" />
            Gửi thêm qua Telegram (người đã liên kết)
          </label>
          <Button type="submit" disabled={!valid} className="w-full">Xem trước</Button>
        </form>
      )}
    </BottomSheet>
  );
};

const AnnouncementRow: React.FC<{ item: Announcement; onRevoked: () => void }> = ({ item, onRevoked }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pinned = !item.revokedAt && new Date(item.pinnedUntil).getTime() > Date.now();
  const revoke = async () => {
    setBusy(true);
    setError('');
    try {
      await adminApi.revokeAnnouncement(item._id);
      onRevoked();
    } catch (err: any) {
      // Story 19.10: báo lỗi thay vì im lặng
      setError(err?.response?.data?.message || 'Không thu hồi được, vui lòng thử lại');
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className="p-3 rounded-2xl bg-white border border-slate-200 space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap gap-1.5">
          <Badge tone="accent">{AUDIENCE_LABEL[item.audience]}</Badge>
          {item.revokedAt ? <Badge tone="neutral">Đã thu hồi</Badge> : pinned ? <Badge tone="AVAILABLE">Đang ghim</Badge> : <Badge tone="neutral">Hết hạn ghim</Badge>}
          {item.viaTelegram && <Badge tone="neutral">Telegram</Badge>}
        </span>
        <time dateTime={item.createdAt} className="text-xs text-slate-600">{timeAgo(item.createdAt)}</time>
      </div>
      <p className="font-semibold text-slate-900">{item.title}</p>
      <p className="text-sm text-slate-700 whitespace-pre-wrap break-words line-clamp-3">{item.body}</p>
      <p className="text-xs text-slate-600">{item.sentByName} · {item.seenCount}/{item.recipientCount} người đã xem</p>
      {pinned && <Button size="sm" variant="outline" loading={busy} onClick={revoke}>Thu hồi (ẩn dải ghim)</Button>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    </li>
  );
};

/** [ADMIN] Story 16.9: thông báo chung — soạn, gửi theo nhóm, xem số người đã xem, thu hồi. Tối đa 10 / ngày. */
export const AdminAnnouncementsPage: React.FC = () => {
  const [composing, setComposing] = useState(false);
  const [message, setMessage] = useState('');
  const { items, state, loadingMore, hasMore, loadMore, reload } = usePagedList('announcements', '', (page) => adminApi.listAnnouncements(page));

  const renderList = () => {
    if (state === 'loading') return <div className="space-y-2" aria-busy="true" aria-label="Đang tải thông báo">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>;
    if (state === 'error') return <EmptyState icon={WifiOff} title="Không tải được thông báo" description="Vui lòng kiểm tra mạng rồi thử lại." action={<Button onClick={reload}>Thử lại</Button>} />;
    if (!items.length) return <EmptyState icon={Megaphone} title="Chưa gửi thông báo nào" description="Thông báo hiện trong chuông và dải ghim đầu Bảng hàng của thành viên." />;
    return <ul className="space-y-2">{items.map((item) => <AnnouncementRow key={item._id} item={item} onRevoked={reload} />)}</ul>;
  };

  return (
    <main className="max-w-3xl mx-auto px-4 pt-4 pb-app space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-900">Thông báo chung</h1>
        <Button icon={Megaphone} onClick={() => setComposing(true)}>Soạn thông báo</Button>
      </div>
      {message && <p role="status" className="p-3 rounded-xl bg-emerald-50 text-sm text-emerald-800">{message}</p>}
      {renderList()}
      {state === 'ready' && hasMore && <Button variant="outline" loading={loadingMore} onClick={loadMore} className="w-full">Tải thêm</Button>}
      {composing && <ComposeSheet onSent={(text) => { setMessage(text); reload(); }} onClose={() => setComposing(false)} />}
    </main>
  );
};
