import { ApartmentFilterValues, AMENITY_KEYS } from '../../hooks/useApartmentSearch.js';
import { PRICE_RANGES, ROOM_TYPES, AMENITIES, STATUSES, NEEDS_LOCATION_LABEL } from './FilterSheet.js';
import { propertyTypeLabel, PropertyType } from '../../utils/danang.js';

export interface FilterChip {
  key: string;
  label: string;
  clear: Partial<ApartmentFilterValues>;
}

/** Chip các bộ lọc đang bật trên Bảng hàng — bấm × để bỏ từng lọc. */
export function activeChips(f: ApartmentFilterValues): FilterChip[] {
  const label = (list: { id: string; label: string }[], id: string) => list.find((item) => item.id === id)?.label || id;
  const chips: FilterChip[] = [];
  if (f.priceRange) chips.push({ key: 'price', label: label(PRICE_RANGES, f.priceRange), clear: { priceRange: '' } });
  if (f.roomType) chips.push({ key: 'room', label: label(ROOM_TYPES, f.roomType), clear: { roomType: '' } });
  if (f.status) chips.push({ key: 'status', label: label(STATUSES, f.status), clear: { status: '' } });
  f.zones.forEach((zone) => chips.push({ key: `zone-${zone}`, label: zone, clear: { zones: f.zones.filter((z) => z !== zone) } }));
  f.propertyTypes.forEach((type) =>
    chips.push({ key: `type-${type}`, label: propertyTypeLabel(type as PropertyType) || type, clear: { propertyTypes: f.propertyTypes.filter((t) => t !== type) } })
  );
  if (f.needsLocation) chips.push({ key: 'needs-location', label: NEEDS_LOCATION_LABEL, clear: { needsLocation: false } });
  if (f.landmark) chips.push({ key: 'lm', label: `${f.landmarkName || 'Điểm mốc'} · ${f.radiusKm} km`, clear: { landmark: '', landmarkName: '' } });
  AMENITY_KEYS.forEach((key) => {
    if (f[key]) chips.push({ key, label: AMENITIES.find((a) => a.key === key)!.label, clear: { [key]: false } });
  });
  return chips;
}
