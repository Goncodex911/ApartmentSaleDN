import React from 'react';
import { Apartment } from '../../api/apartmentApi.js';
import { Field, FormSection, ToggleChip, inputClass, numberOr } from './formFields.js';
import { LEASE_STEPS, roundLeaseMonths } from '../../utils/danang.js';

// Giá trị form dạng chuỗi (ô nhập số để trống = không có thông tin). Tiện ích (hồ bơi, dịch vụ...) nằm ở AmenitiesSection (Story 8.5)
export interface MarketFormValues {
  distanceToBeachM: string;
  priceUsd: string;
  minLeaseMonths?: number; // Chỉ 1 / 3 / 6 / 12 (Story 8.4)
}

const toText = (value?: number) => (value !== undefined && value !== null ? String(value) : '');

export const toMarketForm = (apartment?: Apartment | null): MarketFormValues => ({
  distanceToBeachM: toText(apartment?.attributes?.distanceToBeachM),
  priceUsd: toText(apartment?.priceUsd),
  minLeaseMonths: roundLeaseMonths(apartment?.minLeaseMonths), // Căn cũ lưu 2, 9 tháng → mốc gần nhất, chỉ đổi khi bấm Lưu
});

// Số nguyên không âm; ô trống → `empty` (null khi sửa = xóa giá trị cũ)
const intOr = (value: string, empty: null | undefined) => {
  const num = numberOr(value, empty);
  return typeof num === 'number' && num >= 0 ? Math.round(num) : empty;
};

/** Chuyển giá trị form thành phần payload gửi API (gộp vào payload chính của ApartmentModal). */
export const fromMarketForm = (form: MarketFormValues, empty: null | undefined) => ({
  distanceToBeachM: intOr(form.distanceToBeachM, empty),
  priceUsd: intOr(form.priceUsd, empty) || empty,
  minLeaseMonths: form.minLeaseMonths ?? empty,
});

// Khu nhập thông tin đặc thù Đà Nẵng (Story 7.2): khoảng cách biển, giá USD, thuê tối thiểu
export const MarketFieldsSection: React.FC<{ value: MarketFormValues; onChange: (next: MarketFormValues) => void }> = ({ value, onChange }) => {
  const set = (patch: Partial<MarketFormValues>) => onChange({ ...value, ...patch });

  return (
    <FormSection title="Biển & thời hạn thuê">
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
    </FormSection>
  );
};
