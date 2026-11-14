import React, { useState } from 'react';
import { Apartment, apartmentApi } from '../../api/apartmentApi.js';
import { X, Loader2, Sparkles } from 'lucide-react';
import { PhotoUploader } from './PhotoUploader.js';

interface ApartmentModalProps {
  initialData?: Apartment | null;
  onClose: () => void;
  onSuccess: (savedApartment: Apartment) => void;
}

// Trang cha chỉ render modal khi đang mở → mỗi lần mở là một lần mount mới, form lấy lại initialData
export const ApartmentModal: React.FC<ApartmentModalProps> = ({ initialData, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState(initialData?.title || '');
  const [description] = useState(initialData?.description || '');
  const [price, setPrice] = useState(initialData?.price ? String(initialData.price) : '');
  const [deposit, setDeposit] = useState(initialData?.deposit !== undefined ? String(initialData.deposit) : '');
  const [commissionType, setCommissionType] = useState<'PERCENT' | 'FIXED'>(
    initialData?.commission?.type || 'PERCENT'
  );
  const [commissionValue, setCommissionValue] = useState(
    initialData?.commission?.value !== undefined ? String(initialData.commission.value) : '50'
  );

  // Location & Attributes
  const [address, setAddress] = useState(initialData?.location?.address || '');
  const [district, setDistrict] = useState(initialData?.location?.district || 'Cầu Giấy');
  const [area, setArea] = useState(initialData?.attributes?.area ? String(initialData.attributes.area) : '35');
  // Dùng ?? (không dùng ?:) để Studio (0 phòng ngủ) không bị đổi thành 1
  const [bedrooms, setBedrooms] = useState(String(initialData?.attributes?.bedrooms ?? 1));
  const [bathrooms, setBathrooms] = useState(String(initialData?.attributes?.bathrooms ?? 1));
  const [furnishing, setFurnishing] = useState<'FULL' | 'BASIC' | 'EMPTY'>(
    initialData?.attributes?.furnishing || 'FULL'
  );
  const [elevator, setElevator] = useState(initialData?.attributes?.elevator ?? true);
  const [allowPets, setAllowPets] = useState(initialData?.attributes?.allowPets ?? false);
  const [carParking, setCarParking] = useState(initialData?.attributes?.carParking ?? false);
  const [pcccStandard, setPcccStandard] = useState(initialData?.attributes?.pcccStandard ?? true);

  // Fees & Contact & Images
  const [electricity, setElectricity] = useState(initialData?.fees?.electricity ? String(initialData.fees.electricity) : '3800');
  const [water, setWater] = useState(initialData?.fees?.water ? String(initialData.fees.water) : '30000');
  const [serviceFee, setServiceFee] = useState(initialData?.fees?.service ? String(initialData.fees.service) : '150000');
  const [ownerName, setOwnerName] = useState(initialData?.ownerContact?.name || '');
  const [ownerPhone, setOwnerPhone] = useState(initialData?.ownerContact?.phone || '');
  const [ownerNote, setOwnerNote] = useState(initialData?.ownerContact?.note || '');
  const [images, setImages] = useState<string[]>(initialData?.images || []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title || !price || !address || !district || !ownerName || !ownerPhone) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        title,
        description,
        price: Number(price),
        deposit: Number(deposit) || 0,
        commission: { type: commissionType, value: Number(commissionValue) || 0 },
        location: { address, district, city: 'Hà Nội' },
        attributes: {
          area: Number(area) || undefined,
          bedrooms: Math.max(0, Math.trunc(Number(bedrooms)) || 0),
          bathrooms: Math.max(0, Math.trunc(Number(bathrooms)) || 0),
          furnishing,
          elevator,
          allowPets,
          carParking,
          pcccStandard,
        },
        fees: {
          electricity: Number(electricity) || undefined,
          water: Number(water) || undefined,
          service: Number(serviceFee) || undefined,
        },
        images,
        ownerContact: { name: ownerName, phone: ownerPhone, note: ownerNote },
      };

      const result = initialData?._id
        ? await apartmentApi.updateApartment(initialData._id, payload)
        : await apartmentApi.createApartment(payload);

      onSuccess(result.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu căn hộ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            {initialData ? 'Chỉnh sửa Căn hộ' : 'Thêm mới Căn hộ vào Kho'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs sm:text-sm">
          {error && <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-xl">{error}</div>}

          {/* Upload ảnh */}
          <PhotoUploader images={images} onChange={setImages} onError={setError} />

          {/* Tiêu đề & Giá */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="font-semibold text-slate-700">Tiêu đề căn hộ *</label>
              <input type="text" required placeholder="VD: Căn 1N1K Full đồ Doãn Kế Thiện" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-xl border-slate-200" />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Giá thuê (đ/tháng) *</label>
              <input type="number" required min="0" placeholder="6500000" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full px-3 py-2 border rounded-xl border-slate-200" />
            </div>
          </div>

          {/* Cọc & Hoa hồng */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Tiền cọc (VNĐ)</label>
              <input type="number" min="0" placeholder="6500000" value={deposit} onChange={(e) => setDeposit(e.target.value)} className="w-full px-3 py-2 border rounded-xl border-slate-200" />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Loại hoa hồng CTV</label>
              <select value={commissionType} onChange={(e) => setCommissionType(e.target.value as any)} className="w-full px-3 py-2 border rounded-xl border-slate-200 bg-white">
                <option value="PERCENT">Tỷ lệ % (VD: 50%)</option>
                <option value="FIXED">Số tiền cứng (VNĐ)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Mức hoa hồng</label>
              <input type="number" min="0" value={commissionValue} onChange={(e) => setCommissionValue(e.target.value)} className="w-full px-3 py-2 border rounded-xl border-slate-200" />
            </div>
          </div>

          {/* Địa chỉ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Địa chỉ cụ thể *</label>
              <input type="text" required placeholder="Số 20 ngõ 105 Doãn Kế Thiện" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 border rounded-xl border-slate-200" />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Quận / Huyện *</label>
              <input type="text" required placeholder="Cầu Giấy, Đống Đa..." value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full px-3 py-2 border rounded-xl border-slate-200" />
            </div>
          </div>

          {/* Thuộc tính & Tiện ích */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="font-semibold text-slate-700 block text-xs uppercase tracking-wider">Thuộc tính & Tiện ích</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-[11px] text-slate-500">Diện tích (m²)</label>
                <input type="number" value={area} onChange={(e) => setArea(e.target.value)} className="w-full px-2 py-1 text-xs border rounded-lg border-slate-200 bg-white" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Số phòng ngủ</label>
                <input type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="w-full px-2 py-1 text-xs border rounded-lg border-slate-200 bg-white" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Số phòng tắm</label>
                <input type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className="w-full px-2 py-1 text-xs border rounded-lg border-slate-200 bg-white" />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Nội thất</label>
                <select value={furnishing} onChange={(e) => setFurnishing(e.target.value as any)} className="w-full px-2 py-1 text-xs border rounded-lg border-slate-200 bg-white">
                  <option value="FULL">Full nội thất</option>
                  <option value="BASIC">Cơ bản</option>
                  <option value="EMPTY">Trống</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs"><input type="checkbox" checked={elevator} onChange={(e) => setElevator(e.target.checked)} className="rounded text-indigo-600" /> Thang máy</label>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs"><input type="checkbox" checked={allowPets} onChange={(e) => setAllowPets(e.target.checked)} className="rounded text-indigo-600" /> Cho nuôi Pet</label>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs"><input type="checkbox" checked={carParking} onChange={(e) => setCarParking(e.target.checked)} className="rounded text-indigo-600" /> Ô tô đỗ cửa</label>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs"><input type="checkbox" checked={pcccStandard} onChange={(e) => setPcccStandard(e.target.checked)} className="rounded text-indigo-600" /> PCCC đạt chuẩn</label>
            </div>
          </div>

          {/* Phí dịch vụ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Điện (đ/kWh)</label>
              <input type="number" placeholder="3800" value={electricity} onChange={(e) => setElectricity(e.target.value)} className="w-full px-3 py-1.5 border rounded-xl border-slate-200" />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Nước (đ/khối)</label>
              <input type="number" placeholder="30000" value={water} onChange={(e) => setWater(e.target.value)} className="w-full px-3 py-1.5 border rounded-xl border-slate-200" />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Dịch vụ (đ/tháng)</label>
              <input type="number" placeholder="150000" value={serviceFee} onChange={(e) => setServiceFee(e.target.value)} className="w-full px-3 py-1.5 border rounded-xl border-slate-200" />
            </div>
          </div>

          {/* Thông tin chủ nhà */}
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
            <span className="font-semibold text-amber-900 block text-xs uppercase tracking-wider">Thông tin Chủ Nhà / Đầu mối</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-600">Tên chủ nhà *</label>
                <input type="text" required placeholder="Bác Hùng" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg border-amber-200 bg-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-600">SĐT chủ nhà *</label>
                <input type="text" required placeholder="0912345678" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg border-amber-200 bg-white" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-600">Ghi chú mật (Chỉ Quản lý thấy)</label>
              <input type="text" placeholder="Chủ nhà dễ tính..." value={ownerNote} onChange={(e) => setOwnerNote(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg border-amber-200 bg-white" />
            </div>
          </div>

          {/* Nút hành động */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium">Hủy</button>
            <button type="submit" disabled={loading} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {initialData ? 'Cập nhật căn hộ' : 'Lưu căn hộ mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
