import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Settings2, UserX, WifiOff } from 'lucide-react';
import { useApp } from '../components/layout/AppShell.js';
import { AdminUser, UserOverview, userApi } from '../api/userApi.js';
import { DashboardSection, StatTile } from '../components/admin/DashboardParts.js';
import { UserActionSheet } from '../components/admin/UserActionSheet.js';
import { UserBadges } from '../components/admin/UserBadges.js';
import { UserTimeline } from '../components/admin/UserTimeline.js';
import { UserFormSheet } from '../components/admin/UserFormSheet.js';
import { AdminNotes } from '../components/admin/AdminNotes.js';
import { SessionList } from '../components/admin/SessionList.js';
import { activityText } from '../components/admin/userActivity.js';
import { Button } from '../components/ui/Button.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { timeAgo } from '../utils/format.js';

type Range = '30d' | 'all';
const LEAD_STAGES: [string, string][] = [['NEW', 'Khách mới'], ['CONSULTING', 'Đang tư vấn'], ['VIEWING', 'Đi xem'], ['DEPOSITED', 'Đã cọc'], ['LOST', 'Không chốt']];

const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex justify-between gap-3 py-2 border-b border-slate-100 last:border-0 text-sm">
    <dt className="text-slate-600">{label}</dt>
    <dd className="text-right text-slate-900 font-medium">{children}</dd>
  </div>
);

/** [ADMIN] Story 16.3: Hồ sơ 360° — thông tin, số liệu cá nhân (30 ngày / toàn thời gian), dòng thời gian, thao tác 13.2. */
export const AdminUserDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useApp();
  const [range, setRange] = useState<Range>('30d');
  const [data, setData] = useState<UserOverview | null>(null);
  const [error, setError] = useState<'notFound' | 'network' | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => {
    setError(null);
    userApi
      .getOverview(id, range)
      .then(setData)
      .catch((err) => setError(err.response?.status === 404 ? 'notFound' : 'network'));
  }, [id, range]);
  useEffect(load, [load]);

  // Quay lại danh sách giữ tab / ô tìm (lịch sử trình duyệt); mở thẳng link hồ sơ → về danh sách
  const back = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/admin/users'));
  const backButton = (
    <button type="button" onClick={back} className="inline-flex items-center gap-1.5 min-h-[44px] -ml-2 px-2 text-sm font-medium text-slate-600 hover:text-slate-900">
      <ArrowLeft className="w-4 h-4" aria-hidden /> Thành viên
    </button>
  );

  if (error === 'notFound') {
    return (
      <main className="max-w-3xl mx-auto px-4 pt-4 pb-app">
        {backButton}
        <EmptyState icon={UserX} title="Không tìm thấy thành viên" description="Tài khoản không tồn tại hoặc link đã sai." action={<Button onClick={() => navigate('/admin/users')}>Về danh sách</Button>} />
      </main>
    );
  }

  const user = data?.user;
  const stats = data?.stats;
  const isCtv = user?.role === 'COLLABORATOR';
  const reviewedTotal = (stats?.reviewed.APPROVED ?? 0) + (stats?.reviewed.REJECTED ?? 0);

  return (
    <main className="max-w-5xl mx-auto px-4 pt-4 pb-app space-y-3">
      {backButton}
      {error === 'network' && !data && <EmptyState icon={WifiOff} title="Không tải được hồ sơ" description="Vui lòng kiểm tra mạng rồi thử lại." action={<Button onClick={load}>Thử lại</Button>} />}
      {!data && !error && <div className="space-y-3" aria-busy="true" aria-label="Đang tải hồ sơ">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>}

      {user && stats && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h1 className="text-xl font-bold text-slate-900 break-words">{user.name}</h1>
              <UserBadges user={user} />
            </div>
            <div className="flex gap-2">
              {user.role !== 'ADMIN' && <Button variant="outline" icon={Pencil} onClick={() => setEditing(true)}>Sửa</Button>}
              <Button icon={Settings2} onClick={() => setActionsOpen(true)}>Thao tác</Button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,20rem)_1fr]">
            <DashboardSection title="Thông tin">
              <dl>
                <InfoRow label="SĐT">{user.phone}</InfoRow>
                <InfoRow label="Mã CTV">{user.ctvCode}</InfoRow>
                {user.email && <InfoRow label="Email">{user.email}</InfoRow>}
                <InfoRow label="Tham gia">{new Date(user.createdAt).toLocaleDateString('vi-VN')}</InfoRow>
                <InfoRow label="Đăng nhập cuối">{user.lastLoginAt ? timeAgo(user.lastLoginAt) : 'Chưa ghi nhận'}</InfoRow>
                <InfoRow label="Hoạt động">{activityText(user.lastActiveAt)}</InfoRow>
                <InfoRow label="Thiết bị đăng nhập">{user.activeSessions}</InfoRow>
                <InfoRow label="Điểm tín nhiệm">{user.trustScore ?? 0}{user.canReport === false ? ' · khóa báo lỗi' : ''}</InfoRow>
                <InfoRow label="Telegram">{user.telegramLinked ? 'Đã liên kết' : 'Chưa liên kết'}</InfoRow>
              </dl>
            </DashboardSection>

            <DashboardSection title="Số liệu" note="Khách hàng chỉ hiện số lượng — không xem chi tiết khách của CTV.">
              <div role="tablist" aria-label="Khoảng thời gian" className="inline-flex p-1 rounded-xl bg-slate-100">
                {(['30d', 'all'] as Range[]).map((value) => (
                  <button key={value} type="button" role="tab" aria-selected={range === value} onClick={() => setRange(value)}
                    className={`min-h-[40px] px-4 rounded-lg text-sm font-medium transition-colors duration-150 ${range === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>
                    {value === '30d' ? '30 ngày' : 'Toàn thời gian'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {isCtv ? (
                  <>
                    <StatTile label="Tin đã gửi" value={Object.values(stats.submissions).reduce((sum, n) => sum + n, 0)} />
                    <StatTile label="Tin được duyệt" value={stats.submissions.APPROVED ?? 0} />
                    <StatTile label="Tin bị từ chối" value={stats.submissions.REJECTED ?? 0} />
                    <StatTile label="Link chia sẻ" value={stats.shareLinks} />
                    <StatTile label="Lượt khách xem" value={stats.shareViews} />
                    <StatTile label="Căn chốt" value={stats.deals} />
                  </>
                ) : (
                  <>
                    <StatTile label="Căn đã tạo" value={stats.apartmentsCreated} />
                    <StatTile label="Lần sửa căn" value={stats.apartmentsUpdated} />
                    <StatTile label="Tin đã duyệt / từ chối" value={reviewedTotal} />
                  </>
                )}
                <StatTile label="Báo lỗi đúng" value={stats.reports.RESOLVED ?? 0} />
                <StatTile label="Báo lỗi bị bác" value={stats.reports.DISMISSED ?? 0} />
                <StatTile label="Lần xem SĐT chủ" value={stats.contactViews} />
              </div>
              {isCtv && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1.5">Khách theo giai đoạn</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {LEAD_STAGES.map(([stage, label]) => <StatTile key={stage} label={label} value={stats.leadsByStage[stage] ?? 0} />)}
                  </div>
                </div>
              )}
              {error === 'network' && <p role="alert" className="text-sm text-rose-700">Không tải được số liệu mới, đang hiện số liệu trước đó.</p>}
            </DashboardSection>
          </div>

          <DashboardSection title="Thiết bị đang đăng nhập" note="Đăng xuất 1 thiết bị có hiệu lực trong khoảng 30 giây; tài khoản không bị khóa.">
            <SessionList userId={id} />
          </DashboardSection>

          <DashboardSection title="Ghi chú nội bộ" note="Chỉ Admin thấy — thành viên không đọc được.">
            <AdminNotes userId={id} currentUserId={currentUser?._id} />
          </DashboardSection>

          <DashboardSection title="Dòng thời gian hoạt động">
            <UserTimeline userId={id} />
          </DashboardSection>

          {editing && <UserFormSheet mode="edit" user={user} onDone={load} onClose={() => setEditing(false)} />}
          {actionsOpen && (
            <UserActionSheet
              user={user}
              currentUserId={currentUser?._id}
              onChanged={(changed: AdminUser) => setData((current) => current && { ...current, user: { ...current.user, ...changed } })}
              onClose={() => setActionsOpen(false)}
            />
          )}
        </>
      )}
    </main>
  );
};
