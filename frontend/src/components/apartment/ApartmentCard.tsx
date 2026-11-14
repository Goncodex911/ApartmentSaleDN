import React from 'react';
import { Apartment } from '../../api/apartmentApi.js';
import { User } from '../../api/authApi.js';
import { StatusBadge } from './StatusBadge.js';
import { CopyShareButton } from './CopyShareButton.js';
import { MapPin, Image as ImageIcon, Eye, Edit2, Trash2, ShieldCheck, PawPrint, Car, ArrowUpCircle, Navigation } from 'lucide-react';

interface ApartmentCardProps {
  apartment: Apartment;
  currentUser: User | null;
  isOwnerOrAdmin: boolean;
  onViewDetail: (apt: Apartment) => void;
  onEdit?: (apt: Apartment) => void;
  onDelete?: (id: string) => void;
}

export const ApartmentCard: React.FC<ApartmentCardProps> = ({
  apartment,
  currentUser,
  isOwnerOrAdmin,
  onViewDetail,
  onEdit,
  onDelete,
}) => {
  // Format tiền tệ VNĐ
  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
  };

  const thumbnail =
    apartment.images && apartment.images.length > 0
      ? apartment.images[0]
      : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&auto=format&fit=crop&q=80';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group">
      {/* Ảnh Thumbnail & Badges */}
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden cursor-pointer" onClick={() => onViewDetail(apartment)}>
        <img
          src={thumbnail}
          alt={apartment.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {/* Số lượng ảnh */}
        {apartment.images && apartment.images.length > 0 && (
          <span className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-sm text-white text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            {apartment.images.length}
          </span>
        )}

        {/* Hoa hồng CTV Badge */}
        {apartment.commission && apartment.commission.value > 0 && (
          <span className="absolute top-2.5 left-2.5 bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm">
            HH: {apartment.commission.type === 'PERCENT' ? `${apartment.commission.value}%` : formatPrice(apartment.commission.value)}
          </span>
        )}

        {/* Khoảng cách đến Điểm mốc (Story 4.2) */}
        {apartment.distanceKm !== undefined && (
          <span className="absolute top-2.5 right-2.5 bg-emerald-700/90 backdrop-blur-sm text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-md flex items-center gap-1">
            <Navigation className="w-3 h-3 text-white" />
            Cách {apartment.nearestLandmark || 'mốc'}: {apartment.distanceKm} km
          </span>
        )}
      </div>

      {/* Nội dung chi tiết */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Trạng thái 1-Click & Giá thuê */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <StatusBadge
              apartmentId={apartment._id}
              status={apartment.status}
              availableDate={apartment.availableDate}
              canEdit={isOwnerOrAdmin}
            />
            <div className="text-right">
              <span className="text-base font-bold text-indigo-600">{formatPrice(apartment.price)}</span>
              <span className="text-[11px] text-slate-400 block font-normal">/tháng</span>
            </div>
          </div>

          {/* Tiêu đề căn hộ */}
          <h3
            onClick={() => onViewDetail(apartment)}
            className="text-sm font-semibold text-slate-800 line-clamp-2 hover:text-indigo-600 transition-colors cursor-pointer mb-2"
          >
            {apartment.title}
          </h3>

          {/* Địa chỉ & Khoảng cách */}
          <p className="text-xs text-slate-500 flex items-center justify-between gap-1 mb-3">
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{apartment.location.district}, {apartment.location.address}</span>
            </span>
            {apartment.distanceKm !== undefined && (
              <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded ml-1">
                📍 {apartment.distanceKm} km
              </span>
            )}
          </p>

          {/* Thuộc tính & Tiện ích nổi bật */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 rounded-md">
              {apartment.attributes.bedrooms} PN
            </span>
            {apartment.attributes.area && (
              <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 rounded-md">
                {apartment.attributes.area} m²
              </span>
            )}
            {apartment.attributes.elevator && (
              <span className="px-2 py-0.5 text-[11px] font-medium bg-indigo-50 text-indigo-700 rounded-md flex items-center gap-1">
                <ArrowUpCircle className="w-3 h-3" /> Thang máy
              </span>
            )}
            {apartment.attributes.allowPets && (
              <span className="px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700 rounded-md flex items-center gap-1">
                <PawPrint className="w-3 h-3" /> Pet
              </span>
            )}
            {apartment.attributes.carParking && (
              <span className="px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 rounded-md flex items-center gap-1">
                <Car className="w-3 h-3" /> Ô tô
              </span>
            )}
            {apartment.attributes.pcccStandard && (
              <span className="px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 rounded-md flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> PCCC
              </span>
            )}
          </div>
        </div>

        {/* Chân thẻ & Nút thao tác */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
          {/* Thông tin liên hệ (che SĐT nếu là CTV) */}
          <div className="text-xs">
            <span className="text-slate-400 block text-[10px]">Chủ nhà / Đầu mối:</span>
            <span className="font-medium text-slate-700">
              {currentUser?.role === 'COLLABORATOR' ? apartment.ownerContact.phone : `${apartment.ownerContact.name} (${apartment.ownerContact.phone})`}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onViewDetail(apartment)}
              title="Xem chi tiết căn hộ"
              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
            {isOwnerOrAdmin && onEdit && (
              <button
                onClick={() => onEdit(apartment)}
                title="Chỉnh sửa căn hộ"
                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {isOwnerOrAdmin && onDelete && (
              <button
                onClick={() => onDelete(apartment._id)}
                title="Xóa căn hộ"
                className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="pt-3">
          <CopyShareButton apartment={apartment} ctv={currentUser} />
        </div>
      </div>
    </div>
  );
};

