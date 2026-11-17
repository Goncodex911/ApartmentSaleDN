import React from 'react';
import { Apartment, IncludedService } from '../../api/apartmentApi.js';
import { SERVICE_LABEL } from '../../utils/apartmentLabels.js';

// Giá trị form dạng chuỗi (ô nhập số để trống = không có thông tin)
export interface MarketFormValues {
  distanceToBeachM: string;
  pool: boolean;
  motorbikeParking: boolean;
  priceUsd: string;
  minLeaseMonths: string;
  includedServices: IncludedService[];
}

export const toMarketForm = (apartment?: Apartment | null): MarketFormValues => ({
  distanceToBeachM: apartment?.attributes?.distanceToBeachM !== undefined ? String(apartment.attributes.distanceToBeachM) : '',
  pool: apartment?.attributes?.pool ?? false,
  motorbikeParking: apartment?.attributes?.motorbikeParking ?? false,
  priceUsd: apartment?.priceUsd ? String(apartment.priceUsd) : '',
  minLeaseMonths: apartment?.minLeaseMonths ? String(apartment.minLeaseMonths) : '',
  includedServices: apartment?.includedServices || [],
});

const optionalInt = (value: string) => (value.trim() && Number(value) >= 0 ? Math.round(Number(value)) : undefined);

/** Chuyển giá trị form thành phần payload gửi API (gộp vào payload chính của ApartmentModal). */
export const fromMarketForm = (form: MarketFormValues) => ({
  attributes: { distanceToBeachM: optionalInt(form.distanceToBeachM), pool: form.pool, motorbikeParking: form.motorbikeParking },
  priceUsd: optionalInt(form.priceUsd) || undefined,
  minLeaseMonths: optionalInt(form.minLeaseMonths) || undefined,
  includedServices: form.includedServices,
});

const inputClass = 'w-full px-3 py-2 border rounded-xl border-slate-200';
const checkClass = 'flex items-center gap-1.5 cursor-pointer text-xs';

// Khu nhập thông tin đặc thù Đà Nẵng (Story 7.2): biển, hồ bơi, giá USD, thuê tối thiểu, dịch vụ bao gồm
export const MarketFieldsSection: React.FC<{ value: MarketFormValues; onChange: (next: MarketFormValues) => void }> = ({ value, onChange }) => {
  const set = (patch: Partial<MarketFormValues>) => onChange({ ...value, ...patch });
  const toggleService = (code: IncludedService) =>
    set({ includedServices: value.includedServices.includes(code) ? value.includedServices.filter((c) => c !== code) : [...value.includedServices, code] });

  return (
    <div className="p-3 bg-slate-50 rounded-xl space-y-3">
      <span className="font-semibold text-slate-700 block text-xs uppercase tracking-wider">Biển, thời hạn & dịch vụ</span>
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1 text-xs text-slate-600">
          Cách biển (m)
          <input type="number" min={0} inputMode="numeric" placeholder="600" value={value.distanceToBeachM} onChange={(e) => set({ distanceToBeachM: e.target.value })} className={inputClass} />
        </label>
        <label className="space-y-1 text-xs text-slate-600">
          Giá USD/tháng
          <input type="number" min={0} inputMode="numeric" placeholder="760" value={value.priceUsd} onChange={(e) => set({ priceUsd: e.target.value })} className={inputClass} />
        </label>
        <label className="space-y-1 text-xs text-slate-600">
          Thuê tối thiểu (tháng)
          <input type="number" min={1} inputMode="numeric" placeholder="1" value={value.minLeaseMonths} onChange={(e) => set({ minLeaseMonths: e.target.value })} className={inputClass} />
        </label>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <label className={checkClass}><input type="checkbox" checked={value.pool} onChange={(e) => set({ pool: e.target.checked })} className="rounded text-indigo-600" /> Hồ bơi</label>
        <label className={checkClass}><input type="checkbox" checked={value.motorbikeParking} onChange={(e) => set({ motorbikeParking: e.target.checked })} className="rounded text-indigo-600" /> Chỗ để xe máy</label>
        {(Object.keys(SERVICE_LABEL) as IncludedService[]).map((code) => (
          <label key={code} className={checkClass}>
            <input type="checkbox" checked={value.includedServices.includes(code)} onChange={() => toggleService(code)} className="rounded text-indigo-600" /> {SERVICE_LABEL[code]}
          </label>
        ))}
      </div>
    </div>
  );
};
