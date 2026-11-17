import React, { useState } from 'react';
import { formatVnd } from '../../utils/format.js';
import { imageCors } from '../../utils/offlineCache.js';
import { Apartment } from '../../api/apartmentApi.js';
import { User } from '../../api/authApi.js';
import { StatusBadge } from './StatusBadge.js';
import { CopyShareButton } from './CopyShareButton.js';
import { DownloadPhotosButton } from './DownloadPhotosButton.js';
import { ShareLinkButton } from './ShareLinkButton.js';
import { ShareLangToggle } from './ShareLangToggle.js';
import { Lang, getShareLang, setShareLang } from '../../utils/shareLang.js';
import { X, MapPin } from 'lucide-react';
import { marketLabels, roomParts, usdText, zoneText } from '../../utils/apartmentLabels.js';
import { amenityLabels } from '../../utils/amenities.js';

interface ApartmentDetailModalProps {
  apartment: Apartment | null;
  currentUser: User | null;
  isOwnerOrAdmin: boolean;
  onClose: () => void;
  onStatusUpdated?: (newStatus: any, newDate?: string) => void;
  onEdit?: (apartment: Apartment) => void; // Quản lý/Admin: sửa & xóa (đã chuyển từ thẻ danh sách vào đây)
  onDelete?: (apartmentId: string) => void;
}

const FURNISHING_LABEL = { FULL: 'Full đồ', BASIC: 'Đồ cơ bản', EMPTY: 'Nhà trống' } as const;

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-sm font-semibold text-slate-900 mb-2">{children}</h3>
);

// Chi tiết căn hộ: toàn màn hình trên điện thoại, hộp thoại trên máy tính. Nút chia sẻ ghim ở cuối.
export const ApartmentDetailModal: React.FC<ApartmentDetailModalProps> = ({
  apartment,
  currentUser,
  isOwnerOrAdmin,
  onClose,
  onStatusUpdated,
  onEdit,
  onDelete,
}) => {
  // Hook phải gọi trước mọi lệnh return (Rules of Hooks); trang cha đặt key theo _id nên state reset khi đổi căn
  const [activeImage, setActiveImage] = useState(apartment?.images?.[0] || '');
  const [shareLang, setShareLangState] = useState<Lang>(getShareLang); // Story 7.3: nhớ lựa chọn cho lần sau
  if (!apartment) return null;

  const { attributes, fees, location, ownerContact } = apartment;
  const isCtv = currentUser?.role === 'COLLABORATOR';
  const visibleImageCount = apartment.images.filter((url) => !apartment.hiddenImages?.includes(url)).length;
  const hiddenImageCount = apartment.images.length - visibleImageCount;

  const facts = [
    ...roomParts(attributes),
    `${attributes.bathrooms} WC`,
    attributes.area && `${attributes.area}m²`,
    FURNISHING_LABEL[attributes.furnishing],
    ...amenityLabels(apartment), // Story 8.5: tên tiếng Anh từ danh mục chung
    ...marketLabels(apartment),
  ].filter(Boolean) as string[];
  const feeText = [
    fees?.electricity && `Điện ${formatVnd(fees.electricity)}/kWh`,
    fees?.water && `Nước ${formatVnd(fees.water)}`,
    fees?.service && `Dịch vụ ${formatVnd(fees.service)}/tháng`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4 bg-black/50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full sm:h-auto sm:max-h-[90vh] w-full sm:max-w-2xl flex flex-col bg-white sm:rounded-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2 px-2 h-14 border-b border-slate-100 shrink-0">
          <button onClick={onClose} aria-label="Đóng" className="p-2.5 text-slate-500 hover:text-slate-800">
            <X className="w-5 h-5" />
          </button>
          {isOwnerOrAdmin && (
            <div className="flex items-center">
              {onEdit && (
                <button onClick={() => onEdit(apartment)} className="h-10 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100">Sửa</button>
              )}
              {onDelete && (
                <button onClick={() => onDelete(apartment._id)} className="h-10 px-3 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50">Xóa</button>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {apartment.images.length > 0 && (
            <div className="bg-slate-100">
              <img src={activeImage || apartment.images[0]} alt={apartment.title} crossOrigin={imageCors(activeImage || apartment.images[0])} className="w-full aspect-[4/3] object-cover" />
              {apartment.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto scrollbar-none p-2 bg-white">
                  {apartment.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(img)}
                      aria-label={`Ảnh ${idx + 1}`}
                      className={`w-14 h-14 shrink-0 rounded-lg overflow-hidden ring-2 ${activeImage === img ? 'ring-indigo-600' : 'ring-transparent opacity-70'}`}
                    >
                      <img src={img} alt="" crossOrigin={imageCors(img)} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="p-4 space-y-5">
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-slate-900 leading-snug">{apartment.title}</h2>
              <p className="text-sm text-slate-500">
                {/* Nội bộ: địa chỉ đủ số nhà; Set bỏ tên trùng (khu vực "Ngũ Hành Sơn" = quận Ngũ Hành Sơn) */}
                {[...new Set([location.address, zoneText(location), location.district, location.city].filter(Boolean))].join(', ')}
              </p>
              {/* Link map nội bộ (Story 8.3): mở app Google Maps để dẫn khách xem phòng */}
              {location.mapUrl && (
                <a
                  href={location.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl border border-slate-200 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                >
                  <MapPin className="w-4 h-4" aria-hidden />
                  Mở bản đồ
                </a>
              )}
              <div className="flex items-center gap-2 pt-1">
                <StatusBadge
                  apartmentId={apartment._id}
                  status={apartment.status}
                  availableDate={apartment.availableDate}
                  canEdit={isOwnerOrAdmin}
                  onStatusUpdated={onStatusUpdated}
                />
              </div>
            </div>

            {apartment.needsReview && (
              <p className="px-3 py-2 rounded-xl bg-amber-50 text-sm text-amber-800">
                Cần kiểm tra: {apartment.reviewReason || 'AI chưa chắc chắn thông tin của tin này'}. Bấm Sửa rồi Lưu để xác nhận.
              </p>
            )}

            <div>
              <p className="text-2xl font-bold text-slate-900">
                {formatVnd(apartment.price)}
                <span className="text-sm font-normal text-slate-500">/tháng</span>
                {apartment.priceUsd && <span className="ml-2 text-base font-medium text-slate-500">{usdText(apartment.priceUsd)}</span>}
              </p>
              {feeText && <p className="text-sm text-slate-500 mt-1">{feeText}</p>}
            </div>

            <div className="flex flex-wrap gap-2">
              {facts.map((fact) => (
                <span key={fact} className="px-3 py-1.5 rounded-full bg-slate-100 text-sm text-slate-700">{fact}</span>
              ))}
            </div>

            {apartment.description && (
              <div>
                <SectionTitle>Mô tả</SectionTitle>
                <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{apartment.description}</p>
              </div>
            )}

            {/* Thông tin chủ nhà — CTV chỉ thấy SĐT đã che (Story 1.2) */}
            <div>
              <SectionTitle>Chủ nhà / đầu mối</SectionTitle>
              <p className="text-sm text-slate-700">
                {ownerContact.name} · {ownerContact.phone}
                {isCtv && <span className="text-slate-500"> (đã ẩn số)</span>}
              </p>
              {!isCtv && ownerContact.note && <p className="mt-1 text-sm text-rose-700">Ghi chú riêng: {ownerContact.note}</p>}
            </div>

            {apartment.subListings && apartment.subListings.length > 0 && (
              <div>
                <SectionTitle>Nguồn đăng gom chung ({apartment.subListings.length})</SectionTitle>
                <ul className="divide-y divide-slate-100 text-sm">
                  {apartment.subListings.map((sub, idx) => (
                    <li key={idx} className="py-2 flex justify-between gap-2">
                      <span className="text-slate-700 truncate">
                        {sub.sourceName || sub.sourceType} · {sub.ownerContact?.phone || 'Chưa rõ SĐT'}
                      </span>
                      <span className="font-medium text-slate-900 shrink-0">{formatVnd(sub.price)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Chia sẻ 1-Click cho CTV (Epic 5) — ghim cuối màn hình để luôn bấm được */}
        <div key={apartment._id} className="shrink-0 border-t border-slate-100 p-3 pb-badge-safe sm:pb-3 space-y-2">
          <ShareLangToggle value={shareLang} onChange={(lang) => { setShareLang(lang); setShareLangState(lang); }} />
          <div className="grid grid-cols-3 gap-2">
            <CopyShareButton apartment={apartment} ctv={currentUser} lang={shareLang} />
            <DownloadPhotosButton apartmentId={apartment._id} photoCount={visibleImageCount} />
            <ShareLinkButton apartmentId={apartment._id} disabled={apartment.status === 'RENTED'} lang={shareLang} />
          </div>
          {hiddenImageCount > 0 && <p className="text-xs text-slate-500">Đã ẩn {hiddenImageCount} ảnh có SĐT nguồn cũ khi gửi khách</p>}
        </div>
      </div>
    </div>
  );
};
