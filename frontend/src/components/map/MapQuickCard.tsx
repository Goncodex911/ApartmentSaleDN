import React, { useState } from 'react';
import { MapPin } from '../../api/apartmentApi.js';
import { BottomSheet } from '../layout/BottomSheet.js';
import { formatVnd } from '../../utils/format.js';
import { roomParts, zoneText } from '../../utils/apartmentLabels.js';
import { PropertyType } from '../../utils/danang.js';
import { Navigation, ChevronRight } from 'lucide-react';

const placeOf = (pin: MapPin) => [pin.street, zoneText(pin)].filter(Boolean).join(', ');
const typeOf = (pin: MapPin) => roomParts({ propertyType: pin.propertyType as PropertyType | undefined, bedrooms: pin.bedrooms }).join(' · ');
const priceOf = (pin: MapPin) => (pin.price ? formatVnd(pin.price) : `$${pin.priceUsd}`);
// Google Maps tự mở ứng dụng trên điện thoại, dẫn đường tới đúng toạ độ căn
const directionsUrl = (pin: MapPin) => `https://www.google.com/maps/dir/?api=1&destination=${pin.coordinates[1]},${pin.coordinates[0]}`;

const PinSummary: React.FC<{ pin: MapPin; onOpen: (id: string) => void; extra?: React.ReactNode }> = ({ pin, onOpen, extra }) => (
  <div className="space-y-3">
    <div className="flex gap-3">
      {pin.image ? (
        <img src={pin.image} alt="" className="w-24 h-24 rounded-xl object-cover shrink-0 bg-slate-100" />
      ) : (
        <div className="w-24 h-24 rounded-xl bg-slate-100 shrink-0" aria-hidden />
      )}
      <div className="min-w-0 space-y-0.5">
        <p className="text-base font-bold text-slate-900">
          {priceOf(pin)}
          <span className="text-xs font-normal text-slate-500">/tháng</span>
        </p>
        <p className="text-sm text-slate-700 line-clamp-2">{placeOf(pin)}</p>
        <p className="text-sm text-slate-500">{typeOf(pin)}</p>
        {pin.approximate && <p className="text-xs text-amber-700">Vị trí ước lượng</p>}
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <button type="button" onClick={() => onOpen(pin._id)} className="h-11 rounded-xl bg-brand-navy text-white text-sm font-semibold active:scale-[0.98] transition-transform duration-100 motion-reduce:transform-none">
        Xem chi tiết
      </button>
      <a
        href={directionsUrl(pin)}
        target="_blank"
        rel="noopener noreferrer"
        className="h-11 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 active:bg-slate-50"
      >
        <Navigation className="w-4 h-4" aria-hidden /> Chỉ đường
      </a>
    </div>
    {extra}
  </div>
);

/**
 * Thẻ xem nhanh khi chạm ghim (Story 11.2). Chạm cụm nhiều căn trùng vị trí → danh sách, chọn 1 căn để xem thẻ.
 * `actions(pin)` cho phép trang gắn thêm nút (VD "Thêm vào lộ trình" — Story 11.3).
 */
export const MapQuickCard: React.FC<{
  pins: MapPin[];
  onClose: () => void;
  onOpen: (id: string) => void;
  actions?: (pin: MapPin) => React.ReactNode;
}> = ({ pins, onClose, onOpen, actions }) => {
  const [picked, setPicked] = useState<MapPin | null>(pins.length === 1 ? pins[0] : null);

  if (picked) {
    return (
      <BottomSheet title={typeOf(picked) || 'Căn hộ'} onClose={onClose}>
        <PinSummary pin={picked} onOpen={onOpen} extra={actions?.(picked)} />
      </BottomSheet>
    );
  }
  return (
    <BottomSheet title={`${pins.length} căn ở khu vực này`} onClose={onClose}>
      <ul className="max-h-[50dvh] overflow-y-auto -mx-1 divide-y divide-slate-100">
        {pins.map((pin) => (
          <li key={pin._id}>
            <button type="button" onClick={() => setPicked(pin)} className="w-full min-h-[56px] px-1 flex items-center gap-3 text-left active:bg-slate-50">
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{priceOf(pin)}</span>
                <span className="block text-xs text-slate-500 truncate">{typeOf(pin)} · {placeOf(pin)}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
};
