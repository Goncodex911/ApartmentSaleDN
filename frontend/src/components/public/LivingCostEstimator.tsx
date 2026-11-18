import React, { useMemo, useState } from 'react';
import { PublicListing } from '../../api/shareApi.js';
import { Lang } from '../../utils/shareLang.js';
import { AcLevel, CostItem, DEFAULT_COST_OPTIONS, estimateMonthlyCost } from '../../utils/livingCost.js';
import { formatVnd } from '../../utils/format.js';
import { formatVndEn } from '../../utils/listingEn.js';

const COPY = {
  vi: {
    title: 'Ước tính chi phí / tháng',
    people: 'Số người ở',
    ac: 'Dùng điều hoà',
    levels: { low: 'Ít · 4–6h', medium: 'Vừa · 8–10h', high: 'Nhiều · 14–18h' },
    motorbike: 'Có xe máy',
    total: 'Tổng dự kiến',
    perMonth: '/tháng',
    items: { rent: 'Tiền thuê', electricity: 'Điện', water: 'Nước', service: 'Dịch vụ', parking: 'Gửi xe' },
    reference: 'tham khảo',
    included: 'đã bao gồm',
    note: 'Ước tính tham khảo, thực tế tuỳ cách dùng.',
  },
  en: {
    title: 'Estimated monthly cost',
    people: 'People',
    ac: 'Air-con use',
    levels: { low: 'Low · 4–6h', medium: 'Medium · 8–10h', high: 'High · 14–18h' },
    motorbike: 'Motorbike',
    total: 'Estimated total',
    perMonth: '/mo',
    items: { rent: 'Rent', electricity: 'Electricity', water: 'Water', service: 'Service fee', parking: 'Parking' },
    reference: 'typical rate',
    included: 'included',
    note: 'Estimate only — actual cost depends on usage.',
  },
} as const;
const ITEMS: CostItem[] = ['rent', 'electricity', 'water', 'service', 'parking'];
const DEFAULT_USD_RATE = 25000;

const Segment = <T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; label: string }) => (
  <div role="group" aria-label={label} className="flex p-1 rounded-xl bg-slate-100">
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        aria-pressed={value === option.value}
        onClick={() => onChange(option.value)}
        className={`flex-1 min-h-[44px] px-1 rounded-lg text-sm font-semibold transition-colors ${value === option.value ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

/** Công cụ ước tính chi phí sinh hoạt trên trang khách /p/:slug (Story 11.6) — tính ngay trên máy, không gọi server. */
export const LivingCostEstimator: React.FC<{ listing: PublicListing; lang: Lang }> = ({ listing, lang }) => {
  const copy = COPY[lang];
  const [people, setPeople] = useState(DEFAULT_COST_OPTIONS.people);
  const [acLevel, setAcLevel] = useState<AcLevel>(DEFAULT_COST_OPTIONS.acLevel);
  const [motorbike, setMotorbike] = useState(false);
  const estimate = useMemo(
    () => estimateMonthlyCost(listing, { people, acLevel, motorbike }, listing.usdRate || DEFAULT_USD_RATE),
    [listing, people, acLevel, motorbike]
  );
  const money = (value: number) => (lang === 'en' ? formatVndEn(value) : formatVnd(value));
  const included = listing.includedServices || [];
  const isIncluded = (item: CostItem) => (item === 'electricity' && included.includes('ELECTRICITY')) || (item === 'water' && included.includes('WATER'));

  return (
    <section className="p-4 rounded-xl border border-slate-200 space-y-3" aria-labelledby="living-cost-title">
      <h2 id="living-cost-title" className="text-base font-bold text-slate-900">{copy.title}</h2>
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-slate-600">{copy.people}</p>
        <Segment label={copy.people} value={people} onChange={setPeople} options={[1, 2, 3, 4].map((n) => ({ value: n, label: String(n) }))} />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-slate-600">{copy.ac}</p>
        <Segment label={copy.ac} value={acLevel} onChange={setAcLevel} options={(['low', 'medium', 'high'] as const).map((level) => ({ value: level, label: copy.levels[level] }))} />
      </div>
      {!!listing.fees.parkingMotor && (
        <label className="flex items-center gap-2 min-h-[44px] text-sm text-slate-700">
          <input type="checkbox" checked={motorbike} onChange={(e) => setMotorbike(e.target.checked)} className="w-5 h-5 accent-indigo-600" />
          {copy.motorbike}
        </label>
      )}

      <div className="p-3 rounded-xl bg-indigo-50" aria-live="polite">
        <p className="text-sm text-indigo-800">{copy.total}</p>
        <p className="text-xl font-extrabold text-indigo-800">
          ~{money(estimate.totalVnd)}
          <span className="text-sm font-medium">{copy.perMonth}</span>
          <span className="ml-2 text-base font-semibold">(${estimate.totalUsd}{lang === 'en' ? '/mo' : ''})</span>
        </p>
      </div>
      <dl className="space-y-1 text-sm">
        {/* Ẩn khoản 0đ (căn không thu phí dịch vụ / gửi xe) — trừ tiền thuê và khoản "đã bao gồm" */}
        {ITEMS.filter((item) => item === 'rent' || isIncluded(item) || estimate.items[item] > 0).map((item) => (
          <div key={item} className="flex justify-between gap-3">
            <dt className="text-slate-600">
              {copy.items[item]}
              {estimate.referenceItems.includes(item) && <span className="text-slate-500"> ({copy.reference})</span>}
            </dt>
            <dd className="font-semibold text-slate-800 tabular-nums">{isIncluded(item) ? copy.included : money(estimate.items[item])}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-slate-500">{copy.note}</p>
    </section>
  );
};
