import React from 'react';
import { Apartment } from '../../api/apartmentApi.js';
import { User } from '../../api/authApi.js';
import { formatVnd } from '../../utils/format.js';
import { imageCors } from '../../utils/offlineCache.js';
import { CopyShareButton } from './CopyShareButton.js';
import { beachDistanceText, roomParts, zoneText } from '../../utils/apartmentLabels.js';

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
}

// Thẻ căn hộ dạng danh sách gọn: ảnh nhỏ bên trái, thông tin chính bên phải. Bấm cả thẻ để xem chi tiết.
export const ApartmentCard: React.FC<ApartmentCardProps> = ({ apartment, currentUser, onOpen }) => {
  const { attributes, location } = apartment;
  const thumbnail = apartment.images.find((url) => !apartment.hiddenImages?.includes(url)) || apartment.images[0];
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
      onClick={() => onOpen(apartment)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(apartment)}
      className="flex gap-3 p-3 bg-white rounded-2xl border border-slate-200 cursor-pointer hover:border-slate-300 active:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
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
            </p>
          </div>
          <CopyShareButton apartment={apartment} ctv={currentUser} compact />
        </div>
      </div>
    </article>
  );
};
