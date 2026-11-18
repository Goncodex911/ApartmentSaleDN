import React from 'react';
import { Check } from 'lucide-react';
import { Apartment } from '../../api/apartmentApi.js';
import { User } from '../../api/authApi.js';
import { formatVnd } from '../../utils/format.js';
import { imageCors } from '../../utils/offlineCache.js';
import { splitMedia } from '../../utils/media.js';
import { CopyShareButton } from './CopyShareButton.js';
import { beachDistanceText, roomParts, zoneText } from '../../utils/apartmentLabels.js';
import { LiveTag } from '../../hooks/useApartmentSearch.js';
import { leaseDaysLeft } from './LeaseSection.js';

export const STATUS_DISPLAY: Record<Apartment['status'], { label: string; dot: string }> = {
  AVAILABLE: { label: 'Trống', dot: 'bg-emerald-500' },
  UPCOMING: { label: 'Sắp trống', dot: 'bg-amber-500' },
  DEPOSITED: { label: 'Đã cọc', dot: 'bg-sky-500' },
  RENTED: { label: 'Đã thuê', dot: 'bg-slate-400' },
};

interface ApartmentCardProps {
  apartment: Apartment;
  currentUser: User | null;
  onOpen: (apartment: Apartment) => void;
  liveTag?: LiveTag; // Story 11.4: căn vừa đổi ở máy khác trong lúc đang xem
  // Story 11.3: chế độ chọn căn dẫn khách — bấm thẻ là tích / bỏ tích thay vì mở chi tiết
  selection?: { selected: boolean; disabledReason?: string; onToggle: () => void };
}

const LIVE_LABEL: Record<LiveTag, string> = { DEPOSITED: 'VỪA CỌC', RENTED: 'VỪA CHO THUÊ', PRICE_DROP: 'Giảm giá' };

// Thẻ căn hộ dạng danh sách gọn: ảnh nhỏ bên trái, thông tin chính bên phải. Bấm cả thẻ để xem chi tiết.
export const ApartmentCard: React.FC<ApartmentCardProps> = ({ apartment, currentUser, onOpen, liveTag, selection }) => {
  const activate = () => (selection ? !selection.disabledReason && selection.onToggle() : onOpen(apartment));
  const isGone = liveTag === 'DEPOSITED' || liveTag === 'RENTED';
  const daysLeft = apartment.status === 'RENTED' && apartment.lease ? leaseDaysLeft(apartment.lease.endDate) : null;
  const { attributes, location } = apartment;
  const photos = splitMedia(apartment).images; // Video cũ lỡ nằm trong images không làm ảnh bìa (Story 10.2)
  const thumbnail = photos.find((url) => !apartment.hiddenImages?.includes(url)) || photos[0];
  const status = STATUS_DISPLAY[apartment.status];
  const facts = [
    ...roomParts(attributes).map((part) => part.replace(' phòng ngủ', 'PN')),
    attributes.area && `${attributes.area}m²`,
    zoneText({ ...location, ward: undefined }), // Thẻ gọn: khu vực hoặc quận, không kèm phường
    apartment.minLeaseMonths && `tối thiểu ${apartment.minLeaseMonths} th`,
    // Gần biển là tiêu chí số 1 của khách Đà Nẵng → hiện ngay trên thẻ khi ≤ 2km
    attributes.distanceToBeachM != null && attributes.distanceToBeachM <= 2000 && `biển ${beachDistanceText(attributes.distanceToBeachM)}`,
    apartment.distanceKm !== undefined && `cách ${apartment.distanceKm} km`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={selection ? selection.selected : undefined}
      aria-disabled={selection?.disabledReason ? true : undefined}
      onClick={activate}
      onKeyDown={(e) => e.key === 'Enter' && activate()}
      className={`relative flex gap-3 p-3 bg-white rounded-2xl border border-slate-200 cursor-pointer hover:border-slate-300 active:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${selection?.selected ? 'border-indigo-600 ring-2 ring-indigo-600' : ''} ${selection?.disabledReason ? 'opacity-60' : ''} [&>*]:transition-[opacity,filter] [&>*]:duration-500 motion-reduce:[&>*]:transition-none ${
        isGone ? '[&>:not(span)]:opacity-50 [&>:not(span)]:grayscale' : '' // Làm mờ ảnh + nội dung, giữ nhãn rõ nét
      }`}
    >
      {isGone && (
        <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-slate-900 text-[11px] font-bold tracking-wide text-white">{LIVE_LABEL[liveTag]}</span>
      )}
      {selection && (
        <span
          aria-hidden
          className={`absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full border-2 ${selection.selected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'}`}
        >
          {selection.selected && <Check className="w-4 h-4" />}
        </span>
      )}
      {thumbnail ? (
        <img src={thumbnail} alt={apartment.title} loading="lazy" crossOrigin={imageCors(thumbnail)} className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover shrink-0 bg-slate-100" />
      ) : (
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-slate-100 shrink-0" aria-hidden />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <h3 className="text-[15px] font-semibold text-slate-900 leading-snug line-clamp-2">{apartment.title}</h3>
        <p className="mt-0.5 text-sm text-slate-500 truncate">{facts}</p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-900">
              {formatVnd(apartment.price)}
              <span className="text-xs font-normal text-slate-500">/tháng</span>
            </p>
            <p className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className={`w-2 h-2 rounded-full ${status.dot}`} aria-hidden />
              {status.label}
              {apartment.needsReview && <span className="text-amber-700 font-medium">· Cần kiểm tra</span>}
              {liveTag === 'PRICE_DROP' && <span className="text-rose-700 font-semibold">· {LIVE_LABEL.PRICE_DROP}</span>}
              {daysLeft !== null && daysLeft <= 30 && (
                // Story 11.5: căn đã thuê sắp hết hạn hợp đồng (chỉ Quản lý nhận được lease)
                <span className={`font-semibold ${daysLeft <= 0 ? 'text-rose-700' : 'text-amber-700'}`}>· {daysLeft > 0 ? `Còn ${daysLeft} ngày` : 'Hết hạn HĐ'}</span>
              )}
            </p>
          </div>
          {selection ? (
            selection.disabledReason && <span className="text-xs text-slate-500">{selection.disabledReason}</span>
          ) : (
            <CopyShareButton apartment={apartment} ctv={currentUser} compact />
          )}
        </div>
      </div>
    </article>
  );
};
