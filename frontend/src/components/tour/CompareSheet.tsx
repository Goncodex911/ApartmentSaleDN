import React, { useCallback, useEffect, useState } from 'react';
import { Apartment, apartmentApi } from '../../api/apartmentApi.js';
import { formatVnd } from '../../utils/format.js';
import { roomParts, zoneText, beachDistanceText } from '../../utils/apartmentLabels.js';
import { addressEn, bedroomsEn, formatVndEn } from '../../utils/listingEn.js';
import { amenityLabel } from '../../utils/amenities.js';
import { DEFAULT_COST_OPTIONS, estimateMonthlyCost } from '../../utils/livingCost.js';
import { Lang } from '../../utils/shareLang.js';
import { isVideoUrl } from '../../utils/media.js';
import { X } from 'lucide-react';

const COPY = {
  vi: { title: 'So sánh căn', price: 'Giá thuê', place: 'Khu vực', beach: 'Cách biển', area: 'Diện tích', rooms: 'Loại căn', baths: 'Phòng tắm', fees: 'Điện / Nước', service: 'Dịch vụ / Gửi xe', included: 'Đã bao gồm', total: 'Tổng ước tính*', best: 'Tốt nhất', yes: 'Có', no: 'Không', shared: 'Dùng chung', unknown: 'Chưa rõ', none: '—', note: '* 2 người, điều hoà mức Vừa (8–10h/ngày) — ước tính tham khảo.', error: 'Không tải được thông tin căn.', retry: 'Thử lại' },
  en: { title: 'Compare apartments', price: 'Rent', place: 'Location', beach: 'To the beach', area: 'Size', rooms: 'Type', baths: 'Bathrooms', fees: 'Electricity / Water', service: 'Service / Parking', included: 'Included', total: 'Est. total*', best: 'Best', yes: 'Yes', no: 'No', shared: 'Shared', unknown: 'N/A', none: '—', note: '* 2 people, medium air-con use (8–10h/day) — estimate only.', error: 'Could not load apartments.', retry: 'Retry' },
} as const;
// Tiện ích so sánh đối đầu: optional = căn cũ có thể chưa nhập (undefined → "Chưa rõ" thay vì "Không")
const AMENITY_ROWS: { key: 'pool' | 'elevator' | 'balcony' | 'allowPets' | 'gym'; optional?: boolean }[] = [
  { key: 'pool', optional: true },
  { key: 'elevator' },
  { key: 'balcony' },
  { key: 'allowPets' },
  { key: 'gym', optional: true },
];

// Ảnh bìa: bỏ ảnh có SĐT nguồn cũ và video lỡ nằm trong images (Story 5.2, 10.2)
const coverOf = (apt: Apartment) => apt.images.find((url) => !apt.hiddenImages?.includes(url) && !isVideoUrl(url));

type Cell = { text: string; score?: number }; // score: càng nhỏ càng tốt (giá, khoảng cách, tổng chi phí) → tô "Tốt nhất"

/** Chỉ số ô tốt nhất của 1 dòng; không tô khi thiếu dữ liệu so sánh hoặc mọi căn bằng nhau. */
function bestIndex(cells: Cell[]): number {
  const scored = cells.map((cell, index) => ({ index, score: cell.score })).filter((item): item is { index: number; score: number } => item.score != null);
  if (scored.length < 2) return -1;
  const min = Math.min(...scored.map((item) => item.score));
  const winners = scored.filter((item) => item.score === min);
  return winners.length === 1 ? winners[0].index : -1;
}

/**
 * Bảng so sánh 2–3 căn (Story 11.6): cột tiêu chí dính bên trái, cuộn ngang theo từng cột trên điện thoại.
 * CTV đưa điện thoại cho khách xem → có nút đổi Tiếng Việt / English.
 */
export const CompareSheet: React.FC<{ ids: string[]; onClose: () => void }> = ({ ids, onClose }) => {
  const [lang, setLang] = useState<Lang>('vi');
  const [data, setData] = useState<{ apartments: Apartment[]; usdRate: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const copy = COPY[lang];

  const load = useCallback(() => {
    setFailed(false);
    setData(null);
    Promise.all(ids.map((id) => apartmentApi.getApartmentById(id)))
      .then((results) => setData({ apartments: results.map((res) => res.data), usdRate: results[0]?.meta?.usdRate || 25000 }))
      .catch(() => setFailed(true));
  }, [ids]);
  useEffect(load, [load]);

  const money = (value: number) => (lang === 'en' ? formatVndEn(value) : formatVnd(value));
  const yesNo = (value: boolean | undefined, optional?: boolean) => (value ? copy.yes : value === undefined && optional ? copy.unknown : copy.no);

  const rows: { label: string; cells: (apt: Apartment) => Cell }[] = data
    ? [
        { label: copy.price, cells: (apt) => ({ text: `${money(apt.price)} · $${apt.priceUsd || Math.round(apt.price / data.usdRate)}`, score: apt.price }) },
        { label: copy.place, cells: (apt) => ({ text: lang === 'en' ? addressEn(apt) : [apt.location.street, zoneText(apt.location)].filter(Boolean).join(', ') }) },
        { label: copy.beach, cells: (apt) => (apt.attributes.distanceToBeachM != null ? { text: beachDistanceText(apt.attributes.distanceToBeachM), score: apt.attributes.distanceToBeachM } : { text: copy.unknown }) },
        { label: copy.area, cells: (apt) => ({ text: apt.attributes.area ? `${apt.attributes.area} m²` : copy.unknown }) },
        { label: copy.rooms, cells: (apt) => ({ text: lang === 'en' ? bedroomsEn(apt.attributes.bedrooms) : roomParts(apt.attributes).join(' · ') }) },
        { label: copy.baths, cells: (apt) => ({ text: String(apt.attributes.bathrooms) }) },
        ...AMENITY_ROWS.map(({ key, optional }) => ({ label: amenityLabel(key), cells: (apt: Apartment) => ({ text: yesNo(apt.attributes[key], optional) }) })),
        { label: amenityLabel('washingMachine'), cells: (apt) => ({ text: apt.attributes.washingMachine === 'PRIVATE' ? copy.yes : apt.attributes.washingMachine === 'SHARED' ? copy.shared : copy.no }) },
        {
          label: copy.fees,
          cells: (apt) => ({ text: [apt.fees?.electricity ? `${money(apt.fees.electricity)}/kWh` : copy.none, apt.fees?.water ? money(apt.fees.water) : copy.none].join(' · ') }),
        },
        { label: copy.service, cells: (apt) => ({ text: [apt.fees?.service ? money(apt.fees.service) : copy.none, apt.fees?.parkingMotor ? money(apt.fees.parkingMotor) : copy.none].join(' · ') }) },
        { label: copy.included, cells: (apt) => ({ text: (apt.includedServices || []).map(amenityLabel).join(', ') || copy.none }) },
        {
          label: copy.total,
          cells: (apt) => {
            const estimate = estimateMonthlyCost(apt, DEFAULT_COST_OPTIONS, data.usdRate);
            return { text: `~${money(estimate.totalVnd)} · $${estimate.totalUsd}`, score: estimate.totalVnd };
          },
        },
      ]
    : [];

  return (
    <div role="dialog" aria-label={copy.title} className="fixed inset-0 z-50 flex flex-col bg-white">
      <header className="flex items-center gap-2 px-2 h-14 border-b border-slate-200">
        <button type="button" onClick={onClose} aria-label="Đóng" className="w-11 h-11 flex items-center justify-center text-slate-500">
          <X className="w-5 h-5" />
        </button>
        <h2 className="flex-1 text-base font-semibold text-slate-900">{copy.title}</h2>
        <div role="group" aria-label="Ngôn ngữ" className="flex p-1 mr-1 rounded-xl bg-slate-100">
          {(['vi', 'en'] as const).map((option) => (
            <button key={option} type="button" aria-pressed={lang === option} onClick={() => setLang(option)} className={`h-9 min-w-[44px] px-2 rounded-lg text-sm font-semibold ${lang === option ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
              {option === 'vi' ? 'VI' : 'EN'}
            </button>
          ))}
        </div>
      </header>

      {!data && !failed && (
        // Story 12.5: khung chờ hình bảng so sánh (cột tiêu chí + 2 cột căn)
        <div className="flex gap-2 p-2" aria-busy="true" aria-label="Đang tải bảng so sánh">
          <div className="w-28 space-y-2">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-10 rounded" />)}</div>
          {[0, 1].map((col) => <div key={col} className="flex-1 space-y-2"><div className="skeleton h-32 rounded-lg" />{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-10 rounded" />)}</div>)}
        </div>
      )}
      {failed && (
        <div className="m-auto text-center space-y-3">
          <p className="text-sm text-slate-600">{copy.error}</p>
          <button type="button" onClick={load} className="h-11 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold">{copy.retry}</button>
        </div>
      )}
      {data && (
        <div className="flex-1 min-h-0 overflow-auto overscroll-contain snap-x snap-mandatory scroll-pl-28 pb-badge-safe">
          <table className="border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 w-28 min-w-28 bg-white border-b border-slate-200" />
                {data.apartments.map((apt) => (
                  <th key={apt._id} scope="col" className="sticky top-0 z-10 w-[62vw] min-w-[62vw] sm:w-64 sm:min-w-64 p-2 snap-start bg-white border-b border-l border-slate-200 text-left align-top">
                    {coverOf(apt) && <img src={coverOf(apt)} alt="" className="w-full h-24 rounded-lg object-cover bg-slate-100" />}
                    <p className="mt-1.5 font-semibold text-slate-900 line-clamp-2">{apt.title}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const cells = data.apartments.map(row.cells);
                const best = bestIndex(cells);
                return (
                  <tr key={row.label}>
                    <th scope="row" className="sticky left-0 z-10 w-28 min-w-28 p-2 bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-600 align-top">
                      {row.label}
                    </th>
                    {cells.map((cell, index) => (
                      <td key={data.apartments[index]._id} className={`p-2 border-b border-l border-slate-200 align-top text-slate-800 ${index === best ? 'bg-emerald-50' : ''}`}>
                        {cell.text}
                        {index === best && <span className="block mt-0.5 text-xs font-bold text-emerald-800">{copy.best}</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="p-3 text-xs text-slate-500">{copy.note}</p>
        </div>
      )}
    </div>
  );
};
