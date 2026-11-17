import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { User, authApi } from '../api/authApi.js';
import { ApartmentPayload } from '../api/apartmentApi.js';
import { DuplicateApartment, ListingSubmission, submissionApi } from '../api/submissionApi.js';
import { useSubmissions } from '../hooks/useSubmissions.js';
import { Navbar } from '../components/layout/Navbar.js';
import { ProfileModal } from '../components/profile/ProfileModal.js';
import { ApartmentModal } from '../components/apartment/ApartmentModal.js';
import { SubmissionCard } from '../components/submissions/SubmissionCard.js';
import { DuplicateDialog, RejectDialog } from '../components/submissions/ReviewDialogs.js';

const REVIEW_TABS = [
  { status: 'PENDING', label: 'Chờ duyệt' },
  { status: '', label: 'Tất cả' },
];

// Form đang mở: đăng tin mới (CTV) hoặc sửa tin còn chờ duyệt
type FormState = { mode: 'create' } | { mode: 'edit'; submission: ListingSubmission };

/**
 * Tin đăng (Story 8.6) — CTV: "Tin tôi đăng" + nút Đăng tin; Quản lý: "Duyệt tin" (xem, sửa, duyệt / gộp, từ chối).
 */
export const SubmissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [tab, setTab] = useState('PENDING');
  const [form, setForm] = useState<FormState | null>(null);
  const [rejecting, setRejecting] = useState<ListingSubmission | null>(null);
  const [duplicates, setDuplicates] = useState<{ submission: ListingSubmission; items: DuplicateApartment[] } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    authApi.getMe().then((res) => setCurrentUser(res.data)).catch(() => navigate('/login'));
  }, [navigate]);

  const isManager = currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN';
  const { items, state, reload } = useSubmissions(currentUser ? (isManager ? 'review' : 'mine') : null, isManager ? tab : '');

  // Chạy 1 thao tác trên tin: khóa nút của tin đó, báo kết quả, tải lại danh sách
  const run = async (submission: ListingSubmission, action: () => Promise<unknown>, success: string) => {
    setBusyId(submission._id);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: 'ok', text: success });
      reload();
    } catch (err: any) {
      setMessage({ tone: 'error', text: err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại' });
    } finally {
      setBusyId(null);
    }
  };

  const approve = (submission: ListingSubmission, mergeInto?: string) =>
    run(submission, () => submissionApi.approve(submission._id, mergeInto), mergeInto ? 'Đã gộp vào căn có sẵn' : 'Đã duyệt, căn đã vào bảng hàng').then(() =>
      setDuplicates(null)
    );

  // Duyệt: kiểm tra căn trùng trước; có trùng → hỏi Quản lý gộp hay tạo mới
  const startApprove = async (submission: ListingSubmission) => {
    setBusyId(submission._id);
    const found = await submissionApi.duplicates(submission._id).catch(() => []);
    setBusyId(null);
    if (found.length) setDuplicates({ submission, items: found });
    else approve(submission);
  };

  const saveForm = async (payload: ApartmentPayload) => {
    if (form?.mode === 'edit') await submissionApi.update(form.submission._id, payload);
    else await submissionApi.create(payload);
    setMessage({ tone: 'ok', text: form?.mode === 'edit' ? 'Đã lưu tin' : 'Đã gửi tin, chờ Quản lý duyệt' });
    reload();
  };

  const renderList = () => {
    if (state === 'loading') {
      return <div className="space-y-2 animate-pulse">{[0, 1, 2].map((i) => <div key={i} className="h-36 bg-slate-200/70 rounded-2xl" />)}</div>;
    }
    if (state === 'error') {
      return (
        <div className="py-12 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" aria-hidden />
          <p className="text-sm text-slate-600">Không tải được danh sách tin.</p>
          <button onClick={reload} className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium">Thử lại</button>
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <div className="py-12 text-center space-y-1">
          <p className="text-base font-semibold text-slate-800">{isManager ? 'Không có tin nào chờ duyệt' : 'Bạn chưa đăng tin nào'}</p>
          <p className="text-sm text-slate-500">{isManager ? 'Tin CTV gửi lên sẽ hiện ở đây.' : 'Tìm được căn mới? Bấm "Đăng tin" để gửi Quản lý duyệt.'}</p>
        </div>
      );
    }
    return (
      <div className="grid gap-2 lg:grid-cols-2">
        {items.map((submission) => (
          <SubmissionCard
            key={submission._id}
            submission={submission}
            busy={busyId === submission._id}
            onEdit={() => setForm({ mode: 'edit', submission })}
            {...(isManager
              ? { onApprove: () => startApprove(submission), onReject: () => setRejecting(submission) }
              : {
                  onWithdraw: () =>
                    window.confirm('Rút tin này? Quản lý sẽ không thấy tin nữa.') &&
                    run(submission, () => submissionApi.withdraw(submission._id), 'Đã rút tin'),
                })}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={currentUser} onOpenProfile={() => setIsProfileOpen(true)} onLogout={() => { localStorage.clear(); navigate('/login'); }} />

      <main className="max-w-5xl mx-auto px-4 pt-4 pb-badge-safe space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-slate-900">{isManager ? 'Duyệt tin' : 'Tin tôi đăng'}</h1>
          {currentUser && !isManager && (
            <button onClick={() => setForm({ mode: 'create' })} className="h-11 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
              Đăng tin
            </button>
          )}
        </div>

        {isManager && (
          <div role="tablist" className="flex gap-1 p-1 rounded-xl bg-slate-200/60 w-fit">
            {REVIEW_TABS.map((item) => (
              <button
                key={item.label}
                role="tab"
                aria-selected={tab === item.status}
                onClick={() => setTab(item.status)}
                className={`h-10 px-4 rounded-lg text-sm font-medium ${tab === item.status ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {message && (
          <p role={message.tone === 'error' ? 'alert' : 'status'} className={`p-3 rounded-xl text-sm ${message.tone === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}>
            {message.text}
          </p>
        )}
        {renderList()}
      </main>

      {form && (
        <ApartmentModal
          initialData={form.mode === 'edit' ? form.submission.data : null}
          heading={form.mode === 'edit' ? 'Sửa tin đăng' : 'Đăng tin'}
          submitLabel={form.mode === 'edit' ? 'Lưu tin' : 'Gửi Quản lý duyệt'}
          onSave={saveForm}
          onClose={() => setForm(null)}
        />
      )}
      {rejecting && (
        <RejectDialog
          title={rejecting.data.title}
          busy={busyId === rejecting._id}
          onClose={() => setRejecting(null)}
          onConfirm={(reason) => run(rejecting, () => submissionApi.reject(rejecting._id, reason), 'Đã từ chối tin').then(() => setRejecting(null))}
        />
      )}
      {duplicates && (
        <DuplicateDialog
          duplicates={duplicates.items}
          busy={busyId === duplicates.submission._id}
          onClose={() => setDuplicates(null)}
          onMerge={(apartmentId) => approve(duplicates.submission, apartmentId)}
          onCreateNew={() => approve(duplicates.submission)}
        />
      )}
      {isProfileOpen && currentUser && <ProfileModal user={currentUser} onClose={() => setIsProfileOpen(false)} onProfileUpdated={setCurrentUser} />}
    </div>
  );
};
