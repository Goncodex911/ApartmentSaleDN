import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, authApi } from '../api/authApi.js';
import { Apartment, apartmentApi } from '../api/apartmentApi.js';
import { useApartmentSearch, ApartmentFilterValues, AMENITY_KEYS, EMPTY_FILTERS, countActiveFilters } from '../hooks/useApartmentSearch.js';
import { Navbar } from '../components/layout/Navbar.js';
import { ApartmentCard } from '../components/apartment/ApartmentCard.js';
import { ApartmentDetailModal } from '../components/apartment/ApartmentDetailModal.js';
import { ApartmentModal } from '../components/apartment/ApartmentModal.js';
import { QuickPasteModal } from '../components/apartment/QuickPasteModal.js';
import { FilterSheet, PRICE_RANGES, ROOM_TYPES, AMENITIES, STATUSES } from '../components/apartment/FilterSheet.js';
import { ProfileModal } from '../components/profile/ProfileModal.js';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { propertyTypeLabel, PropertyType } from '../utils/danang.js';

// Chip các bộ lọc đang bật — bấm × để bỏ từng lọc
function activeChips(f: ApartmentFilterValues) {
  const label = (list: { id: string; label: string }[], id: string) => list.find((item) => item.id === id)?.label || id;
  const chips: { key: string; label: string; clear: Partial<ApartmentFilterValues> }[] = [];
  if (f.priceRange) chips.push({ key: 'price', label: label(PRICE_RANGES, f.priceRange), clear: { priceRange: '' } });
  if (f.roomType) chips.push({ key: 'room', label: label(ROOM_TYPES, f.roomType), clear: { roomType: '' } });
  if (f.status) chips.push({ key: 'status', label: label(STATUSES, f.status), clear: { status: '' } });
  f.zones.forEach((zone) => chips.push({ key: `zone-${zone}`, label: zone, clear: { zones: f.zones.filter((z) => z !== zone) } }));
  f.propertyTypes.forEach((type) =>
    chips.push({ key: `type-${type}`, label: propertyTypeLabel(type as PropertyType) || type, clear: { propertyTypes: f.propertyTypes.filter((t) => t !== type) } })
  );
  if (f.landmark) chips.push({ key: 'lm', label: `${f.landmarkName || 'Điểm mốc'} · ${f.radiusKm} km`, clear: { landmark: '', landmarkName: '' } });
  AMENITY_KEYS.forEach((key) => {
    if (f[key]) chips.push({ key, label: AMENITIES.find((a) => a.key === key)!.label, clear: { [key]: false } });
  });
  return chips;
}

export const ApartmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { apartments, pagination, status, query, filters, aiSummary, search, applyFilters, setPage, reload, removeApartment } =
    useApartmentSearch();
  const [searchText, setSearchText] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [editingApartment, setEditingApartment] = useState<Apartment | null | undefined>(undefined); // undefined = đóng form
  const [isQuickPasteOpen, setIsQuickPasteOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    authApi.getMe().then((res) => setCurrentUser(res.data)).catch(() => navigate('/login'));
  }, [navigate]);

  const isManager = currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN';
  const filterCount = countActiveFilters(filters);
  const chips = activeChips(filters);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Xóa căn hộ này khỏi bảng hàng?')) return;
    try {
      await apartmentApi.deleteApartment(id);
      removeApartment(id);
      setSelectedApartment(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không xóa được căn hộ');
    }
  };

  const clearSearch = () => {
    setSearchText('');
    search('');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={currentUser} onOpenProfile={() => setIsProfileOpen(true)} onLogout={() => { localStorage.clear(); navigate('/login'); }} />

      <main className="max-w-5xl mx-auto px-4 pt-4 pb-badge-safe space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Bảng hàng</h1>
            <p className="text-sm text-slate-500">{pagination.total} căn hộ</p>
          </div>
          {isManager && (
            <div className="flex items-center gap-1">
              <button onClick={() => setIsQuickPasteOpen(true)} className="h-10 px-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-200">
                Nhập nhanh
              </button>
              <button onClick={() => setEditingApartment(null)} className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
                Thêm căn
              </button>
            </div>
          )}
        </div>

        {/* 1 ô tìm kiếm (hiểu câu tự nhiên) + nút Bộ lọc */}
        <div className="flex gap-2">
          <form className="relative flex-1" onSubmit={(e) => { e.preventDefault(); search(searchText); }}>
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
            <input
              type="search"
              enterKeyHint="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="VD: studio Hải Châu dưới 6tr"
              aria-label="Tìm căn hộ"
              className="w-full h-11 pl-9 pr-9 text-base sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchText && (
              <button type="button" onClick={clearSearch} aria-label="Xóa tìm kiếm" className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
          <button
            onClick={() => setIsFilterOpen(true)}
            className={`h-11 px-3.5 flex items-center gap-1.5 rounded-xl border text-sm font-medium ${
              filterCount ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden />
            Lọc{filterCount > 0 && ` · ${filterCount}`}
          </button>
        </div>

        {(query || chips.length > 0) && (
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4">
            {query && (
              <button onClick={clearSearch} className="shrink-0 h-8 px-3 flex items-center gap-1 rounded-full bg-slate-200 text-sm text-slate-800">
                "{query}"{aiSummary && ` → ${aiSummary}`} <X className="w-3.5 h-3.5" aria-hidden />
              </button>
            )}
            {chips.map((chip) => (
              <button key={chip.key} onClick={() => applyFilters({ ...filters, ...chip.clear })} className="shrink-0 h-8 px-3 flex items-center gap-1 rounded-full bg-indigo-50 text-sm text-indigo-700">
                {chip.label} <X className="w-3.5 h-3.5" aria-hidden />
              </button>
            ))}
            {chips.length > 1 && (
              <button onClick={() => applyFilters(EMPTY_FILTERS)} className="shrink-0 h-8 px-2 text-sm text-slate-500 underline">Xóa tất cả</button>
            )}
          </div>
        )}

        {status === 'loading' ? (
          <div className="grid gap-2 lg:grid-cols-2" aria-busy="true">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-[120px] rounded-2xl bg-slate-200/70 animate-pulse" />)}
          </div>
        ) : status === 'error' ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-slate-600">Không tải được bảng hàng. Vui lòng kiểm tra mạng.</p>
            <button onClick={reload} className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold">Thử lại</button>
          </div>
        ) : apartments.length === 0 ? (
          <div className="py-12 text-center space-y-1">
            <p className="text-base font-semibold text-slate-800">Không có căn phù hợp</p>
            <p className="text-sm text-slate-500">Thử bỏ bớt bộ lọc hoặc đổi từ khóa.</p>
          </div>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {apartments.map((apt) => (
              <ApartmentCard key={apt._id} apartment={apt} currentUser={currentUser} onOpen={setSelectedApartment} />
            ))}
          </div>
        )}

        {pagination.totalPages > 1 && status === 'ready' && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)} className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm disabled:opacity-40">
              Trước
            </button>
            <span className="text-sm text-slate-600">{pagination.page} / {pagination.totalPages}</span>
            <button disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(pagination.page + 1)} className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm disabled:opacity-40">
              Sau
            </button>
          </div>
        )}
      </main>

      {isFilterOpen && (
        <FilterSheet initial={filters} isManager={isManager} onClose={() => setIsFilterOpen(false)} onApply={(next) => { applyFilters(next); setIsFilterOpen(false); }} />
      )}
      <ApartmentDetailModal
        key={selectedApartment?._id}
        apartment={selectedApartment}
        currentUser={currentUser}
        isOwnerOrAdmin={isManager}
        onClose={() => setSelectedApartment(null)}
        onStatusUpdated={reload}
        onEdit={(apt) => { setSelectedApartment(null); setEditingApartment(apt); }}
        onDelete={handleDelete}
      />
      {/* Chỉ mount modal khi mở → form reset mỗi lần mở */}
      {editingApartment !== undefined && <ApartmentModal initialData={editingApartment} onClose={() => setEditingApartment(undefined)} onSuccess={reload} />}
      {isQuickPasteOpen && <QuickPasteModal onClose={() => setIsQuickPasteOpen(false)} onSuccess={reload} />}
      {isProfileOpen && currentUser && <ProfileModal user={currentUser} onClose={() => setIsProfileOpen(false)} onProfileUpdated={setCurrentUser} />}
    </div>
  );
};
