import React, { useEffect, useState } from 'react';
import { formatVnd } from '../../utils/format.js';
import { Apartment, apartmentApi } from '../../api/apartmentApi.js';
import { Lead, leadApi } from '../../api/leadApi.js';
import { User } from '../../api/authApi.js';
import { CopyShareButton } from '../apartment/CopyShareButton.js';
import { ShareLinkButton } from '../apartment/ShareLinkButton.js';
import { summarizeRequirements } from './leadStages.js';
import { X, MessageCircle, Loader2, Sparkles } from 'lucide-react';

interface MatchShareModalProps {
  apartmentId: string;
  leadId: string;
  currentUser: User | null;
  onClose: () => void;
}

// Bấm thông báo ghép căn → gửi căn cho khách trong 1 chạm (Story 6.3 - AC3)
export const MatchShareModal: React.FC<MatchShareModalProps> = ({ apartmentId, leadId, currentUser, onClose }) => {
  const [data, setData] = useState<{ apartment: Apartment; lead: Lead } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([apartmentApi.getApartmentById(apartmentId), leadApi.getById(leadId)])
      .then(([apartmentRes, lead]) => {
        setData({ apartment: apartmentRes.data, lead });
        // Ghi lại vào lịch sử khách để CTV biết đã xem/gửi căn nào (không chặn giao diện nếu lỗi)
        leadApi.addNote(leadId, `Đã xem căn gợi ý: ${apartmentRes.data.title}`).catch(() => undefined);
      })
      .catch(() => setError('Căn hộ hoặc khách hàng không còn tồn tại'));
  }, [apartmentId, leadId]);

  const thumbnail = data?.apartment.images.find((url) => !data.apartment.hiddenImages?.includes(url));

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" /> Căn mới hợp với khách
          </h2>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <p className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">{error}</p>}
        {!data && !error && <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto my-8" />}

        {data && (
          <>
            <div className="flex gap-3">
              {thumbnail && <img src={thumbnail} alt={data.apartment.title} className="w-20 h-20 rounded-xl object-cover shrink-0" />}
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 line-clamp-2">{data.apartment.title}</p>
                <p className="text-indigo-600 font-bold">{formatVnd(data.apartment.price)}/tháng</p>
                <p className="text-xs text-slate-500">{data.apartment.location.district}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs">
              <p className="font-semibold text-slate-800">Khách: {data.lead.name}</p>
              <p className="text-slate-600">{summarizeRequirements(data.lead.requirements) || 'Chưa có nhu cầu chi tiết'}</p>
            </div>

            <div className="grid gap-2">
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
    </div>
  );
};
