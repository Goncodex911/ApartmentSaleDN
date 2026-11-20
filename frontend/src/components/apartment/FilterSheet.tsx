import React, { useEffect, useState } from 'react';
import { Landmark, apartmentApi } from '../../api/apartmentApi.js';
import { AMENITY_KEYS, ApartmentFilterValues, EMPTY_FILTERS, countActiveFilters } from '../../hooks/useApartmentSearch.js';
import { amenityLabel } from '../../utils/amenities.js';
import { BottomSheet } from '../layout/BottomSheet.js';
import { tapFeedback } from '../../utils/haptics.js';
import { PROPERTY_TYPES, ZONES } from '../../utils/danang.js';
import { STATUS_ORDER, STATUS_STYLE } from '../../utils/statusStyle.js';
import { Button } from '../ui/Button.js';
import { Select } from '../ui/Input.js';

export const PRICE_RANGES = [
  { id: 'under_5m', label: 'Dưới 5 triệu' },
  { id: '5m_8m', label: '5 – 8 triệu' },
  { id: '8m_12m', label: '8 – 12 triệu' },
  { id: '12m_20m', label: '12 – 20 triệu' },
  { id: 'above_20m', label: 'Trên 20 triệu' },
];
// Studio / Duplex nằm ở nhóm Loại căn (Story 8.4)
export const ROOM_TYPES = [
  { id: '1pn', label: '1 phòng ngủ' },
  { id: '2pn', label: '2 phòng ngủ' },
];
// Tên tiện ích tiếng Anh lấy từ danh mục chung (Story 8.5); "Gần biển" là điều kiện khoảng cách, khác "Sea view"
export const AMENITIES = AMENITY_KEYS.map((key) => ({ key, label: key === 'nearBeach' ? 'Gần biển (<1km)' : amenityLabel(key) }));
// Nhãn trạng thái lấy từ nguồn chung (Story 12.1); CTV không lọc được căn Đã thuê
export const STATUSES = STATUS_ORDER.map((id) => ({ id, label: STATUS_STYLE[id].label, managerOnly: id === 'RENTED' }));
const RADIUS_OPTIONS = ['1', '2', '3', '5'];

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={() => {
      tapFeedback(); // Story 9.4: rung nhẹ khi chọn lọc
      onClick();
    }}
    aria-pressed={active}
    className={`min-h-[44px] px-3.5 rounded-full border text-sm cursor-pointer transition-colors ${
      active ? 'border-brand-accent bg-brand-accent text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
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
export const NEEDS_LOCATION_LABEL = 'Chưa có vị trí chính xác';

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
    // Story 12.3: bảng trượt dùng chung — mở ở 90%, nút Xem kết quả ghim đáy
    <BottomSheet
      title="Bộ lọc"
      onClose={onClose}
      snapPoints={[0.9]}
      showClose
      wide
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setDraft(EMPTY_FILTERS)}>Xóa lọc</Button>
          <Button className="flex-1" onClick={() => onApply(draft)}>
            Xem kết quả{countActiveFilters(draft) > 0 ? ` (${countActiveFilters(draft)} lọc)` : ''}
          </Button>
        </div>
      }
    >
        <div className="space-y-5 pt-1">
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
            {ROOM_TYPES.map((r) => (
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
            {/* Story 15.7: Quản lý lọc căn chưa có vị trí chính xác để bổ sung ghim */}
            {isManager && (
              <Chip active={draft.needsLocation} onClick={() => setDraft((d) => ({ ...d, needsLocation: !d.needsLocation }))}>{NEEDS_LOCATION_LABEL}</Chip>
            )}
          </Section>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">Gần địa điểm</h3>
            <Select aria-label="Gần địa điểm" value={draft.landmark} onChange={(e) => selectLandmark(e.target.value)}>
              <option value="">Không chọn</option>
              {landmarks.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
            {draft.landmark && (
              <div className="flex flex-wrap gap-2">
                {RADIUS_OPTIONS.map((r) => (
                  <Chip key={r} active={draft.radiusKm === r} onClick={() => setDraft((d) => ({ ...d, radiusKm: r }))}>{r} km</Chip>
                ))}
              </div>
            )}
          </section>
        </div>
    </BottomSheet>
  );
};
