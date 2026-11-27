import React, { lazy, Suspense, useState } from 'react';
import { Check, Crosshair, Link2, MapPin } from 'lucide-react';
import { Apartment } from '../../api/apartmentApi.js';
import { OTHER_DISTRICTS, OTHER_ZONE, ZONES, Zone } from '../../utils/danang.js';
import { Field, FormSection, ToggleChip, inputClass, textOr } from './formFields.js';

const LocationPicker = lazy(() => import('./LocationPicker.js').then((m) => ({ default: m.LocationPicker }))); // Leaflet chỉ tải khi mở

export interface LocationFormValues {
  street: string;
  houseNumber: string;
  mapUrl: string;
  ward: string;
  zone: Zone | '';
  district: string; // Chỉ dùng khi khu vực "Khác"
  buildingName: string; // Story 15.7
  pinned?: [number, number]; // Story 15.7: chỉ có khi vừa đặt ghim trong lần mở form này → gửi lên = vị trí chính xác
}

export const toLocationForm = (apartment?: Apartment | null): LocationFormValues => ({
  street: apartment?.location?.street || '',
  houseNumber: apartment?.location?.houseNumber || '',
  mapUrl: apartment?.location?.mapUrl || '',
  ward: apartment?.location?.ward || '',
  zone: apartment?.location?.zone || '', // Không chọn sẵn: tránh lưu nhầm khu vực
  district: apartment?.location?.district || '',
  buildingName: apartment?.location?.buildingName || '',
});

export const isLocationComplete = (form: LocationFormValues) =>
  Boolean(form.street.trim() && form.zone && (form.zone !== OTHER_ZONE || OTHER_DISTRICTS.includes(form.district)));

/**
 * Phần `location` của payload. Backend tự ghép địa chỉ nội bộ (số nhà + tên đường, Story 8.3)
 * và tự suy ra quận từ khu vực (Story 8.4) — chỉ gửi quận khi khu vực "Khác".
 */
export const fromLocationForm = (form: LocationFormValues, empty: null | undefined, city = 'Đà Nẵng') => ({
  street: form.street.trim(),
  houseNumber: textOr(form.houseNumber, empty),
  mapUrl: textOr(form.mapUrl, empty),
  ward: textOr(form.ward, empty),
  zone: form.zone,
  district: form.zone === OTHER_ZONE ? form.district : undefined,
  buildingName: textOr(form.buildingName, empty),
  coordinates: form.pinned, // Không gửi tọa độ cũ: chỉ ghim mới đặt mới thành vị trí chính xác
  city,
});

type InputMode = 'DIRECT' | 'MAP_LINK';
const MODES = [
  { value: 'DIRECT', label: 'Nhập địa chỉ', Icon: MapPin },
  { value: 'MAP_LINK', label: 'Dán link Maps', Icon: Link2 },
] as const;

// Nhóm "Vị trí": khách chỉ thấy tên đường + khu vực; số nhà & link map chỉ nội bộ
// Story 13.8: 2 chế độ nhập — đổi chế độ chỉ ẩn/hiện ô link, không xóa dữ liệu đã gõ (link cũ vẫn giữ khi sửa căn)
export const LocationSection: React.FC<{ value: LocationFormValues; onChange: (next: LocationFormValues) => void; saved?: Apartment['location'] }> = ({ value, onChange, saved }) => {
  const set = (patch: Partial<LocationFormValues>) => onChange({ ...value, ...patch });
  const [mode, setMode] = useState<InputMode>(() => (value.mapUrl ? 'MAP_LINK' : 'DIRECT'));
  const [picking, setPicking] = useState(false);
  // Story 15.7: độ chính xác hiện có (căn cũ chưa có trường → có link Maps coi là chính xác)
  const exact = Boolean(value.pinned) || saved?.geoPrecision === 'EXACT' || (!saved?.geoPrecision && Boolean(saved?.mapUrl));

  return (
    <FormSection title="Vị trí">
      <div role="radiogroup" aria-label="Cách nhập vị trí" className="grid grid-cols-2 p-0.5 rounded-xl bg-slate-100">
        {MODES.map(({ value: option, label, Icon }) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={mode === option}
            onClick={() => setMode(option)}
            className={`h-11 inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${
              mode === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon className="w-4 h-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>
      {mode === 'MAP_LINK' && (
        <Field label="Link Google Maps (nội bộ)">
          <input
            type="url"
            inputMode="url"
            value={value.mapUrl}
            onChange={(e) => set({ mapUrl: e.target.value })}
            placeholder="https://maps.app.goo.gl/..."
            autoComplete="off"
            className={inputClass}
          />
        </Field>
      )}
      <div className="space-y-1">
        <span className="text-sm font-medium text-slate-700">
          Khu vực<span className="text-rose-600"> *</span>
        </span>
        <div role="radiogroup" aria-label="Khu vực" className="flex flex-wrap gap-2">
          {ZONES.map((zone) => (
            <ToggleChip key={zone} checked={value.zone === zone} onChange={() => set({ zone })}>
              {zone}
            </ToggleChip>
          ))}
        </div>
      </div>
      {value.zone === OTHER_ZONE && (
        <Field label="Quận" required>
          <select value={value.district} onChange={(e) => set({ district: e.target.value })} className={inputClass}>
            <option value="">Chọn quận</option>
            {OTHER_DISTRICTS.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </Field>
      )}
      <Field label="Tên đường" required>
        <input value={value.street} onChange={(e) => set({ street: e.target.value })} placeholder="Hoàng Kế Viêm" className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3 items-end">
        <Field label="Số nhà / kiệt">
          <input value={value.houseNumber} onChange={(e) => set({ houseNumber: e.target.value })} placeholder="K12/4" autoComplete="off" className={inputClass} />
        </Field>
        <Field label="Phường">
          <input value={value.ward} onChange={(e) => set({ ward: e.target.value })} placeholder="Mỹ An" className={inputClass} />
        </Field>
      </div>
      <Field label="Tên tòa nhà / dự án">
        <input value={value.buildingName} onChange={(e) => set({ buildingName: e.target.value })} placeholder="VD: Monarchy, Hiyori" maxLength={100} className={inputClass} />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="min-h-[44px] inline-flex items-center gap-1.5 px-4 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 active:bg-slate-100 transition-colors duration-100"
        >
          <Crosshair className="w-4 h-4" aria-hidden /> {exact ? 'Sửa vị trí trên bản đồ' : 'Đặt vị trí trên bản đồ'}
        </button>
        <span className={`inline-flex items-center gap-1 text-xs ${exact ? 'text-emerald-800' : 'text-amber-800'}`}>
          {exact ? <Check className="w-4 h-4" aria-hidden /> : null}
          {value.pinned ? 'Đã đặt vị trí chính xác' : exact ? 'Đã có vị trí chính xác' : 'Chưa có vị trí chính xác — nên đặt để bản đồ hiện đúng'}
        </span>
      </div>
      <p className="-mt-1 text-xs text-slate-600">
        {mode === 'DIRECT' && 'Không cần link: chi tiết căn tự mở Google Maps theo địa chỉ. '}
        Trang gửi khách hiện địa chỉ đầy đủ và vị trí trên bản đồ. Link Google Maps chỉ Quản lý, CTV xem được.
      </p>
      {picking && (
        <Suspense fallback={null}>
          <LocationPicker
            initial={value.pinned || saved?.coordinates}
            onClose={() => setPicking(false)}
            onConfirm={(pinned, info) => {
              const patch: Partial<LocationFormValues> = { pinned };
              if (!value.street.trim() && info?.street) patch.street = info.street;
              if (!value.zone && info?.zone) patch.zone = info.zone;
              if (!value.ward?.trim() && info?.ward) patch.ward = info.ward;
              // Story 20.4: định vị bằng link Google Maps dán trên bản đồ → lưu link cho nút Chỉ đường
              if (info?.mapUrl) {
                patch.mapUrl = info.mapUrl;
                setMode('MAP_LINK');
              }
              set(patch);
              setPicking(false);
            }}
          />
        </Suspense>
      )}
    </FormSection>
  );
};
