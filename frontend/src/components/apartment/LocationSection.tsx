import React from 'react';
import { Apartment } from '../../api/apartmentApi.js';
import { DANANG_DISTRICTS } from '../../utils/danang.js';
import { Field, FormSection, inputClass, textOr } from './formFields.js';

export interface LocationFormValues {
  street: string;
  houseNumber: string;
  mapUrl: string;
  ward: string;
  district: string;
}

export const toLocationForm = (apartment?: Apartment | null): LocationFormValues => ({
  street: apartment?.location?.street || '',
  houseNumber: apartment?.location?.houseNumber || '',
  mapUrl: apartment?.location?.mapUrl || '',
  ward: apartment?.location?.ward || '',
  district: apartment?.location?.district || '', // Không điền sẵn: tránh lưu nhầm quận
});

export const isLocationComplete = (form: LocationFormValues) => Boolean(form.street.trim() && form.district.trim());

/** Phần `location` của payload; backend tự ghép địa chỉ nội bộ = số nhà + tên đường (Story 8.3). */
export const fromLocationForm = (form: LocationFormValues, empty: null | undefined, city = 'Đà Nẵng') => ({
  street: form.street.trim(),
  houseNumber: textOr(form.houseNumber, empty),
  mapUrl: textOr(form.mapUrl, empty),
  ward: textOr(form.ward, empty),
  district: form.district.trim(),
  city,
});

// Nhóm "Vị trí": tên đường gửi khách; số nhà & link map chỉ nội bộ
export const LocationSection: React.FC<{ value: LocationFormValues; onChange: (next: LocationFormValues) => void }> = ({ value, onChange }) => {
  const set = (patch: Partial<LocationFormValues>) => onChange({ ...value, ...patch });

  return (
    <FormSection title="Vị trí">
      <div className="grid grid-cols-3 gap-3 items-end">
        <Field label="Tên đường" required className="col-span-2">
          <input value={value.street} onChange={(e) => set({ street: e.target.value })} placeholder="Bà Huyện Thanh Quan" className={inputClass} />
        </Field>
        <Field label="Số nhà / kiệt">
          <input value={value.houseNumber} onChange={(e) => set({ houseNumber: e.target.value })} placeholder="K12/3" autoComplete="off" className={inputClass} />
        </Field>
      </div>
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
      <p className="-mt-1 text-xs text-slate-500">Khách chỉ thấy tên đường. Số nhà và link bản đồ chỉ Quản lý, CTV xem được.</p>
      <div className="grid grid-cols-2 gap-3 items-end">
        <Field label="Phường">
          <input value={value.ward} onChange={(e) => set({ ward: e.target.value })} placeholder="Mỹ An" className={inputClass} />
        </Field>
        <Field label="Khu vực (quận)" required>
          {/* Gợi ý danh sách quận Đà Nẵng nhưng vẫn cho gõ tự do */}
          <input list="danang-districts" value={value.district} onChange={(e) => set({ district: e.target.value })} placeholder="Chọn hoặc gõ" className={inputClass} />
          <datalist id="danang-districts">
            {DANANG_DISTRICTS.map((name) => <option key={name} value={name} />)}
          </datalist>
        </Field>
      </div>
    </FormSection>
  );
};
