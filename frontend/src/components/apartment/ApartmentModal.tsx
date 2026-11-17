import React, { useState } from 'react';
import { Apartment, apartmentApi } from '../../api/apartmentApi.js';
import { X, Loader2 } from 'lucide-react';
import { PhotoUploader } from './PhotoUploader.js';
import { LocationSection, toLocationForm, fromLocationForm, isLocationComplete } from './LocationSection.js';
import { MarketFieldsSection, toMarketForm, fromMarketForm } from './MarketFieldsSection.js';
import { Field, FormSection, ToggleChip, inputClass, numberOr, textOr } from './formFields.js';
import { PROPERTY_TYPES, PropertyType } from '../../utils/danang.js';

interface ApartmentModalProps {
  initialData?: Apartment | null;
  onClose: () => void;
  onSuccess: (savedApartment: Apartment) => void;
}

type Furnishing = Apartment['attributes']['furnishing'];
const toText = (value?: number) => (value !== undefined && value !== null ? String(value) : '');

// Tiện ích dạng bật/tắt trên form (Story 8.5 sẽ bổ sung thêm)
const AMENITY_TOGGLES = [
  { key: 'elevator', label: 'Thang máy' },
  { key: 'allowPets', label: 'Cho nuôi pet' },
  { key: 'carParking', label: 'Ô tô đỗ cửa' },
  { key: 'balcony', label: 'Ban công' },
  { key: 'pcccStandard', label: 'PCCC đạt chuẩn' },
] as const;
type AmenityKey = (typeof AMENITY_TOGGLES)[number]['key'];

/**
 * Form thêm/sửa căn (Story 8.1): toàn màn hình trên điện thoại, KHÔNG điền sẵn số liệu giả,
 * xóa trắng ô khi sửa → gửi null để backend xóa giá trị cũ.
 * Trang cha chỉ render modal khi đang mở → mỗi lần mở là một lần mount mới, form lấy lại initialData.
 */
export const ApartmentModal: React.FC<ApartmentModalProps> = ({ initialData, onClose, onSuccess }) => {
  const isEdit = Boolean(initialData?._id);
  const attrs = initialData?.attributes;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initialData?.title || '');
  const [price, setPrice] = useState(toText(initialData?.price));
  const [location, setLocation] = useState(() => toLocationForm(initialData));
  const [propertyType, setPropertyType] = useState<PropertyType | ''>(attrs?.propertyType || '');
  const [area, setArea] = useState(toText(attrs?.area));
  const [bedrooms, setBedrooms] = useState(toText(attrs?.bedrooms));
  const [bathrooms, setBathrooms] = useState(toText(attrs?.bathrooms));
  const [furnishing, setFurnishing] = useState<Furnishing | ''>(attrs?.furnishing || '');
  const [amenities, setAmenities] = useState<Record<AmenityKey, boolean>>({
    elevator: attrs?.elevator ?? false,
    allowPets: attrs?.allowPets ?? false,
    carParking: attrs?.carParking ?? false,
    balcony: attrs?.balcony ?? false,
    pcccStandard: attrs?.pcccStandard ?? false,
  });
  const [electricity, setElectricity] = useState(toText(initialData?.fees?.electricity));
  const [water, setWater] = useState(toText(initialData?.fees?.water));
  const [serviceFee, setServiceFee] = useState(toText(initialData?.fees?.service));
  const [ownerName, setOwnerName] = useState(initialData?.ownerContact?.name || '');
  const [ownerPhone, setOwnerPhone] = useState(initialData?.ownerContact?.phone || '');
  const [ownerNote, setOwnerNote] = useState(initialData?.ownerContact?.note || '');
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [market, setMarket] = useState(() => toMarketForm(initialData)); // Thông tin Đà Nẵng (Story 7.2)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !isLocationComplete(location) || !propertyType || bedrooms === '' || !furnishing || !ownerName || !ownerPhone) {
      setError('Vui lòng điền đủ các ô có dấu *');
      return;
    }
    // Ô trống: tạo mới → bỏ qua; sửa → null để xóa giá trị cũ
    const empty = isEdit ? null : undefined;
    const marketPayload = fromMarketForm(market, empty);
    const payload = {
      ...marketPayload,
      title,
      price: Number(price),
      location: fromLocationForm(location, empty, initialData?.location?.city),
      attributes: {
        propertyType,
        area: numberOr(area, empty),
        bedrooms: Math.max(0, Math.trunc(Number(bedrooms))),
        bathrooms: bathrooms.trim() ? Math.max(0, Math.trunc(Number(bathrooms))) : undefined, // Bắt buộc ở DB → không xóa được
        furnishing,
        ...amenities,
        ...marketPayload.attributes,
      },
      fees: { electricity: numberOr(electricity, empty), water: numberOr(water, empty), service: numberOr(serviceFee, empty) },
      images,
      ownerContact: { name: ownerName, phone: ownerPhone, note: textOr(ownerNote, empty) },
    };

    try {
      setLoading(true);
      setError(null);
      const result = isEdit
        ? await apartmentApi.updateApartment(initialData!._id, payload)
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
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4 bg-black/50">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="h-full sm:h-auto sm:max-h-[90vh] w-full sm:max-w-2xl flex flex-col bg-white sm:rounded-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-2 h-14 border-b border-slate-100 shrink-0">
          <button type="button" onClick={onClose} aria-label="Đóng" className="p-3 text-slate-500 hover:text-slate-800">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold text-slate-900">{isEdit ? 'Sửa căn hộ' : 'Thêm căn hộ'}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {error && <p role="alert" className="p-3 text-sm bg-rose-50 text-rose-700 rounded-xl">{error}</p>}

          <PhotoUploader images={images} onChange={setImages} onError={setError} />

          <FormSection title="Thông tin chính">
            <Field label="Tiêu đề" required>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Căn 2PN view biển Mỹ An" className={inputClass} />
            </Field>
            <Field label="Giá thuê (đ/tháng)" required>
              <input type="number" inputMode="numeric" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="8000000" className={inputClass} />
            </Field>
          </FormSection>

          <LocationSection value={location} onChange={setLocation} />

          <FormSection title="Căn hộ">
            <div className="grid grid-cols-2 gap-3 items-end">
              <Field label="Loại căn" required className="col-span-2">
                <select value={propertyType} onChange={(e) => setPropertyType(e.target.value as PropertyType)} className={inputClass}>
                  <option value="" disabled>Chọn loại căn</option>
                  {PROPERTY_TYPES.map((type) => <option key={type.id} value={type.id}>{type.vi}</option>)}
                </select>
              </Field>
              <Field label="Phòng ngủ" required>
                <input type="number" inputMode="numeric" min={0} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="0 = studio" className={inputClass} />
              </Field>
              <Field label="Phòng tắm">
                <input type="number" inputMode="numeric" min={0} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Diện tích (m²)">
                <input type="number" inputMode="decimal" min={0} value={area} onChange={(e) => setArea(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Nội thất" required>
                <select value={furnishing} onChange={(e) => setFurnishing(e.target.value as Furnishing)} className={inputClass}>
                  <option value="" disabled>Chọn</option>
                  <option value="FULL">Full nội thất</option>
                  <option value="BASIC">Cơ bản</option>
                  <option value="EMPTY">Nhà trống</option>
                </select>
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              {AMENITY_TOGGLES.map(({ key, label }) => (
                <ToggleChip key={key} checked={amenities[key]} onChange={(checked) => setAmenities((prev) => ({ ...prev, [key]: checked }))}>
                  {label}
                </ToggleChip>
              ))}
            </div>
          </FormSection>

          <MarketFieldsSection value={market} onChange={setMarket} />

          <FormSection title="Phí hàng tháng">
            <div className="grid grid-cols-3 gap-3 items-end">
              <Field label="Điện (đ/kWh)">
                <input type="number" inputMode="numeric" min={0} value={electricity} onChange={(e) => setElectricity(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Nước (đ)">
                <input type="number" inputMode="numeric" min={0} value={water} onChange={(e) => setWater(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Dịch vụ (đ)">
                <input type="number" inputMode="numeric" min={0} value={serviceFee} onChange={(e) => setServiceFee(e.target.value)} className={inputClass} />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Chủ nhà / đầu mối (CTV không thấy)" tone="private">
            <div className="grid grid-cols-2 gap-3 items-end">
              <Field label="Tên" required>
                <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} autoComplete="off" className={inputClass} />
              </Field>
              <Field label="Số điện thoại" required>
                <input type="tel" inputMode="tel" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} autoComplete="off" placeholder="0905123456" className={inputClass} />
              </Field>
            </div>
            <Field label="Ghi chú riêng">
              <input value={ownerNote} onChange={(e) => setOwnerNote(e.target.value)} placeholder="Chủ nhà dễ tính, hẹn xem sau 17h..." className={inputClass} />
            </Field>
          </FormSection>
        </div>

        {/* Nút Lưu ghim cuối màn hình, chừa chỗ huy hiệu Netlify */}
        <div className="shrink-0 flex gap-2 p-3 pb-badge-safe sm:pb-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="h-11 px-4 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100">
            Hủy
          </button>
          <button type="submit" disabled={loading} className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Lưu thay đổi' : 'Lưu căn hộ'}
          </button>
        </div>
      </form>
    </div>
  );
};
