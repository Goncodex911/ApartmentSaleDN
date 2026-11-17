import React from 'react';
import { Apartment, IncludedService } from '../../api/apartmentApi.js';
import { SERVICE_LABEL } from '../../utils/apartmentLabels.js';
import { Field, FormSection, ToggleChip, inputClass, numberOr } from './formFields.js';
import { LEASE_STEPS, roundLeaseMonths } from '../../utils/danang.js';

// Giá trị form dạng chuỗi (ô nhập số để trống = không có thông tin)
export interface MarketFormValues {
  distanceToBeachM: string;
  pool: boolean;
  motorbikeParking: boolean;
  priceUsd: string;
  minLeaseMonths?: number; // Chỉ 1 / 3 / 6 / 12 (Story 8.4)
  includedServices: IncludedService[];
}

const toText = (value?: number) => (value !== undefined && value !== null ? String(value) : '');

export const toMarketForm = (apartment?: Apartment | null): MarketFormValues => ({
  distanceToBeachM: toText(apartment?.attributes?.distanceToBeachM),
  pool: apartment?.attributes?.pool ?? false,
  motorbikeParking: apartment?.attributes?.motorbikeParking ?? false,
  priceUsd: toText(apartment?.priceUsd),
  minLeaseMonths: roundLeaseMonths(apartment?.minLeaseMonths), // Căn cũ lưu 2, 9 tháng → mốc gần nhất, chỉ đổi khi bấm Lưu
  includedServices: apartment?.includedServices || [],
});

// Số nguyên không âm; ô trống → `empty` (null khi sửa = xóa giá trị cũ)
const intOr = (value: string, empty: null | undefined) => {
  const num = numberOr(value, empty);
  return typeof num === 'number' && num >= 0 ? Math.round(num) : empty;
};

/** Chuyển giá trị form thành phần payload gửi API (gộp vào payload chính của ApartmentModal). */
export const fromMarketForm = (form: MarketFormValues, empty: null | undefined) => ({
  attributes: { distanceToBeachM: intOr(form.distanceToBeachM, empty), pool: form.pool, motorbikeParking: form.motorbikeParking },
  priceUsd: intOr(form.priceUsd, empty) || empty,
  minLeaseMonths: form.minLeaseMonths ?? empty,
  includedServices: form.includedServices,
});

// Khu nhập thông tin đặc thù Đà Nẵng (Story 7.2): biển, hồ bơi, giá USD, thuê tối thiểu, dịch vụ bao gồm
export const MarketFieldsSection: React.FC<{ value: MarketFormValues; onChange: (next: MarketFormValues) => void }> = ({ value, onChange }) => {
  const set = (patch: Partial<MarketFormValues>) => onChange({ ...value, ...patch });
  const toggleService = (code: IncludedService) =>
    set({ includedServices: value.includedServices.includes(code) ? value.includedServices.filter((c) => c !== code) : [...value.includedServices, code] });

  return (
    <FormSection title="Biển, thời hạn & dịch vụ">
      <div className="grid grid-cols-2 gap-3 items-end">
        <Field label="Cách biển (m)">
          <input type="number" inputMode="numeric" min={0} placeholder="600" value={value.distanceToBeachM} onChange={(e) => set({ distanceToBeachM: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Giá USD">
          <input type="number" inputMode="numeric" min={0} placeholder="760" value={value.priceUsd} onChange={(e) => set({ priceUsd: e.target.value })} className={inputClass} />
        </Field>
      </div>
      <div className="space-y-1">
        <span className="text-sm font-medium text-slate-700">Thuê tối thiểu</span>
        <div className="flex flex-wrap gap-2">
          {LEASE_STEPS.map((months) => (
            // Bấm lại mốc đang chọn → bỏ chọn
            <ToggleChip key={months} checked={value.minLeaseMonths === months} onChange={(on) => set({ minLeaseMonths: on ? months : undefined })}>
              {months} tháng
            </ToggleChip>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <ToggleChip checked={value.pool} onChange={(pool) => set({ pool })}>Hồ bơi</ToggleChip>
        <ToggleChip checked={value.motorbikeParking} onChange={(motorbikeParking) => set({ motorbikeParking })}>Chỗ để xe máy</ToggleChip>
        {(Object.keys(SERVICE_LABEL) as IncludedService[]).map((code) => (
          <ToggleChip key={code} checked={value.includedServices.includes(code)} onChange={() => toggleService(code)}>
            {SERVICE_LABEL[code]}
          </ToggleChip>
        ))}
      </div>
    </FormSection>
  );
};
