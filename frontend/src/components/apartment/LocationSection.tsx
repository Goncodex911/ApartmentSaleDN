import React from 'react';
import { Apartment } from '../../api/apartmentApi.js';
import { OTHER_DISTRICTS, OTHER_ZONE, ZONES, Zone } from '../../utils/danang.js';
import { Field, FormSection, ToggleChip, inputClass, textOr } from './formFields.js';

export interface LocationFormValues {
  street: string;
  houseNumber: string;
  mapUrl: string;
  ward: string;
  zone: Zone | '';
  district: string; // Chỉ dùng khi khu vực "Khác"
}

export const toLocationForm = (apartment?: Apartment | null): LocationFormValues => ({
  street: apartment?.location?.street || '',
  houseNumber: apartment?.location?.houseNumber || '',
  mapUrl: apartment?.location?.mapUrl || '',
  ward: apartment?.location?.ward || '',
  zone: apartment?.location?.zone || '', // Không chọn sẵn: tránh lưu nhầm khu vực
  district: apartment?.location?.district || '',
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
  city,
});

// Nhóm "Vị trí": khách chỉ thấy tên đường + khu vực; số nhà & link map chỉ nội bộ
export const LocationSection: React.FC<{ value: LocationFormValues; onChange: (next: LocationFormValues) => void }> = ({ value, onChange }) => {
  const set = (patch: Partial<LocationFormValues>) => onChange({ ...value, ...patch });

  return (
    <FormSection title="Vị trí">
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
      <div className="grid grid-cols-3 gap-3 items-end">
        <Field label="Tên đường" required className="col-span-2">
          <input value={value.street} onChange={(e) => set({ street: e.target.value })} placeholder="Bà Huyện Thanh Quan" className={inputClass} />
        </Field>
        <Field label="Số nhà / kiệt">
          <input value={value.houseNumber} onChange={(e) => set({ houseNumber: e.target.value })} placeholder="K12/3" autoComplete="off" className={inputClass} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3 items-end">
        <Field label="Link Google Maps (nội bộ)" className="col-span-2">
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
        <Field label="Phường">
          <input value={value.ward} onChange={(e) => set({ ward: e.target.value })} placeholder="Mỹ An" className={inputClass} />
        </Field>
      </div>
      <p className="-mt-1 text-xs text-slate-500">Khách chỉ thấy tên đường và khu vực. Số nhà, link bản đồ chỉ Quản lý, CTV xem được.</p>
    </FormSection>
  );
};
