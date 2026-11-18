import React, { useCallback, useEffect, useState } from 'react';
import { LeadMatchedApartment, leadApi } from '../../api/leadApi.js';
import { useApp } from '../layout/AppShell.js';
import { formatVnd } from '../../utils/format.js';
import { MatchShareModal } from './MatchShareModal.js';
import { ChevronRight } from 'lucide-react';

/** Huy hiệu điểm phù hợp: ≥ 90% xanh đậm, còn lại xanh nhạt (Story 11.1). */
export const ScoreBadge: React.FC<{ score: number }> = ({ score }) => (
  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${score >= 90 ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800'}`}>
    {Math.round(score)}%
  </span>
);

/** Mục "Căn phù hợp" trong chi tiết khách: căn đang trống khớp ≥ 80%, bấm để gửi khách 1 chạm. */
export const LeadMatchesSection: React.FC<{ leadId: string }> = ({ leadId }) => {
  const { user } = useApp();
  const [matches, setMatches] = useState<LeadMatchedApartment[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    setMatches(null);
    leadApi.getMatches(leadId).then(setMatches).catch(() => setFailed(true));
  }, [leadId]);
  useEffect(load, [load]);

  return (
    <section className="space-y-2" aria-busy={!matches && !failed}>
      <p className="text-xs font-bold uppercase text-slate-400">Căn phù hợp</p>
      {!matches && !failed && [0, 1].map((key) => <div key={key} className="h-16 rounded-xl bg-slate-100 animate-pulse motion-reduce:animate-none" />)}
      {failed && (
        <p className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-rose-50 text-xs text-rose-700">
          Không tải được căn phù hợp
          <button type="button" onClick={load} className="h-9 px-3 rounded-lg bg-white font-semibold">Thử lại</button>
        </p>
      )}
      {matches?.length === 0 && <p className="text-xs text-slate-500">Chưa có căn nào phù hợp từ 80%. Có căn mới hợp, bạn sẽ nhận thông báo.</p>}
      {matches?.map(({ apartment, score, reasons }) => (
        <button
          key={apartment._id}
          type="button"
          onClick={() => setOpenId(apartment._id)}
          className="w-full flex items-center gap-3 p-2 rounded-xl border border-slate-200 text-left hover:border-slate-300 active:bg-slate-50"
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 truncate">{apartment.title}</p>
            <p className="text-xs text-slate-500 truncate">{formatVnd(apartment.price)} · {reasons.join(' · ')}</p>
          </div>
          <ScoreBadge score={score} />
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
        </button>
      ))}
      {openId && <MatchShareModal apartmentId={openId} leadId={leadId} currentUser={user} onClose={() => setOpenId(null)} />}
    </section>
  );
};
