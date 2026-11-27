import React, { lazy, Suspense, useState } from 'react';
import { createPortal } from 'react-dom';
import { BedDouble, Bath, Check, Maximize2, Waves } from 'lucide-react';
import { Apartment } from '../../api/apartmentApi.js';
import { User } from '../../api/authApi.js';
import { formatVnd } from '../../utils/format.js';
import { imageCors } from '../../utils/offlineCache.js';
import { splitMedia } from '../../utils/media.js';
import { CopyShareButton } from './CopyShareButton.js';
import { MultiChannelSharePopover } from './MultiChannelSharePopover.js';
import { ShareLinkButton } from './ShareLinkButton.js';
import { CardPhotoCarousel } from './CardPhotoCarousel.js';
import { beachDistanceText, roomParts, zoneText } from '../../utils/apartmentLabels.js';
import { LiveTag } from '../../hooks/useApartmentSearch.js';
import { leaseDaysLeft } from './LeaseSection.js';
import { STATUS_STYLE } from '../../utils/statusStyle.js';
import { Badge } from '../ui/Badge.js';

export type CardLayout = 'card' | 'list';

const MediaLightbox = lazy(() => import('../media/MediaLightbox.js')); // Chỉ tải khi chạm ảnh lần đầu

interface ApartmentCardProps {
  apartment: Apartment;
  currentUser: User | null;
  onOpen: (apartment: Apartment) => void;
  layout?: CardLayout; // Story 12.2: thẻ ảnh lớn (mặc định) hoặc danh sách gọn
  liveTag?: LiveTag; // Story 11.4: căn vừa đổi ở máy khác trong lúc đang xem
  // Story 11.3: chế độ chọn căn dẫn khách — bấm thẻ là tích / bỏ tích thay vì mở chi tiết
  selection?: { selected: boolean; disabledReason?: string; onToggle: () => void };
}

const LIVE_LABEL: Record<LiveTag, string> = { DEPOSITED: 'VỪA CỌC', RENTED: 'VỪA CHO THUÊ', PRICE_DROP: 'Giảm giá' };
const pill = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-xs font-medium text-slate-700';

/**
 * Thẻ căn hộ (Story 12.2). Bấm cả thẻ để xem chi tiết; ở chế độ chọn căn thì bấm để tích.
 * - card: ảnh 4:3 vuốt được, giá to màu navy, nhãn thông số, nút Copy tin + Tạo link ngay trên thẻ.
 * - list: ảnh nhỏ bên trái, mật độ cao (giao diện trước Story 12.2).
 */
export const ApartmentCard: React.FC<ApartmentCardProps> = ({ apartment, currentUser, onOpen, layout = 'card', liveTag, selection }) => {
  const activate = () => (selection ? !selection.disabledReason && selection.onToggle() : onOpen(apartment));
  const isGone = liveTag === 'DEPOSITED' || liveTag === 'RENTED';
  const daysLeft = apartment.status === 'RENTED' && apartment.lease ? leaseDaysLeft(apartment.lease.endDate) : null;
  const { attributes, location } = apartment;
  const media = splitMedia(apartment); // Video cũ lỡ nằm trong images không làm ảnh bìa (Story 10.2)
  const photos = media.images.filter((url) => !apartment.hiddenImages?.includes(url)); // Bỏ ảnh có SĐT nguồn cũ
  const status = STATUS_STYLE[apartment.status];
  const zone = zoneText({ ...location, ward: undefined }); // Thẻ gọn: khu vực hoặc quận, không kèm phường
  const beachNear = attributes.distanceToBeachM != null && attributes.distanceToBeachM <= 2000; // Tiêu chí số 1 của khách Đà Nẵng
  const price = apartment.price ? formatVnd(apartment.price) : `$${apartment.priceUsd}`;
  // Story 20.8: chạm ảnh xem toàn màn hình như album Zalo; đang chọn căn lập lộ trình thì chạm ảnh vẫn là tích chọn
  const [lightboxAt, setLightboxAt] = useState<number | null>(null);
  const openPhoto = selection ? undefined : setLightboxAt;

  // Thẻ ảnh: trạng thái là huy hiệu soft (chữ đậm, nền nhạt, có viền — đọc rõ ngoài nắng, Story 12.6); danh sách gọn: chấm màu + chữ
  const statusLine = (
    <p className="flex flex-wrap items-center gap-x-1.5 text-xs font-medium text-slate-700">
      {layout === 'card' ? (
        <Badge tone={apartment.status}>{status.label}</Badge>
      ) : (
        <>
          <span className={`w-2 h-2 rounded-full ${status.dot}`} aria-hidden />
          {status.label}
        </>
      )}
      {apartment.needsReview && <span className="text-amber-800">· Cần kiểm tra</span>}
      {apartment.verification && <span className="text-amber-800 font-semibold">· Chờ xác minh</span>}
      {liveTag === 'PRICE_DROP' && <span className="text-rose-700 font-semibold">· {LIVE_LABEL.PRICE_DROP}</span>}
      {daysLeft !== null && daysLeft <= 30 && (
        // Story 11.5: căn đã thuê sắp hết hạn hợp đồng (chỉ Quản lý nhận được lease)
        <span className={`font-semibold ${daysLeft <= 0 ? 'text-rose-700' : 'text-amber-800'}`}>· {daysLeft > 0 ? `Còn ${daysLeft} ngày` : 'Hết hạn HĐ'}</span>
      )}
    </p>
  );
  const actions = selection ? (
    selection.disabledReason && <span className="text-xs text-slate-600">{selection.disabledReason}</span>
  ) : (
    <div className="flex gap-1.5 shrink-0">
      <MultiChannelSharePopover apartment={apartment} ctv={currentUser} compact />
      <CopyShareButton apartment={apartment} ctv={currentUser} compact />
      {layout === 'card' && <ShareLinkButton apartmentId={apartment._id} disabled={apartment.status === 'RENTED'} compact />}
    </div>
  );

  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={selection ? selection.selected : undefined}
      aria-disabled={selection?.disabledReason ? true : undefined}
      onClick={activate}
      onKeyDown={(e) => e.key === 'Enter' && activate()}
      className={`relative bg-white rounded-2xl border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent ${
        layout === 'card' ? 'overflow-hidden' : 'flex gap-3 p-3 active:bg-slate-50'
      } ${selection?.selected ? 'border-brand-accent ring-2 ring-brand-accent' : ''} ${selection?.disabledReason ? 'opacity-60' : ''} [&>*]:transition-[opacity,filter] [&>*]:duration-500 motion-reduce:[&>*]:transition-none ${
        isGone ? '[&>:not(span)]:opacity-50 [&>:not(span)]:grayscale' : '' // Làm mờ ảnh + nội dung, giữ nhãn rõ nét
      }`}
    >
      {isGone && (
        <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-slate-900 text-[11px] font-bold tracking-wide text-white">{LIVE_LABEL[liveTag]}</span>
      )}
      {selection && (
        <span
          aria-hidden
          className={`absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full border-2 ${selection.selected ? 'bg-brand-accent border-brand-accent text-white' : 'bg-white border-slate-300'}`}
        >
          {selection.selected && <Check className="w-4 h-4" />}
        </span>
      )}

      {layout === 'card' ? (
        <>
          <CardPhotoCarousel photos={photos} videoCount={media.videos.length} title={apartment.title} onPhotoTap={openPhoto} />
          <div className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-lg font-bold text-brand-navy leading-tight">
                {price}
                <span className="text-sm font-medium text-slate-600">/tháng</span>
              </p>
              {statusLine}
            </div>
            <h3 className="text-[15px] font-semibold text-slate-900 leading-snug line-clamp-1">{apartment.title}</h3>
            <div className="flex flex-wrap gap-1.5">
              <span className={pill}><BedDouble className="w-3.5 h-3.5" aria-hidden />{attributes.bedrooms === 0 ? 'Studio' : `${attributes.bedrooms} PN`}</span>
              {attributes.bathrooms > 0 && <span className={pill}><Bath className="w-3.5 h-3.5" aria-hidden />{attributes.bathrooms} WC</span>}
              {attributes.area && <span className={pill}><Maximize2 className="w-3.5 h-3.5" aria-hidden />{attributes.area} m²</span>}
              {beachNear && <span className={pill}><Waves className="w-3.5 h-3.5" aria-hidden />Biển {beachDistanceText(attributes.distanceToBeachM!)}</span>}
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 text-sm text-slate-600 truncate">
                {zone}
                {apartment.distanceKm !== undefined && ` · cách ${apartment.distanceKm} km`}
              </p>
              {actions}
            </div>
          </div>
        </>
      ) : (
        <>
          {photos[0] ? (
            <div className="relative shrink-0">
              <img
                src={photos[0]}
                alt={apartment.title}
                loading="lazy"
                crossOrigin={imageCors(photos[0])}
                onClick={
                  openPhoto &&
                  ((e) => {
                    e.stopPropagation();
                    openPhoto(0);
                  })
                }
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover bg-slate-100"
              />
              {photos.length > 1 && (
                <span className="absolute right-1 bottom-1 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-xs font-semibold pointer-events-none">+{photos.length - 1}</span>
              )}
            </div>
          ) : (
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-slate-100 shrink-0" aria-hidden />
          )}
          <div className="flex-1 min-w-0 flex flex-col">
            <h3 className="text-[15px] font-semibold text-slate-900 leading-snug line-clamp-2">{apartment.title}</h3>
            <p className="mt-0.5 text-sm text-slate-600 truncate">
              {[
                ...roomParts(attributes).map((part) => part.replace(' phòng ngủ', 'PN')),
                attributes.area && `${attributes.area}m²`,
                zone,
                apartment.minLeaseMonths && `tối thiểu ${apartment.minLeaseMonths} th`,
                beachNear && `biển ${beachDistanceText(attributes.distanceToBeachM!)}`,
                apartment.distanceKm !== undefined && `cách ${apartment.distanceKm} km`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <div className="mt-auto flex items-end justify-between gap-2 pt-1">
              <div className="min-w-0">
                <p className="text-base font-bold text-brand-navy">
                  {price}
                  <span className="text-xs font-normal text-slate-600">/tháng</span>
                </p>
                {statusLine}
              </div>
              {actions}
            </div>
          </div>
        </>
      )}
      {lightboxAt !== null &&
        // Portal ra body: thẻ "vừa cọc" có filter grayscale làm lệch position: fixed; chặn click lan lên thẻ (mở chi tiết)
        createPortal(
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <Suspense fallback={null}>
              <MediaLightbox items={[...photos, ...media.videos]} startIndex={lightboxAt} title={apartment.title} onClose={() => setLightboxAt(null)} />
            </Suspense>
          </div>,
          document.body
        )}
    </article>
  );
};
