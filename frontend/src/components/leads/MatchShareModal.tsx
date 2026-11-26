import React, { useEffect, useRef, useState } from 'react';
import { formatVnd } from '../../utils/format.js';
import { Apartment, apartmentApi } from '../../api/apartmentApi.js';
import { Lead, LeadMatch, leadApi } from '../../api/leadApi.js';
import { ScoreBadge } from './LeadMatchesSection.js';
import { User } from '../../api/authApi.js';
import { CopyShareButton } from '../apartment/CopyShareButton.js';
import { ShareLinkButton } from '../apartment/ShareLinkButton.js';
import { summarizeRequirements } from './leadStages.js';
import { MessageCircle } from 'lucide-react';
import { BottomSheet } from '../layout/BottomSheet.js';

interface MatchShareModalProps {
  apartmentId: string;
  leadId: string;
  currentUser: User | null;
  onClose: () => void;
  onShared?: (lead: Lead) => void; // Story 19.10: chi tiết khách bên dưới cập nhật ghi chú ngay
}

// Bấm thông báo ghép căn → gửi căn cho khách trong 1 chạm (Story 6.3 - AC3)
export const MatchShareModal: React.FC<MatchShareModalProps> = ({ apartmentId, leadId, currentUser, onClose, onShared }) => {
  const [data, setData] = useState<{ apartment: Apartment; lead: Lead; match: LeadMatch | null } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Story 11.1: kèm điểm phù hợp + lý do khớp (lỗi chấm điểm không chặn việc gửi căn)
    Promise.all([apartmentApi.getApartmentById(apartmentId), leadApi.getById(leadId), leadApi.getMatchScore(leadId, apartmentId).catch(() => null)])
      .then(([apartmentRes, lead, match]) => {
        setData({ apartment: apartmentRes.data, lead, match });
      })
      .catch(() => setError('Căn hộ hoặc khách hàng không còn tồn tại'));
  }, [apartmentId, leadId]);

  // Story 19.10: chỉ ghi lịch sử khách khi CTV THỰC SỰ gửi / sao chép căn (mở xem thử không ghi), tối đa 1 lần mỗi lần mở
  const noted = useRef(false);
  const recordShare = () => {
    if (noted.current || !data) return;
    noted.current = true;
    leadApi
      .addNote(leadId, `Đã gửi căn gợi ý: ${data.apartment.title}`)
      .then((lead) => onShared?.(lead))
      .catch(() => undefined);
  };

  const thumbnail = data?.apartment.images.find((url) => !data.apartment.hiddenImages?.includes(url));

  return (
    // Story 12.3: bảng trượt dùng chung (portal → chồng lên chi tiết khách đúng thứ tự)
    <BottomSheet title="Căn mới hợp với khách" onClose={onClose} showClose>
      <div className="space-y-3 text-sm">
        {error && <p className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">{error}</p>}
        {!data && !error && (
          // Story 12.5: khung chờ đúng hình (ảnh + 3 dòng + khung khách + 2 nút)
          <div className="space-y-3" aria-busy="true" aria-label="Đang tải căn">
            <div className="flex gap-3"><div className="skeleton w-20 h-20 rounded-xl shrink-0" /><div className="flex-1 space-y-2"><div className="skeleton h-4 rounded" /><div className="skeleton h-4 w-1/2 rounded" /><div className="skeleton h-3 w-1/3 rounded" /></div></div>
            <div className="skeleton h-14 rounded-xl" />
            <div className="skeleton h-11 rounded-xl" />
          </div>
        )}

        {data && (
          <>
            <div className="flex gap-3">
              {thumbnail && <img src={thumbnail} alt={data.apartment.title} className="w-20 h-20 rounded-xl object-cover shrink-0" />}
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 line-clamp-2">{data.apartment.title}</p>
                <p className="text-brand-navy font-bold">{formatVnd(data.apartment.price)}/tháng</p>
                <p className="text-xs text-slate-500">{data.apartment.location.district}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs">
              <p className="flex items-center justify-between gap-2 font-semibold text-slate-800">
                Khách: {data.lead.name}
                {data.match && data.match.score > 0 && <ScoreBadge score={data.match.score} />}
              </p>
              <p className="text-slate-600">{summarizeRequirements(data.lead.requirements) || 'Chưa có nhu cầu chi tiết'}</p>
              {!!data.match?.reasons.length && <p className="mt-1 text-emerald-800">{data.match.reasons.join(' · ')}</p>}
            </div>

            <div className="grid gap-2" onClickCapture={recordShare}>
              <CopyShareButton apartment={data.apartment} ctv={currentUser} />
              <ShareLinkButton apartmentId={data.apartment._id} />
              {data.lead.phone && (
                <a
                  href={`https://zalo.me/${data.lead.phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white"
                >
                  <MessageCircle className="w-4 h-4" /> Mở Zalo khách ({data.lead.phone})
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
};
