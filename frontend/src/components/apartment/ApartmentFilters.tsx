import React from 'react';
import { Search, Filter } from 'lucide-react';

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
}

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
}) => {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Tìm theo Quận (VD: Cầu Giấy, Đống Đa, Nam Từ Liêm...)"
            value={searchDistrict}
            onChange={(e) => setSearchDistrict(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-2">
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
            <span className="hidden sm:inline">Lọc</span>
          </button>
        </div>
      </form>

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

