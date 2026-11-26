import React, { useState, useEffect } from 'react';
import { Apartment, ApartmentPayload, MatchedApartment, apartmentApi } from '../../api/apartmentApi.js';
import { X } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { PhotoUploader, MediaValue } from './PhotoUploader.js';
import { splitMedia } from '../../utils/media.js';
import { LocationSection, toLocationForm, fromLocationForm, isLocationComplete } from './LocationSection.js';
import { MarketFieldsSection, toMarketForm, fromMarketForm } from './MarketFieldsSection.js';
import { AmenitiesSection } from './AmenitiesSection.js';
import { Field, FormSection, inputClass, numberOr, textOr } from './formFields.js';
import { AmenityKey, amenityKeysOf, amenityPayload } from '../../utils/amenities.js';
import { PROPERTY_TYPES, PropertyType } from '../../utils/danang.js';
import { useApp } from '../layout/AppShell.js';
import { DuplicateConfirmDialog } from './DuplicateConfirmDialog.js';
import { DuplicateSoftWarning } from './DuplicateSoftWarning.js';

interface ApartmentModalProps {
  initialData?: Apartment | null;
  onClose: () => void;
  onSuccess?: (savedApartment: Apartment) => void;
  // Story 8.6: dùng chung form cho Đăng tin / Sửa tin chờ duyệt — truyền hàm lưu riêng thay cho tạo/sửa căn trong kho
  onSave?: (payload: ApartmentPayload) => Promise<unknown>;
  heading?: string;
  submitLabel?: string;
}

type Furnishing = Apartment['attributes']['furnishing'];
const toText = (value?: number) => (value !== undefined && value !== null ? String(value) : '');

/**
 * Form thêm/sửa căn (Story 8.1): toàn màn hình trên điện thoại, KHÔNG điền sẵn số liệu giả,
 * xóa trắng ô khi sửa → gửi null để backend xóa giá trị cũ.
 * Trang cha chỉ render modal khi đang mở → mỗi lần mở là một lần mount mới, form lấy lại initialData.
 */
export const ApartmentModal: React.FC<ApartmentModalProps> = ({ initialData, onClose, onSuccess, onSave, heading, submitLabel }) => {
  const { user } = useApp();
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isEdit = Boolean(initialData?._id);
  const attrs = initialData?.attributes;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Story 13.10: Trùng lặp căn hộ phân tách cho Quản lý & CTV
  const [softWarning, setSoftWarning] = useState<MatchedApartment | null>(null); // AC1: CTV cảnh báo mềm
  const [duplicateCandidate, setDuplicateCandidate] = useState<MatchedApartment | null>(null); // AC3: Quản lý hộp thoại xác nhận
  const [pendingPayload, setPendingPayload] = useState<ApartmentPayload | null>(null);

  const [title, setTitle] = useState(initialData?.title || '');
  const [price, setPrice] = useState(toText(initialData?.price));
  const [location, setLocation] = useState(() => toLocationForm(initialData));
  const [propertyType, setPropertyType] = useState<PropertyType | ''>(attrs?.propertyType || '');
  const [area, setArea] = useState(toText(attrs?.area));
  const [bedrooms, setBedrooms] = useState(toText(attrs?.bedrooms));
  const [bathrooms, setBathrooms] = useState(toText(attrs?.bathrooms));
  const [furnishing, setFurnishing] = useState<Furnishing | ''>(attrs?.furnishing || '');
  // Tiện ích (Story 8.5): mã đang chọn; tạo mới không chọn sẵn gì
  const [amenities, setAmenities] = useState<AmenityKey[]>(() => (initialData ? amenityKeysOf(initialData) : []));
  const [electricity, setElectricity] = useState(toText(initialData?.fees?.electricity));
  const [water, setWater] = useState(toText(initialData?.fees?.water));
  const [serviceFee, setServiceFee] = useState(toText(initialData?.fees?.service));
  const [ownerName, setOwnerName] = useState(initialData?.ownerContact?.name || '');
  const [ownerPhone, setOwnerPhone] = useState(initialData?.ownerContact?.phone || '');
  const [ownerNote, setOwnerNote] = useState(initialData?.ownerContact?.note || '');
  // Story 10.2: ảnh và video tách riêng (video cũ lỡ nằm trong images được chuyển sang videos)
  const [media, setMedia] = useState<MediaValue>(() => splitMedia(initialData || {}));
  const [market, setMarket] = useState(() => toMarketForm(initialData)); // Thông tin Đà Nẵng (Story 7.2)

  // Story 13.10 — AC1: CTV đang điền form -> kiểm tra trùng lặp ngầm và hiện cảnh báo mềm
  // CE-03.3: dữ liệu đổi → ẩn cảnh báo cũ ngay, hủy lần kiểm tra trước để kết quả cũ không ghi đè kết quả mới
  useEffect(() => {
    setSoftWarning(null);
    const street = location.street.trim();
    const numPrice = Number(price);
    if (isManager || isEdit || !street || !(numPrice > 0)) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await apartmentApi.checkDuplicate({
          title: title.trim() || undefined,
          price: numPrice,
          location: fromLocationForm(location, undefined),
          attributes: { propertyType: propertyType || undefined, bedrooms: bedrooms !== '' ? Number(bedrooms) : undefined },
          ownerContact: { phone: ownerPhone.trim() || undefined },
        }, controller.signal);
        setSoftWarning(res.isDuplicate && res.matchedApartment ? res.matchedApartment : null);
      } catch (_e) {
        // Bị hủy hoặc lỗi mạng: kiểm tra ngầm không ảnh hưởng form
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isManager, isEdit, location.street, location.houseNumber, location.zone, location.district, price, propertyType, bedrooms, title, ownerPhone]);

  /** Lưu căn; trả true khi thành công (CE-03.3: hộp thoại trùng chỉ bỏ dữ liệu chờ khi lưu xong). */
  const executeSave = async (payload: ApartmentPayload): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      if (onSave) await onSave(payload);
      else {
        const result = isEdit
          ? await apartmentApi.updateApartment(initialData!._id, payload)
          : await apartmentApi.createApartment(payload);
        onSuccess?.(result.data);
      }
      onClose();
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu căn hộ');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !isLocationComplete(location) || !propertyType || bedrooms === '' || !furnishing) {
      setError('Vui lòng điền đủ các ô có dấu *');
      return;
    }
    // Ô trống: tạo mới → bỏ qua; sửa → null để xóa giá trị cũ
    const empty = isEdit ? null : undefined;
    const { distanceToBeachM, ...marketPayload } = fromMarketForm(market, empty);
    const amenityData = amenityPayload(amenities, attrs?.washingMachine);
    const payload = {
      ...marketPayload,
      includedServices: amenityData.includedServices,
      title,
      price: Number(price),
      location: fromLocationForm(location, empty, initialData?.location?.city),
      attributes: {
        propertyType,
        area: numberOr(area, empty),
        bedrooms: Math.max(0, Math.trunc(Number(bedrooms))),
        bathrooms: bathrooms.trim() ? Math.max(0, Math.trunc(Number(bathrooms))) : undefined, // Bắt buộc ở DB → không xóa được
        furnishing,
        distanceToBeachM,
        ...amenityData.attributes,
      },
      fees: { electricity: numberOr(electricity, empty), water: numberOr(water, empty), service: numberOr(serviceFee, empty) },
      images: media.images,
      videos: media.videos,
      // Story 13.7: tên/SĐT chủ tùy chọn (căn nguồn liên kết) — ô trống không gửi, khi sửa thì xóa giá trị cũ
      ownerContact: { name: textOr(ownerName, empty), phone: textOr(ownerPhone, empty), note: textOr(ownerNote, empty) },
    };

    // Story 13.10 — AC3: Quản lý tạo căn mới kiểm tra trùng lặp ngầm trước khi lưu
    // Đã bấm "Vẫn tạo căn mới" nhưng lần lưu trước lỗi → lưu tiếp, không hỏi trùng lại
    if (isManager && !isEdit && !onSave && !pendingPayload) {
      try {
        setLoading(true);
        setError(null);
        const dup = await apartmentApi.checkDuplicate({
          title,
          price: Number(price),
          location: payload.location as any,
          attributes: { propertyType, bedrooms: Math.max(0, Math.trunc(Number(bedrooms))) },
          ownerContact: { phone: ownerPhone.trim() || undefined },
        });
        if (dup.isDuplicate && dup.matchedApartment) {
          setDuplicateCandidate(dup.matchedApartment);
          setPendingPayload(payload);
          return;
        }
      } catch (_e) {
        // Lỗi kiểm tra mạng không làm hỏng thao tác lưu
      } finally {
        setLoading(false);
      }
    }

    await executeSave(payload);
  };

  const handleConfirmCreate = async () => {
    setDuplicateCandidate(null);
    if (pendingPayload && (await executeSave(pendingPayload))) setPendingPayload(null);
  };

  const handleViewExisting = () => {
    if (duplicateCandidate) window.open(`/apartments?id=${duplicateCandidate._id}`, '_blank');
  };

  const handleCancelDuplicate = () => {
    setDuplicateCandidate(null);
    setPendingPayload(null);
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
          <h2 className="text-base font-semibold text-slate-900">{heading || (isEdit ? 'Sửa căn hộ' : 'Thêm căn hộ')}</h2>
        </div>

        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto p-4 space-y-6">
          {error && <p role="alert" className="p-3 text-sm bg-rose-50 text-rose-700 rounded-xl">{error}</p>}

          <PhotoUploader value={media} onChange={setMedia} onError={setError} />

          <FormSection title="Thông tin chính">
            <Field label="Tiêu đề" required>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Căn 2PN view biển Mỹ An" className={inputClass} />
            </Field>
            <Field label="Giá thuê (đ/tháng)" required>
              <input type="number" inputMode="numeric" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="8000000" className={inputClass} />
            </Field>
          </FormSection>

          <LocationSection value={location} onChange={setLocation} saved={initialData?.location} />

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
          </FormSection>

          <AmenitiesSection value={amenities} onChange={setAmenities} />

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

          <FormSection title="Chủ nhà / đầu mối (chỉ Quản lý xem được)" tone="private">
            <div className="grid sm:grid-cols-2 gap-3 items-end">
              <Field label="Tên">
                <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} autoComplete="off" className={inputClass} />
              </Field>
              <Field label="Số điện thoại">
                <input type="tel" inputMode="tel" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} autoComplete="off" placeholder="0905... (để trống nếu là nguồn liên kết)" className={inputClass} />
              </Field>
            </div>
            <Field label="Ghi chú riêng">
              <input value={ownerNote} onChange={(e) => setOwnerNote(e.target.value)} placeholder="VD: Liên hệ qua Zalo bạn Minh đối tác" className={inputClass} />
            </Field>
          </FormSection>
        </div>

        {/* Story 13.10 — AC1: Cảnh báo mềm cho CTV khi phát hiện căn tương tự (không chặn gửi) */}
        {softWarning && <DuplicateSoftWarning matched={softWarning} />}

        {/* Nút Lưu ghim cuối màn hình, chừa chỗ huy hiệu Netlify */}
        <div className="shrink-0 flex gap-2 p-3 pb-badge-safe sm:pb-3 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button type="submit" loading={loading} className="flex-1">
            {submitLabel || (isEdit ? 'Lưu thay đổi' : 'Lưu căn hộ')}
          </Button>
        </div>
      </form>

      {/* Story 13.10 — AC3: Hộp thoại xác nhận 3 lựa chọn cho Quản lý khi lưu căn nghi trùng */}
      {duplicateCandidate && (
        <DuplicateConfirmDialog
          matched={duplicateCandidate}
          busy={loading}
          onConfirmCreate={handleConfirmCreate}
          onViewExisting={handleViewExisting}
          onCancel={handleCancelDuplicate}
        />
      )}
    </div>
  );
};
