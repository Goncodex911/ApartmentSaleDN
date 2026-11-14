import React from 'react';
import { RotateCcw, DollarSign, Home, CheckCircle2 } from 'lucide-react';

export interface FacetedFilterValues {
  priceRange: string;
  roomType: string;
  elevator: boolean;
  allowPets: boolean;
  carParking: boolean;
  balcony: boolean;
  pcccStandard: boolean;
}

interface FacetedFilterBarProps {
  filters: FacetedFilterValues;
  onPriceRangeChange: (val: string) => void;
  onRoomTypeChange: (val: string) => void;
  onAmenityToggle: (key: keyof Omit<FacetedFilterValues, 'priceRange' | 'roomType'>) => void;
  onResetFilters: () => void;
}

const PRICE_RANGES = [
  { id: 'under_5m', label: '< 5 triệu' },
  { id: '5m_8m', label: '5 - 8 triệu' },
  { id: '8m_12m', label: '8 - 12 triệu' },
  { id: 'above_12m', label: '> 12 triệu' },
];

const ROOM_TYPES = [
  { id: 'studio', label: '🛋️ Studio' },
  { id: '1pn', label: '🛏️ 1PN / 1N1K' },
  { id: '2pn', label: '🏡 2PN' },
  { id: 'duplex', label: '🪜 Duplex / Gác xép' },
];

const AMENITIES = [
  { key: 'elevator' as const, label: '🛗 Thang máy' },
  { key: 'allowPets' as const, label: '🐾 Nuôi Pet' },
  { key: 'carParking' as const, label: '🚗 Ô tô đỗ cửa' },
  { key: 'balcony' as const, label: '🌿 Ban công' },
  { key: 'pcccStandard' as const, label: '🛡️ PCCC chuẩn' },
];

export const FacetedFilterBar: React.FC<FacetedFilterBarProps> = ({
  filters,
  onPriceRangeChange,
  onRoomTypeChange,
  onAmenityToggle,
  onResetFilters,
}) => {
  // Đếm tổng số tiêu chí đang được áp dụng
  let activeCount = 0;
  if (filters.priceRange) activeCount++;
  if (filters.roomType) activeCount++;
  if (filters.elevator) activeCount++;
  if (filters.allowPets) activeCount++;
  if (filters.carParking) activeCount++;
  if (filters.balcony) activeCount++;
  if (filters.pcccStandard) activeCount++;

  return (
    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2.5">
      {/* Header thanh lọc nhanh & Nút reset */}
      <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
        <span className="font-bold text-slate-700 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          Lọc nhanh 1-chạm (Instant Facets):
        </span>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-lg transition-all"
            title="Xóa tất cả tiêu chí lọc"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Xóa lọc ({activeCount})</span>
          </button>
        )}
      </div>

      {/* 1. Dải Khoảng giá (Price Ranges) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
        <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 shrink-0 w-16">
          <DollarSign className="w-3.5 h-3.5" /> Giá thuê:
        </span>
        {PRICE_RANGES.map((r) => {
          const isSelected = filters.priceRange === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onPriceRangeChange(r.id)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium text-xs transition-all border ${
                isSelected
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm font-bold scale-[1.02]'
                  : 'bg-amber-50/50 text-amber-900 hover:bg-amber-100/70 border-amber-200/60'
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {/* 2. Dải Loại phòng (Room Types) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
        <span className="flex items-center gap-1 text-[11px] font-semibold text-sky-600 shrink-0 w-16">
          <Home className="w-3.5 h-3.5" /> Loại căn:
        </span>
        {ROOM_TYPES.map((t) => {
          const isSelected = filters.roomType === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onRoomTypeChange(t.id)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium text-xs transition-all border ${
                isSelected
                  ? 'bg-sky-600 text-white border-sky-700 shadow-sm font-bold scale-[1.02]'
                  : 'bg-sky-50/50 text-sky-900 hover:bg-sky-100/70 border-sky-200/60'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 3. Dải Tiện ích Hot (Hot Amenities) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 shrink-0 w-16">
          ✨ Tiện ích:
        </span>
        {AMENITIES.map((a) => {
          const isSelected = Boolean(filters[a.key]);
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => onAmenityToggle(a.key)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium text-xs transition-all border ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm font-bold scale-[1.02]'
                  : 'bg-emerald-50/50 text-emerald-900 hover:bg-emerald-100/70 border-emerald-200/60'
              }`}
            >
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

