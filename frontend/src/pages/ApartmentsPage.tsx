import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, authApi } from '../api/authApi.js';
import { Apartment, apartmentApi, Pagination } from '../api/apartmentApi.js';
import { Navbar } from '../components/layout/Navbar.js';
import { ApartmentCard } from '../components/apartment/ApartmentCard.js';
import { ApartmentDetailModal } from '../components/apartment/ApartmentDetailModal.js';
import { ApartmentModal } from '../components/apartment/ApartmentModal.js';
import { ApartmentFilters } from '../components/apartment/ApartmentFilters.js';
import { QuickPasteModal } from '../components/apartment/QuickPasteModal.js';
import { ProfileModal } from '../components/profile/ProfileModal.js';
import { Plus, RefreshCw, Loader2, Building, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

export const ApartmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Danh sách căn hộ & phân trang
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchDistrict, setSearchDistrict] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Modals state
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isQuickPasteOpen, setIsQuickPasteOpen] = useState(false);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await authApi.getMe();
        setCurrentUser(res.data);
      } catch (_e) {
        navigate('/login');
      }
    };
    fetchMe();
  }, [navigate]);

  const fetchApartments = async (page = 1) => {
    try {
      setLoading(true);
      const params: any = { page, limit: 12 };
      if (searchDistrict) params.district = searchDistrict;
      if (statusFilter) params.status = statusFilter;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;

      const res = await apartmentApi.getApartments(params);
      setApartments(res.items || []);
      setPagination(res.pagination || { total: 0, page: 1, limit: 12, totalPages: 1 });
    } catch (err) {
      console.error('Lỗi tải danh sách căn hộ:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApartments(1);
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApartments(1);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
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
      <Navbar user={currentUser} onOpenProfile={() => setIsProfileOpen(true)} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Bảng hàng Căn hộ cho thuê
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Tổng số <strong className="text-indigo-600">{pagination.total}</strong> căn hộ đang sẵn sàng kết nối khách
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchApartments(pagination.page)}
              title="Làm mới"
              className="p-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {isManagerOrAdmin && (
              <>
                <button
                  onClick={() => setIsQuickPasteOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs sm:text-sm font-bold rounded-xl border border-indigo-200 shadow-sm transition-all hover:scale-[1.02]"
                  title="Nhập nhanh bài đăng từ Zalo, Telegram, Facebook bằng AI"
                >
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline">Nhập nhanh AI</span>
                  <span className="sm:hidden">AI</span>
                </button>
                <button
                  onClick={() => { setEditingApartment(null); setIsModalOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all hover:scale-[1.02]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm căn hộ</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bộ lọc tìm kiếm */}
        <ApartmentFilters
          searchDistrict={searchDistrict}
          setSearchDistrict={setSearchDistrict}
          minPrice={minPrice}
          setMinPrice={setMinPrice}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          isManagerOrAdmin={Boolean(isManagerOrAdmin)}
          onSubmit={handleSearchSubmit}
        />

        {/* Lưới thẻ căn hộ */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Đang tải dữ liệu bảng hàng...</p>
          </div>
        ) : apartments.length === 0 ? (
          <div className="py-16 bg-white rounded-2xl border border-slate-200 text-center space-y-3 p-6">
            <Building className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">Chưa tìm thấy căn hộ phù hợp</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Không có căn hộ nào khớp với bộ lọc hiện tại hoặc kho hàng đang được cập nhật.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {apartments.map((apt) => (
              <ApartmentCard
                key={apt._id}
                apartment={apt}
                userRole={currentUser?.role}
                isOwnerOrAdmin={Boolean(isManagerOrAdmin)}
                onViewDetail={(item) => setSelectedApartment(item)}
                onEdit={(item) => { setEditingApartment(item); setIsModalOpen(true); }}
                onDelete={handleDeleteApartment}
              />
            ))}
          </div>
        )}

        {/* Phân trang */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchApartments(pagination.page - 1)}
              className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-600 px-3">
              Trang {pagination.page} / {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchApartments(pagination.page + 1)}
              className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      {/* Modal Chi tiết Căn hộ */}
      <ApartmentDetailModal
        apartment={selectedApartment}
        userRole={currentUser?.role}
        isOwnerOrAdmin={Boolean(isManagerOrAdmin)}
        onClose={() => setSelectedApartment(null)}
        onStatusUpdated={() => fetchApartments(pagination.page)}
      />

      {/* Modal Thêm / Sửa Căn hộ */}
      <ApartmentModal
        initialData={editingApartment}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchApartments(1)}
      />

      {/* Modal Nhập Nhanh AI */}
      <QuickPasteModal
        isOpen={isQuickPasteOpen}
        onClose={() => setIsQuickPasteOpen(false)}
        onSuccess={() => fetchApartments(1)}
      />

      {/* Modal Hồ sơ CTV */}
      <ProfileModal
        isOpen={isProfileOpen}
        user={currentUser}
        onClose={() => setIsProfileOpen(false)}
        onProfileUpdated={(updated) => setCurrentUser(updated)}
      />
    </div>
  );
};
