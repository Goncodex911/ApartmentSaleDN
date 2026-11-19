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
import { Search, SlidersHorizontal, X, Plus, RotateCcw, WifiOff } from 'lucide-react';
import { ListingsHeader, ListingView, readListingView, saveListingView } from '../components/apartment/ListingsHeader.js';
import { ApartmentCardSkeleton } from '../components/ui/Skeleton.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { useTourSelection } from '../hooks/useTourSelection.js';
import { TourControls } from '../components/tour/TourControls.js';
import { Button } from '../components/ui/Button.js';
import { formatVnd } from '../utils/format.js';

// Story 11.2: bản đồ + Leaflet chỉ tải khi bấm "Bản đồ" lần đầu
const MapPanel = lazy(() => import('../components/map/MapPanel.js'));

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
  const [view, setView] = useState<ListingView>(readListingView);
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

  const changeView = (next: ListingView) => {
    tapFeedback();
    setView(next);
    saveListingView(next);
  };
  // Mở chi tiết theo mã căn (ghim bản đồ, thông báo nhắc tái ký): tải đủ thông tin rồi mở hộp chi tiết dùng chung
  const openById = (id: string) =>
    apartmentApi
      .getApartmentById(id)
      .then((res) => setSelectedApartment(res.data))
      .catch(() => alert('Không mở được căn hộ, vui lòng thử lại'));
  // Story 13.3: Quản lý mở thẻ → hiện ngay dữ liệu đang có, tải nền bản chi tiết (máy chủ ghi nhật ký xem SĐT chủ nhà)
  const openApartment = (apartment: Apartment) => {
    setSelectedApartment(apartment);
    if (!isManager) return;
    apartmentApi
      .getApartmentById(apartment._id)
      .then((res) => setSelectedApartment((current) => (current?._id === apartment._id ? res.data : current)))
      .catch(() => undefined); // Mất mạng: vẫn xem bản trong danh sách
  };
  // Story 11.5: bấm thông báo nhắc tái ký → về Bảng hàng kèm mã căn cần mở
  const openApartmentId = (location.state as { openApartmentId?: string } | null)?.openApartmentId;
  useEffect(() => {
    if (!openApartmentId) return;
    navigate(location.pathname, { replace: true, state: null }); // Xoá để quay lại / tải lại không mở lần nữa
    openById(openApartmentId);
  }, [openApartmentId]); // Chỉ chạy khi có mã căn mới

  const isManager = currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN';
  const gridClass = view === 'cards' ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'grid grid-cols-1 gap-2 lg:grid-cols-2';
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
        <ListingsHeader
          total={pagination.total}
          view={view}
          onViewChange={changeView}
          tourActive={tour.active}
          onToggleTour={() => (tour.active ? tour.cancel() : tour.setActive(true))}
          role={isManager ? 'manager' : currentUser ? 'ctv' : null}
          onAdd={() => setEditingApartment(null)}
          onQuickPaste={openQuickPaste}
          onSubmit={openSubmit}
        />

        {/* 1 ô tìm kiếm (hiểu câu tự nhiên) + nút Bộ lọc */}
        <div className="flex gap-2">
          <form className="relative flex-1" onSubmit={(e) => { e.preventDefault(); search(searchText); }}>
            <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
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
              <button type="button" onClick={clearSearch} aria-label="Xóa tìm kiếm" className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
          <button
            onClick={() => setIsFilterOpen(true)}
            className={`h-11 px-3.5 flex items-center gap-1.5 rounded-xl border text-sm font-medium ${
              filterCount ? 'border-brand-accent bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden />
            Lọc{filterCount > 0 && ` · ${filterCount}`}
          </button>
        </div>

        {(query || chips.length > 0) && (
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4">
            {query && (
              <button onClick={clearSearch} className="shrink-0 h-10 px-3 flex items-center gap-1 rounded-full bg-slate-200 text-sm text-slate-800">
                "{query}"{aiSummary && ` → ${aiSummary}`} <X className="w-3.5 h-3.5" aria-hidden />
              </button>
            )}
            {chips.map((chip) => (
              <button key={chip.key} onClick={() => { tapFeedback(); applyFilters({ ...filters, ...chip.clear }); }} className="shrink-0 h-10 px-3 flex items-center gap-1 rounded-full bg-indigo-50 text-sm text-indigo-800">
                {chip.label} <X className="w-3.5 h-3.5" aria-hidden />
              </button>
            ))}
            {chips.length > 1 && (
              <button onClick={() => applyFilters(EMPTY_FILTERS)} className="shrink-0 h-10 px-2 text-sm text-slate-600 underline">Xóa tất cả</button>
            )}
          </div>
        )}

        {view === 'map' ? (
          <Suspense fallback={<div className="-mx-4 sm:mx-0 h-map bg-slate-200/70 animate-pulse motion-reduce:animate-none" aria-busy="true" />}>
            <MapPanel filters={filters} query={query} hasFilters={filterCount > 0} onClearFilters={() => applyFilters(EMPTY_FILTERS)} onOpen={openById} pinActions={tourAction} />
          </Suspense>
        ) : status === 'loading' ? (
          // Story 12.5: khung chờ đúng hình thẻ của kiểu xem đang chọn
          <div className={gridClass} aria-busy="true" aria-label="Đang tải bảng hàng">
            {[0, 1, 2, 3].map((i) => <ApartmentCardSkeleton key={i} layout={view === 'cards' ? 'card' : 'list'} />)}
          </div>
        ) : status === 'error' ? (
          <EmptyState icon={WifiOff} title="Không tải được bảng hàng" description="Vui lòng kiểm tra mạng rồi thử lại." action={<Button onClick={reload}>Thử lại</Button>} />
        ) : apartments.length === 0 ? (
          query || filterCount > 0 ? (
            <EmptyState
              title="Không tìm thấy căn hộ phù hợp với bộ lọc hiện tại"
              description="Hãy thử giảm bớt tiện ích hoặc mở rộng tầm giá / bán kính tìm kiếm."
              action={<Button icon={RotateCcw} onClick={() => { clearSearch(); applyFilters(EMPTY_FILTERS); }}>Xóa tất cả bộ lọc</Button>}
            />
          ) : (
            <EmptyState
              title="Kho chưa có căn nào"
              description={isManager ? 'Thêm căn đầu tiên để CTV bắt đầu chào khách.' : 'Tìm được căn mới? Đăng tin để Quản lý duyệt.'}
              action={isManager ? <Button icon={Plus} onClick={() => setEditingApartment(null)}>Thêm căn</Button> : <Button icon={Plus} onClick={openSubmit}>Đăng tin</Button>}
            />
          )
        ) : (
          <div className={gridClass}>
            {apartments.map((apt) => (
              <ApartmentCard
                key={apt._id}
                apartment={apt}
                currentUser={currentUser}
                onOpen={openApartment}
                layout={view === 'cards' ? 'card' : 'list'}
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

        {view !== 'map' && pagination.totalPages > 1 && status === 'ready' && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)}>Trước</Button>
            <span className="text-sm text-slate-700">{pagination.page} / {pagination.totalPages}</span>
            <Button variant="outline" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(pagination.page + 1)}>Sau</Button>
          </div>
        )}
        {tour.active && view !== 'map' && <div className="h-16" aria-hidden />}
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
