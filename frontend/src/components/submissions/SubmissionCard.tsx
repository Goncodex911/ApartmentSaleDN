import React from 'react';
import { ListingSubmission, SubmissionStatus } from '../../api/submissionApi.js';
import { formatVnd } from '../../utils/format.js';
import { roomParts, zoneText } from '../../utils/apartmentLabels.js';
import { splitMedia } from '../../utils/media.js';

const STATUS_DISPLAY: Record<SubmissionStatus, { label: string; tone: string }> = {
  PENDING: { label: 'Chờ duyệt', tone: 'bg-amber-50 text-amber-800' },
  APPROVED: { label: 'Đã duyệt', tone: 'bg-emerald-50 text-emerald-800' },
  REJECTED: { label: 'Bị từ chối', tone: 'bg-rose-50 text-rose-700' },
  WITHDRAWN: { label: 'Đã rút', tone: 'bg-slate-100 text-slate-600' },
};

export interface SubmissionActions {
  onEdit?: () => void;
  onWithdraw?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

const actionClass = 'min-h-[44px] px-4 rounded-xl text-sm font-medium';

// Thẻ tin CTV đăng (Story 8.6): nút thao tác chỉ hiện khi tin còn Chờ duyệt
export const SubmissionCard: React.FC<{ submission: ListingSubmission; busy?: boolean } & SubmissionActions> = ({
  submission,
  busy,
  onEdit,
  onWithdraw,
  onApprove,
  onReject,
}) => {
  const { data, status } = submission;
  const cover = splitMedia(data).images[0];
  const ctv = typeof submission.ctvId === 'object' ? submission.ctvId : null;
  const display = STATUS_DISPLAY[status];
  const facts = [...roomParts(data.attributes), [data.location.street, zoneText(data.location)].filter(Boolean).join(', ')].join(' · ');
  const isPending = status === 'PENDING';

  return (
    <article className="p-3 bg-white rounded-2xl border border-slate-200 space-y-3">
      <div className="flex gap-3">
        <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-slate-100">
          {cover && <img src={cover} alt="" loading="lazy" className="w-full h-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">{data.title}</h3>
          <p className="text-sm font-bold text-slate-900">
            {formatVnd(data.price)}
            <span className="text-xs font-normal text-slate-500">/tháng</span>
          </p>
          <p className="text-xs text-slate-500 truncate">{facts}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className={`px-2 py-1 rounded-full font-medium ${display.tone}`}>{display.label}</span>
        {submission.merged && <span className="text-slate-500">Gộp vào căn có sẵn</span>}
        {ctv && <span className="text-slate-600">CTV {ctv.name} · {ctv.phone}</span>}
        <span className="text-slate-600">{new Date(submission.createdAt).toLocaleDateString('vi-VN')}</span>
      </div>
      {submission.rejectReason && <p className="p-2 rounded-lg bg-rose-50 text-sm text-rose-700">Lý do: {submission.rejectReason}</p>}

      {isPending && (onEdit || onWithdraw || onApprove || onReject) && (
        <div className="flex flex-wrap gap-2 justify-end">
          {onWithdraw && (
            <button type="button" disabled={busy} onClick={onWithdraw} className={`${actionClass} text-slate-600 hover:bg-slate-100`}>
              Rút tin
            </button>
          )}
          {onReject && (
            <button type="button" disabled={busy} onClick={onReject} className={`${actionClass} text-rose-700 hover:bg-rose-50`}>
              Từ chối
            </button>
          )}
          {onEdit && (
            <button type="button" disabled={busy} onClick={onEdit} className={`${actionClass} border border-slate-200 text-slate-700 hover:bg-slate-50`}>
              {onApprove ? 'Xem & sửa' : 'Sửa'}
            </button>
          )}
          {onApprove && (
            <button type="button" disabled={busy} onClick={onApprove} className={`${actionClass} bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60`}>
              {busy ? 'Đang duyệt...' : 'Duyệt'}
            </button>
          )}
        </div>
      )}
    </article>
  );
};
