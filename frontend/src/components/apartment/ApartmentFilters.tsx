import React from 'react';
import { Search, Filter, Sparkles, MapPin, X } from 'lucide-react';

interface ApartmentFiltersProps {
  searchDistrict: string;
  setSearchDistrict: (val: string) => void;
  minPrice: string;
  setMinPrice: (val: string) => void;
  maxPrice: string;
  setMaxPrice: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  isManagerOrAdmin: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSlangClick?: (slang: string) => void;
  onNaturalSearch?: () => void;
  selectedLandmark?: string;
  onSelectLandmark?: (landmarkId: string) => void;
  radiusKm?: string;
  onSelectRadius?: (radius: string) => void;
  onClearLandmark?: () => void;
}

const COMMON_SLANGS = [
  { label: '⚡ 1N1K', value: '1n1k' },
  { label: '🏢 CCMN', value: 'ccmn' },
  { label: '✨ Full đồ', value: 'full đồ' },
  { label: '🐾 Nuôi Pet', value: 'pet' },
  { label: '🛗 Thang máy', value: 'thang máy' },
  { label: '🚗 Ô tô đỗ cửa', value: 'ô tô' },
  { label: '🛏️ 2N1K', value: '2n1k' },
];

const POPULAR_LANDMARKS = [
  { id: 'dhqg', label: '🎓 ĐH Quốc Gia' },
  { id: 'hust', label: '🎓 Bách Khoa' },
  { id: 'dhtm', label: '🎓 ĐH Thương Mại' },
  { id: 'ftu', label: '🎓 Ngoại Thương' },
  { id: 'neu', label: '🎓 KTQD (NEU)' },
  { id: 'keangnam', label: '🏢 Keangnam 72' },
  { id: 'lotte', label: '🏢 Lotte Liễu Giai' },
  { id: 'ho_guom', label: '🌳 Hồ Gươm' },
];

const RADIUS_OPTIONS = ['1', '2', '3', '5'];

export const ApartmentFilters: React.FC<ApartmentFiltersProps> = ({
  searchDistrict,
  setSearchDistrict,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  statusFilter,
  setStatusFilter,
  isManagerOrAdmin,
  onSubmit,
  onSlangClick,
  onNaturalSearch,
  selectedLandmark,
  onSelectLandmark,
  radiusKm = '2',
  onSelectRadius,
  onClearLandmark,
}) => {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Gõ hoặc dán tin nhắn khách (VD: 1n1k Cầu Giấy tầm 7tr quay đầu thang máy)..."
            value={searchDistrict}
            onChange={(e) => setSearchDistrict(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-2">
          {onNaturalSearch && (
            <button
              type="button"
              onClick={onNaturalSearch}
              className="px-3 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-1 shrink-0"
              title="Tìm kiếm thông minh bằng câu tự nhiên AI"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="hidden sm:inline">AI Tìm</span>
            </button>
          )}
          <input
            type="number"
            placeholder="Giá từ (đ)"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-28 sm:w-32 px-3 py-2.5 text-xs sm:text-sm border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="number"
            placeholder="Giá đến (đ)"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-28 sm:w-32 px-3 py-2.5 text-xs sm:text-sm border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Tìm</span>
          </button>
        </div>
      </form>

      {/* Gợi ý tiếng lóng BĐS 1-chạm */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-slate-500">
        <span className="flex items-center gap-1 text-indigo-600 font-semibold shrink-0">
          <Sparkles className="w-3.5 h-3.5" /> Gợi ý:
        </span>
        {COMMON_SLANGS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onSlangClick && onSlangClick(s.value)}
            className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg whitespace-nowrap font-medium transition-colors border border-slate-200/60"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Tìm kiếm theo Điểm mốc & Bán kính (Story 4.2) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] pt-1 border-t border-slate-100">
        <span className="flex items-center gap-1 text-emerald-600 font-semibold shrink-0">
          <MapPin className="w-3.5 h-3.5" /> Điểm mốc:
        </span>
        {POPULAR_LANDMARKS.map((lm) => {
          const isSelected = selectedLandmark === lm.id;
          return (
            <button
              key={lm.id}
              type="button"
              onClick={() => onSelectLandmark && onSelectLandmark(lm.id)}
              className={`px-2.5 py-1 rounded-lg whitespace-nowrap font-medium transition-colors border ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100/80 border-emerald-200/60'
              }`}
            >
              {lm.label}
            </button>
          );
        })}
      </div>

      {/* Bộ chọn bán kính 1-tap khi đã chọn điểm mốc */}
      {selectedLandmark && (
        <div className="flex items-center justify-between bg-emerald-50/50 p-2 rounded-xl border border-emerald-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-emerald-800">Bán kính quanh điểm mốc:</span>
            <div className="flex gap-1.5">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onSelectRadius && onSelectRadius(r)}
                  className={`px-2.5 py-0.5 rounded-md font-bold text-xs transition-colors ${
                    radiusKm === r
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onClearLandmark}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-rose-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Bỏ chọn mốc
          </button>
        </div>
      )}

      {/* Tag lọc trạng thái nhanh */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
            statusFilter === '' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Tất cả phòng
        </button>
        <button
          onClick={() => setStatusFilter('AVAILABLE')}
          className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
            statusFilter === 'AVAILABLE' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          Trống ở ngay
        </button>
        <button
          onClick={() => setStatusFilter('UPCOMING')}
          className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
            statusFilter === 'UPCOMING' ? 'bg-sky-600 text-white shadow-sm' : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
          }`}
        >
          Sắp trống
        </button>
        <button
          onClick={() => setStatusFilter('DEPOSITED')}
          className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
            statusFilter === 'DEPOSITED' ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          }`}
        >
          Đang giữ cọc
        </button>
        {isManagerOrAdmin && (
          <button
            onClick={() => setStatusFilter('RENTED')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'RENTED' ? 'bg-slate-700 text-white shadow-sm' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            Đã cho thuê
          </button>
        )}
      </div>
    </div>
  );
};
