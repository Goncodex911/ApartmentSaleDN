import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, authApi } from '../api/authApi.js';
import { Apartment, apartmentApi, Pagination } from '../api/apartmentApi.js';
import { Navbar } from '../components/layout/Navbar.js';
import { ApartmentCard } from '../components/apartment/ApartmentCard.js';
import { ApartmentDetailModal } from '../components/apartment/ApartmentDetailModal.js';
import { ApartmentModal } from '../components/apartment/ApartmentModal.js';
import { ApartmentFilters } from '../components/apartment/ApartmentFilters.js';
import { FacetedFilterBar, FacetedFilterValues } from '../components/apartment/FacetedFilterBar.js';
import { NaturalSearchBanner, NaturalAnalysisData } from '../components/apartment/NaturalSearchBanner.js';
import { QuickPasteModal } from '../components/apartment/QuickPasteModal.js';
import { ProfileModal } from '../components/profile/ProfileModal.js';
import { Plus, RefreshCw, Loader2, Building, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

export const ApartmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchDistrict, setSearchDistrict] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedLandmark, setSelectedLandmark] = useState('');
  const [radiusKm, setRadiusKm] = useState('2');
  const [faceted, setFaceted] = useState<FacetedFilterValues>({ priceRange: '', roomType: '', elevator: false, allowPets: false, carParking: false, balcony: false, pcccStandard: false });
  const [naturalAnalysis, setNaturalAnalysis] = useState<NaturalAnalysisData | null>(null);

  // Modals state
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isQuickPasteOpen, setIsQuickPasteOpen] = useState(false);

  useEffect(() => {
    authApi.getMe().then((res) => setCurrentUser(res.data)).catch(() => navigate('/login'));
  }, [navigate]);

  const fetchApartments = async (page = 1, overrideQ?: string, overrideLm?: string, overrideRad?: string, overrideFacets?: Partial<FacetedFilterValues>) => {
    try {
      setLoading(true);
      const qText = overrideQ !== undefined ? overrideQ : searchDistrict;
      const lmVal = overrideLm !== undefined ? overrideLm : selectedLandmark;
      const radVal = overrideRad !== undefined ? overrideRad : radiusKm;
      const f = { ...faceted, ...overrideFacets };

      const params: any = { page, limit: 12 };
      if (statusFilter) params.status = statusFilter;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;
      if (f.priceRange) params.priceRange = f.priceRange;
      if (f.roomType) params.roomType = f.roomType;
      if (f.elevator) params.elevator = true;
      if (f.allowPets) params.allowPets = true;
      if (f.carParking) params.carParking = true;
      if (f.balcony) params.balcony = true;
      if (f.pcccStandard) params.pcccStandard = true;

      const hasSpecial = (qText && qText.trim()) || lmVal || f.priceRange || f.roomType || f.elevator || f.allowPets || f.carParking || f.balcony || f.pcccStandard;
      let res;
      if (hasSpecial) {
        if (qText && qText.trim()) params.q = qText.trim();
        if (lmVal) { params.landmark = lmVal; params.radiusKm = Number(radVal) || 2; }
        res = await apartmentApi.searchApartments(params);
        setApartments(res.data || res.items || []);
      } else {
        res = await apartmentApi.getApartments(params);
        setApartments(res.items || []);
      }
      setPagination(res.pagination || { total: 0, page: 1, limit: 12, totalPages: 1 });
    } catch (err) {
      console.error('Lỗi tải danh sách căn hộ:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApartments(1); }, [statusFilter]);

  // Tìm kiếm câu tự nhiên qua AI (Story 4.4)
  const handleNaturalSearch = async () => {
    if (!searchDistrict || !searchDistrict.trim()) return;
    try {
      setLoading(true);
      const res = await apartmentApi.searchNaturalApartments(searchDistrict.trim());
      setApartments(res.data || []);
      setPagination(res.pagination || { total: 0, page: 1, limit: 12, totalPages: 1 });
      if (res.naturalAnalysis) {
        setNaturalAnalysis(res.naturalAnalysis);
        const ext = res.naturalAnalysis.extracted || {};
        setFaceted((prev) => ({
          ...prev,
          roomType: ext.roomType || prev.roomType,
          elevator: ext.elevator !== undefined ? ext.elevator : prev.elevator,
          allowPets: ext.allowPets !== undefined ? ext.allowPets : prev.allowPets,
          carParking: ext.carParking !== undefined ? ext.carParking : prev.carParking,
          balcony: ext.balcony !== undefined ? ext.balcony : prev.balcony,
        }));
        if (ext.maxPrice) setMaxPrice(String(ext.maxPrice));
        if (ext.minPrice) setMinPrice(String(ext.minPrice));
        if (ext.landmark) setSelectedLandmark(ext.landmark);
      }
    } catch (err) {
      console.error('Lỗi AI Search:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePriceRangeChange = (val: string) => {
    const next = { ...faceted, priceRange: faceted.priceRange === val ? '' : val };
    setFaceted(next);
    fetchApartments(1, undefined, undefined, undefined, next);
  };
  const handleRoomTypeChange = (val: string) => {
    const next = { ...faceted, roomType: faceted.roomType === val ? '' : val };
    setFaceted(next);
    fetchApartments(1, undefined, undefined, undefined, next);
  };
  const handleAmenityToggle = (key: keyof Omit<FacetedFilterValues, 'priceRange' | 'roomType'>) => {
    const next = { ...faceted, [key]: !faceted[key] };
    setFaceted(next);
    fetchApartments(1, undefined, undefined, undefined, next);
  };
  const handleResetFilters = () => {
    const reset = { priceRange: '', roomType: '', elevator: false, allowPets: false, carParking: false, balcony: false, pcccStandard: false };
    setFaceted(reset);
    setNaturalAnalysis(null);
    fetchApartments(1, undefined, undefined, undefined, reset);
  };

  const isManagerOrAdmin = currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN';

  const handleDeleteApartment = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa căn hộ này khỏi kho?')) return;
    try {
      await apartmentApi.deleteApartment(id);
      setApartments((prev) => prev.filter((a) => a._id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi xóa căn hộ');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={currentUser} onOpenProfile={() => setIsProfileOpen(true)} onLogout={() => { localStorage.clear(); navigate('/login'); }} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Bảng hàng Căn hộ cho thuê</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Tổng số <strong className="text-indigo-600">{pagination.total}</strong> căn hộ đang sẵn sàng kết nối khách
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchApartments(pagination.page)} title="Làm mới" className="p-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm">
              <RefreshCw className="w-4 h-4" />
            </button>
            {isManagerOrAdmin && (
              <>
                <button onClick={() => setIsQuickPasteOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs sm:text-sm font-bold rounded-xl border border-indigo-200 shadow-sm">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline">Nhập nhanh AI</span>
                </button>
                <button onClick={() => { setEditingApartment(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md">
                  <Plus className="w-4 h-4" />
                  <span>Thêm căn hộ</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Thanh tìm kiếm mờ & AI Natural Search */}
        <ApartmentFilters
          searchDistrict={searchDistrict} setSearchDistrict={setSearchDistrict}
          minPrice={minPrice} setMinPrice={setMinPrice} maxPrice={maxPrice} setMaxPrice={setMaxPrice}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          isManagerOrAdmin={Boolean(isManagerOrAdmin)}
          onSubmit={(e) => { e.preventDefault(); fetchApartments(1); }}
          onNaturalSearch={handleNaturalSearch}
          onSlangClick={(slang) => { setSearchDistrict(slang); fetchApartments(1, slang); }}
          selectedLandmark={selectedLandmark} onSelectLandmark={(id) => { setSelectedLandmark(id); fetchApartments(1, undefined, id, radiusKm); }}
          radiusKm={radiusKm} onSelectRadius={(rad) => { setRadiusKm(rad); fetchApartments(1, undefined, selectedLandmark, rad); }}
          onClearLandmark={() => { setSelectedLandmark(''); fetchApartments(1, undefined, '', radiusKm); }}
        />

        {/* Dải Banner AI đã hiểu câu tự nhiên (Story 4.4) */}
        <NaturalSearchBanner analysis={naturalAnalysis} onClear={() => setNaturalAnalysis(null)} />

        {/* Thanh lọc nhanh 1-chạm (Story 4.3) */}
        <FacetedFilterBar
          filters={faceted}
          onPriceRangeChange={handlePriceRangeChange}
          onRoomTypeChange={handleRoomTypeChange}
          onAmenityToggle={handleAmenityToggle}
          onResetFilters={handleResetFilters}
        />

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Đang tải dữ liệu bảng hàng...</p>
          </div>
        ) : apartments.length === 0 ? (
          <div className="py-16 bg-white rounded-2xl border border-slate-200 text-center space-y-3 p-6">
            <Building className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">Chưa tìm thấy căn hộ phù hợp</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Không có căn hộ nào khớp với các tiêu chí lọc hiện tại.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {apartments.map((apt) => (
              <ApartmentCard
                key={apt._id} apartment={apt} currentUser={currentUser}isOwnerOrAdmin={Boolean(isManagerOrAdmin)}
                onViewDetail={(item) => setSelectedApartment(item)}
                onEdit={(item) => { setEditingApartment(item); setIsModalOpen(true); }}
                onDelete={handleDeleteApartment}
              />
            ))}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button disabled={pagination.page <= 1} onClick={() => fetchApartments(pagination.page - 1)} className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-600 px-3">Trang {pagination.page} / {pagination.totalPages}</span>
            <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchApartments(pagination.page + 1)} className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      <ApartmentDetailModal key={selectedApartment?._id} apartment={selectedApartment}currentUser={currentUser}isOwnerOrAdmin={Boolean(isManagerOrAdmin)} onClose={() => setSelectedApartment(null)} onStatusUpdated={() => fetchApartments(pagination.page)} />
      {/* Chỉ mount modal khi mở → state form reset mỗi lần mở, tuân thủ Rules of Hooks */}
      {isModalOpen && <ApartmentModal initialData={editingApartment} onClose={() => setIsModalOpen(false)} onSuccess={() => fetchApartments(1)} />}
      {isQuickPasteOpen && <QuickPasteModal onClose={() => setIsQuickPasteOpen(false)} onSuccess={() => fetchApartments(1)} />}
      {isProfileOpen && currentUser && <ProfileModal user={currentUser} onClose={() => setIsProfileOpen(false)} onProfileUpdated={(updated) => setCurrentUser(updated)} />}
    </div>
  );
};
