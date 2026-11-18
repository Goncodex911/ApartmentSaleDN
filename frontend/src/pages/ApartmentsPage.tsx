import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../components/layout/AppShell.js';
import { PullIndicator } from '../components/layout/PullIndicator.js';
import { usePullToRefresh } from '../hooks/usePullToRefresh.js';
import { tapFeedback } from '../utils/haptics.js';
import { Apartment, MapPin, apartmentApi } from '../api/apartmentApi.js';
import { useApartmentSearch, EMPTY_FILTERS, countActiveFilters } from '../hooks/useApartmentSearch.js';
import { activeChips } from '../components/apartment/filterChips.js';
import { ApartmentCard } from '../components/apartment/ApartmentCard.js';
import { ApartmentDetailModal } from '../components/apartment/ApartmentDetailModal.js';
import { ApartmentModal } from '../components/apartment/ApartmentModal.js';
import { FilterSheet } from '../components/apartment/FilterSheet.js';
import { Search, SlidersHorizontal, X, List, Map as MapIcon, Route } from 'lucide-react';
import { useTourSelection } from '../hooks/useTourSelection.js';
import { TourControls } from '../components/tour/TourControls.js';
import { formatVnd } from '../utils/format.js';

// Story 11.2: bản đồ + Leaflet chỉ tải khi bấm "Bản đồ" lần đầu
const MapPanel = lazy(() => import('../components/map/MapPanel.js'));
type View = 'list' | 'map';
const VIEW_KEY = 'apartments.view';
const readView = (): View => {
  try {
    return sessionStorage.getItem(VIEW_KEY) === 'map' ? 'map' : 'list';
  } catch {
    return 'list';
  }
};

export const ApartmentsPage: React.FC = () => {
  const { user: currentUser, openQuickPaste, openSubmit } = useApp(); // AppShell: người dùng + hộp Nhập tin AI / Đăng tin dùng chung
  const { apartments, liveTags, pagination, status, query, filters, aiSummary, search, applyFilters, setPage, reload, removeApartment } =
    useApartmentSearch();
  const pullState = usePullToRefresh(reload); // Story 9.4: kéo xuống ở đầu trang để tải lại (app đã cài)
  const location = useLocation();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [editingApartment, setEditingApartment] = useState<Apartment | null | undefined>(undefined); // undefined = đóng form
  const [view, setView] = useState<View>(readView);
  const tour = useTourSelection(); // Story 11.3: chọn căn dẫn khách (dùng chung danh sách & bản đồ)

  const pickForTour = (id: string, label: string) => {
    tapFeedback();
    if (!tour.toggle({ id, label })) alert('Tối đa 4 căn mỗi lộ trình');
  };
  const tourAction = (pin: MapPin) => (
    <button
      type="button"
      onClick={() => pickForTour(pin._id, formatVnd(pin.price))}
      className="w-full h-11 rounded-xl border border-indigo-200 bg-indigo-50 text-sm font-semibold text-indigo-700"
    >
      {tour.isPicked(pin._id) ? 'Bỏ khỏi lộ trình' : 'Thêm vào lộ trình'}
    </button>
  );

  const changeView = (next: View) => {
    tapFeedback();
    setView(next);
    try {
      sessionStorage.setItem(VIEW_KEY, next);
    } catch {
      /* Trình duyệt chặn lưu trữ → chỉ nhớ trong lần mở này */
    }
  };
  // Mở chi tiết theo mã căn (ghim bản đồ, thông báo nhắc tái ký): tải đủ thông tin rồi mở hộp chi tiết dùng chung
  const openById = (id: string) =>
    apartmentApi
      .getApartmentById(id)
      .then((res) => setSelectedApartment(res.data))
      .catch(() => alert('Không mở được căn hộ, vui lòng thử lại'));
  // Story 11.5: bấm thông báo nhắc tái ký → về Bảng hàng kèm mã căn cần mở
  const openApartmentId = (location.state as { openApartmentId?: string } | null)?.openApartmentId;
  useEffect(() => {
    if (!openApartmentId) return;
    navigate(location.pathname, { replace: true, state: null }); // Xoá để quay lại / tải lại không mở lần nữa
    openById(openApartmentId);
  }, [openApartmentId]); // Chỉ chạy khi có mã căn mới

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
    <>
      <PullIndicator {...pullState} />
      {/* --map-extra: hàng chip lọc chiếm thêm 44px → bản đồ thấp lại tương ứng (index.css .h-map) */}
      <main className="max-w-5xl mx-auto px-4 pt-4 pb-app space-y-3" style={{ '--map-extra': query || chips.length ? '44px' : '0px' } as React.CSSProperties}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900">Bảng hàng</h1>
            <p className="text-sm text-slate-500">{pagination.total} căn hộ</p>
          </div>
          <button
            type="button"
            aria-pressed={tour.active}
            aria-label="Chọn căn dẫn khách"
            title="Lộ trình dẫn khách"
            onClick={() => (tour.active ? tour.cancel() : tour.setActive(true))}
            className={`ml-auto w-11 h-11 shrink-0 flex items-center justify-center rounded-xl border transition-colors ${tour.active ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            <Route className="w-5 h-5" aria-hidden />
          </button>
          <div role="group" aria-label="Kiểu xem" className="flex p-1 rounded-xl bg-slate-200/70">
            {([['list', List, 'Danh sách'], ['map', MapIcon, 'Bản đồ']] as const).map(([key, Icon, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={view === key}
                aria-label={label}
                title={label}
                onClick={() => changeView(key)}
                className={`w-11 h-9 flex items-center justify-center rounded-lg transition-colors ${view === key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
              >
                <Icon className="w-5 h-5" aria-hidden />
              </button>
            ))}
          </div>
          {currentUser && !isManager && (
            // Điện thoại đã có nút Đăng tin ở menu đáy (Story 9.3)
            <button onClick={openSubmit} className="hidden md:block h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
              Đăng tin
            </button>
          )}
          {isManager && (
            <div className="flex items-center gap-1">
              <button onClick={openQuickPaste} className="hidden md:block h-10 px-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-200">
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
              <button key={chip.key} onClick={() => { tapFeedback(); applyFilters({ ...filters, ...chip.clear }); }} className="shrink-0 h-8 px-3 flex items-center gap-1 rounded-full bg-indigo-50 text-sm text-indigo-700">
                {chip.label} <X className="w-3.5 h-3.5" aria-hidden />
              </button>
            ))}
            {chips.length > 1 && (
              <button onClick={() => applyFilters(EMPTY_FILTERS)} className="shrink-0 h-8 px-2 text-sm text-slate-500 underline">Xóa tất cả</button>
            )}
          </div>
        )}

        {view === 'map' ? (
          <Suspense fallback={<div className="-mx-4 sm:mx-0 h-map bg-slate-200/70 animate-pulse motion-reduce:animate-none" aria-busy="true" />}>
            <MapPanel filters={filters} query={query} hasFilters={filterCount > 0} onClearFilters={() => applyFilters(EMPTY_FILTERS)} onOpen={openById} pinActions={tourAction} />
          </Suspense>
        ) : status === 'loading' ? (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2" aria-busy="true">
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
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {apartments.map((apt) => (
              <ApartmentCard
                key={apt._id}
                apartment={apt}
                currentUser={currentUser}
                onOpen={setSelectedApartment}
                liveTag={liveTags[apt._id]}
                selection={
                  tour.active
                    ? {
                        selected: tour.isPicked(apt._id),
                        disabledReason: apt.location.coordinates?.length === 2 ? undefined : 'Chưa có vị trí',
                        onToggle: () => pickForTour(apt._id, formatVnd(apt.price)),
                      }
                    : undefined
                }
              />
            ))}
          </div>
        )}

        {view === 'list' && pagination.totalPages > 1 && status === 'ready' && (
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
        {tour.active && view === 'list' && <div className="h-16" aria-hidden />}
      </main>

      <TourControls tour={tour} />

      {isFilterOpen && (
        <FilterSheet initial={filters} isManager={isManager} onClose={() => setIsFilterOpen(false)} onApply={(next) => { applyFilters(next); setIsFilterOpen(false); }} />
      )}
      <ApartmentDetailModal
        key={selectedApartment?._id}
        // Lấy bản mới nhất trong danh sách → chi tiết đang mở cũng đổi trạng thái / giá theo thời gian thực (Story 11.4)
        apartment={selectedApartment && (apartments.find((item) => item._id === selectedApartment._id) || selectedApartment)}
        currentUser={currentUser}
        isOwnerOrAdmin={isManager}
        onClose={() => setSelectedApartment(null)}
        onStatusUpdated={reload}
        onEdit={(apt) => { setSelectedApartment(null); setEditingApartment(apt); }}
        onDelete={handleDelete}
      />
      {/* Chỉ mount modal khi mở → form reset mỗi lần mở */}
      {editingApartment !== undefined && <ApartmentModal initialData={editingApartment} onClose={() => setEditingApartment(undefined)} onSuccess={reload} />}
    </>
  );
};
