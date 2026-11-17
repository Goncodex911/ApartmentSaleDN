import React, { useEffect, useState } from 'react';
import { Landmark, apartmentApi } from '../../api/apartmentApi.js';
import { ApartmentFilterValues, EMPTY_FILTERS, countActiveFilters } from '../../hooks/useApartmentSearch.js';
import { X } from 'lucide-react';
import { PROPERTY_TYPES, ZONES } from '../../utils/danang.js';

export const PRICE_RANGES = [
  { id: 'under_5m', label: 'Dưới 5 triệu' },
  { id: '5m_8m', label: '5 – 8 triệu' },
  { id: '8m_12m', label: '8 – 12 triệu' },
  { id: '12m_20m', label: '12 – 20 triệu' },
  { id: 'above_20m', label: 'Trên 20 triệu' },
];
// Studio / Duplex nằm ở nhóm Loại căn (Story 8.4); "studio", "duplex" vẫn giữ để đọc link / chip cũ
export const ROOM_TYPES = [
  { id: '1pn', label: '1 phòng ngủ' },
  { id: '2pn', label: '2 phòng ngủ' },
  { id: 'studio', label: 'Studio', hidden: true },
  { id: 'duplex', label: 'Duplex / gác xép', hidden: true },
];
export const AMENITIES = [
  { key: 'elevator', label: 'Thang máy' },
  { key: 'allowPets', label: 'Nuôi thú cưng' },
  { key: 'carParking', label: 'Ô tô đỗ cửa' },
  { key: 'balcony', label: 'Ban công' },
  { key: 'pcccStandard', label: 'PCCC đạt chuẩn' },
  { key: 'nearBeach', label: 'Gần biển (<1km)' },
  { key: 'pool', label: 'Hồ bơi' },
] as const;
export const STATUSES = [
  { id: 'AVAILABLE', label: 'Trống' },
  { id: 'UPCOMING', label: 'Sắp trống' },
  { id: 'DEPOSITED', label: 'Đã cọc' },
  { id: 'RENTED', label: 'Đã thuê', managerOnly: true },
];
const RADIUS_OPTIONS = ['1', '2', '3', '5'];

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`min-h-[40px] px-3.5 rounded-full border text-sm transition-colors ${
      active ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
    }`}
  >
    {children}
  </button>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    <div className="flex flex-wrap gap-2">{children}</div>
  </section>
);

interface FilterSheetProps {
  initial: ApartmentFilterValues;
  isManager: boolean;
  onApply: (filters: ApartmentFilterValues) => void;
  onClose: () => void;
}

// Bảng trượt Bộ lọc (Story 4.3 thu gọn): chọn trên bản nháp, chỉ áp dụng khi bấm "Xem kết quả"
export const FilterSheet: React.FC<FilterSheetProps> = ({ initial, isManager, onApply, onClose }) => {
  const [draft, setDraft] = useState(initial);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);

  useEffect(() => {
    apartmentApi.getLandmarks().then((res) => setLandmarks(res.data || [])).catch(() => undefined);
  }, []);

  // Chip chọn 1: bấm lại chip đang chọn thì bỏ chọn
  const pick = (field: 'priceRange' | 'roomType' | 'status', value: string) =>
    setDraft((d) => ({ ...d, [field]: d[field] === value ? '' : value }));

  // Chip chọn nhiều
  const toggleIn = (field: 'zones' | 'propertyTypes', value: string) =>
    setDraft((d) => ({ ...d, [field]: d[field].includes(value) ? d[field].filter((v) => v !== value) : [...d[field], value] }));

  const selectLandmark = (id: string) =>
    setDraft((d) => ({ ...d, landmark: id, landmarkName: landmarks.find((l) => l.id === id)?.name || '' }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 pb-badge-safe sm:pb-0" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[85vh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Bộ lọc</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="p-2 -mr-2 text-slate-500 hover:text-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <Section title="Khoảng giá">
            {PRICE_RANGES.map((p) => (
              <Chip key={p.id} active={draft.priceRange === p.id} onClick={() => pick('priceRange', p.id)}>{p.label}</Chip>
            ))}
          </Section>
          <Section title="Khu vực">
            {ZONES.map((zone) => (
              <Chip key={zone} active={draft.zones.includes(zone)} onClick={() => toggleIn('zones', zone)}>{zone}</Chip>
            ))}
          </Section>
          <Section title="Loại căn">
            {PROPERTY_TYPES.map((type) => (
              <Chip key={type.id} active={draft.propertyTypes.includes(type.id)} onClick={() => toggleIn('propertyTypes', type.id)}>{type.vi}</Chip>
            ))}
          </Section>
          <Section title="Phòng ngủ">
            {ROOM_TYPES.filter((r) => !r.hidden).map((r) => (
              <Chip key={r.id} active={draft.roomType === r.id} onClick={() => pick('roomType', r.id)}>{r.label}</Chip>
            ))}
          </Section>
          <Section title="Tiện ích">
            {AMENITIES.map((a) => (
              <Chip key={a.key} active={draft[a.key]} onClick={() => setDraft((d) => ({ ...d, [a.key]: !d[a.key] }))}>{a.label}</Chip>
            ))}
          </Section>
          <Section title="Trạng thái">
            {STATUSES.filter((s) => isManager || !s.managerOnly).map((s) => (
              <Chip key={s.id} active={draft.status === s.id} onClick={() => pick('status', s.id)}>{s.label}</Chip>
            ))}
          </Section>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">Gần địa điểm</h3>
            <select
              value={draft.landmark}
              onChange={(e) => selectLandmark(e.target.value)}
              className="w-full h-11 px-3 text-base sm:text-sm border border-slate-200 rounded-xl bg-white"
            >
              <option value="">Không chọn</option>
              {landmarks.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            {draft.landmark && (
              <div className="flex flex-wrap gap-2">
                {RADIUS_OPTIONS.map((r) => (
                  <Chip key={r} active={draft.radiusKm === r} onClick={() => setDraft((d) => ({ ...d, radiusKm: r }))}>{r} km</Chip>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex gap-2 p-4 border-t border-slate-100">
          <button type="button" onClick={() => setDraft(EMPTY_FILTERS)} className="h-11 px-4 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100">
            Xóa lọc
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="flex-1 h-11 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
          >
            Xem kết quả{countActiveFilters(draft) > 0 ? ` (${countActiveFilters(draft)} lọc)` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};
