import React, { useState } from 'react';
import { Apartment } from '../../api/apartmentApi.js';
import { User } from '../../api/authApi.js';
import { StatusBadge } from './StatusBadge.js';
import { CopyShareButton } from './CopyShareButton.js';
import { DownloadPhotosButton } from './DownloadPhotosButton.js';
import { ShareLinkButton } from './ShareLinkButton.js';
import { X, MapPin, Phone, Sparkles, Layers } from 'lucide-react';

interface ApartmentDetailModalProps {
  apartment: Apartment | null;
  currentUser: User | null;
  isOwnerOrAdmin: boolean;
  onClose: () => void;
  onStatusUpdated?: (newStatus: any, newDate?: string) => void;
}

export const ApartmentDetailModal: React.FC<ApartmentDetailModalProps> = ({
  apartment,
  currentUser,
  isOwnerOrAdmin,
  onClose,
  onStatusUpdated,
}) => {
  // Hook phải gọi trước mọi lệnh return (Rules of Hooks); trang cha đặt key theo _id nên state reset khi đổi căn
  const [activeImage, setActiveImage] = useState(apartment?.images?.[0] || '');

  if (!apartment) return null;

  const formatPrice = (val?: number) => {
    if (!val) return '0 đ';
    return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
  };

  const isCtv = currentUser?.role === 'COLLABORATOR';
  const visibleImageCount = apartment.images.filter((url) => !apartment.hiddenImages?.includes(url)).length;
  const hiddenImageCount = apartment.images.length - visibleImageCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95">
        {/* Header Modal */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <StatusBadge
              apartmentId={apartment._id}
              status={apartment.status}
              availableDate={apartment.availableDate}
              canEdit={isOwnerOrAdmin}
              onStatusUpdated={onStatusUpdated}
            />
            {apartment.commission && apartment.commission.value > 0 && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                Hoa hồng: {apartment.commission.type === 'PERCENT' ? `${apartment.commission.value}%` : formatPrice(apartment.commission.value)}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung chi tiết */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Tiêu đề & Địa chỉ */}
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">{apartment.title}</h2>
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{apartment.location.address}, {apartment.location.ward ? `${apartment.location.ward}, ` : ''}{apartment.location.district}, {apartment.location.city}</span>
            </p>
            {/* Chia sẻ 1-Click cho CTV (Epic 5): copy tin, tải ảnh watermark, link xem phòng */}
            <div key={apartment._id} className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <CopyShareButton apartment={apartment} ctv={currentUser} />
              <DownloadPhotosButton apartmentId={apartment._id} photoCount={visibleImageCount} />
              <ShareLinkButton apartmentId={apartment._id} disabled={apartment.status === 'RENTED'} />
            </div>
            {hiddenImageCount > 0 && (
              <p className="mt-1.5 text-[11px] text-amber-700">🔒 Đã ẩn {hiddenImageCount} ảnh có SĐT nguồn cũ khi gửi khách</p>
            )}
          </div>

          {/* Thư viện Ảnh (Cloudinary Gallery) */}
          {apartment.images && apartment.images.length > 0 && (
            <div className="space-y-2">
              <div className="aspect-[16/9] w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                <img
                  src={activeImage || apartment.images[0]}
                  alt="Ảnh căn hộ"
                  className="w-full h-full object-cover"
                />
              </div>
              {apartment.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {apartment.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(img)}
                      className={`relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                        activeImage === img ? 'border-indigo-600 scale-95 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bảng Giá & Phí Dịch Vụ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Giá thuê</span>
              <span className="text-sm font-bold text-indigo-600">{formatPrice(apartment.price)}/tháng</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Tiền cọc</span>
              <span className="text-sm font-semibold text-slate-700">{formatPrice(apartment.deposit)}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Tiền điện</span>
              <span className="font-semibold text-slate-700">{apartment.fees?.electricity ? `${formatPrice(apartment.fees.electricity)}/kWh` : 'Chưa rõ'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Tiền nước</span>
              <span className="font-semibold text-slate-700">{apartment.fees?.water ? `${formatPrice(apartment.fees.water)}/khối` : 'Chưa rõ'}</span>
            </div>
          </div>

          {/* Tiện ích phòng */}
          <div>
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Tiện ích căn hộ
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                Phòng: <strong>{apartment.attributes.bedrooms} PN, {apartment.attributes.bathrooms} WC</strong>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                Nội thất: <strong>{apartment.attributes.furnishing === 'FULL' ? 'Full đồ' : apartment.attributes.furnishing === 'BASIC' ? 'Đồ cơ bản' : 'Trống'}</strong>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                Thang máy: <strong>{apartment.attributes.elevator ? 'Có' : 'Không'}</strong>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                Nuôi Pet: <strong>{apartment.attributes.allowPets ? 'Cho phép' : 'Không'}</strong>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                Chỗ đỗ ô tô: <strong>{apartment.attributes.carParking ? 'Đỗ cửa' : 'Không'}</strong>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                PCCC chuẩn: <strong>{apartment.attributes.pcccStandard ? 'Đạt chuẩn' : 'Chưa xác minh'}</strong>
              </div>
            </div>
          </div>

          {/* Mô tả chi tiết */}
          {apartment.description && (
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1">Mô tả</h4>
              <p className="text-xs sm:text-sm text-slate-600 whitespace-pre-line leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                {apartment.description}
              </p>
            </div>
          )}

          {/* Thông tin Chủ Nhà & Bảo vệ SĐT cho CTV (Story 1.2) */}
          <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-1.5">
            <h4 className="text-xs font-bold uppercase text-indigo-800 tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-indigo-600" />
              Thông tin Chủ Nhà / Đầu mối
            </h4>
            <div className="text-xs space-y-1">
              <p className="text-slate-700">
                Tên chủ: <strong>{apartment.ownerContact.name}</strong>
              </p>
              <p className="text-slate-700">
                Số điện thoại: <strong className="text-indigo-600">{apartment.ownerContact.phone}</strong>
                {isCtv && <span className="ml-2 text-[11px] text-amber-700 font-medium">(Đã bảo vệ số liên hệ cho CTV)</span>}
              </p>
              {!isCtv && apartment.ownerContact.note && (
                <p className="text-xs text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200 mt-2">
                  🔒 Ghi chú riêng: {apartment.ownerContact.note}
                </p>
              )}
            </div>
          </div>

          {/* Các nguồn tham chiếu (Sub-listings - Story 2.3) */}
          {apartment.subListings && apartment.subListings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-600" /> Các nguồn đăng gom chung ({apartment.subListings.length} nguồn)
              </h4>
              <div className="space-y-1.5">
                {apartment.subListings.map((sub, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-slate-800">[{sub.sourceType}] {sub.sourceName || 'Nguồn tham chiếu'}</span>
                      <p className="text-slate-500 text-[11px]">SĐT: {sub.ownerContact?.phone || 'Chưa rõ'}</p>
                    </div>
                    <span className="font-bold text-sky-600">{formatPrice(sub.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

