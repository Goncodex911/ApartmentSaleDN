import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin } from '../../api/apartmentApi.js';
import { ApartmentFilterValues } from '../../hooks/useApartmentSearch.js';
import { useMapPins } from '../../hooks/useMapPins.js';
import ApartmentMap from './ApartmentMap.js';
import { MapQuickCard } from './MapQuickCard.js';
import { WifiOff } from 'lucide-react';

interface MapPanelProps {
  filters: ApartmentFilterValues;
  query: string;
  hasFilters: boolean;
  onClearFilters: () => void;
  onOpen: (id: string) => void;
  pinActions?: (pin: MapPin) => React.ReactNode;
}

const Overlay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="absolute inset-0 z-[1100] flex flex-col items-center justify-center gap-3 p-6 bg-slate-50/90 text-center text-sm text-slate-700">{children}</div>
);

/**
 * Chế độ Bản đồ của Bảng hàng (Story 11.2) — tải riêng (React.lazy) cùng Leaflet để không làm chậm lần mở danh sách.
 * Chiếm phần nội dung giữa thanh tìm kiếm và menu đáy.
 */
const MapPanel: React.FC<MapPanelProps> = ({ filters, query, hasFilters, onClearFilters, onOpen, pinActions }) => {
  const { pins, withoutLocation, status, reload } = useMapPins(filters, query);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const selectedPins = useMemo(() => pins.filter((pin) => selectedIds.includes(pin._id)), [pins, selectedIds]);
  const closeCard = useCallback(() => setSelectedIds([]), []);

  // Thẻ xem nhanh nằm NGOÀI khung bản đồ: các lớp Leaflet có z-index 400–1000 sẽ che mất bảng trượt
  return (
    <>
      <div className="relative -mx-4 sm:mx-0 h-map sm:rounded-2xl overflow-hidden border-y sm:border border-slate-200 isolate">
        <ApartmentMap pins={pins} selectedIds={selectedIds} onSelect={setSelectedIds} />

        {status === 'ready' && withoutLocation > 0 && (
          <p className="absolute left-2 top-2 z-[900] px-2.5 py-1 rounded-full bg-white/95 text-xs text-slate-600 shadow-sm">{withoutLocation} căn chưa có vị trí</p>
        )}
        {status === 'ready' && pins.some((pin) => pin.approximate) && (
          <p className="absolute left-2 bottom-6 z-[900] px-2.5 py-1 rounded-full bg-white/95 text-xs text-slate-600 shadow-sm">Viền nét đứt: vị trí ước lượng</p>
        )}

        {!online ? (
          <Overlay>
            <WifiOff className="w-6 h-6 text-slate-400" aria-hidden />
            Cần có mạng để xem bản đồ. Danh sách vẫn xem được khi mất mạng.
          </Overlay>
        ) : status === 'loading' ? (
          <div className="absolute inset-0 z-[1100] bg-slate-200/70 animate-pulse motion-reduce:animate-none" aria-busy="true" aria-label="Đang tải bản đồ" />
        ) : status === 'error' ? (
          <Overlay>
            Không tải được bản đồ.
            <button type="button" onClick={reload} className="h-11 px-5 rounded-xl bg-indigo-600 text-white font-semibold">Thử lại</button>
          </Overlay>
        ) : pins.length === 0 && withoutLocation === 0 ? (
          <Overlay>
            <p className="text-base font-semibold text-slate-800">Không có căn phù hợp bộ lọc</p>
            {hasFilters && (
              <button type="button" onClick={onClearFilters} className="h-11 px-5 rounded-xl border border-slate-300 bg-white font-semibold">Xóa bộ lọc</button>
            )}
          </Overlay>
        ) : null}
      </div>

      {selectedPins.length > 0 && (
        <MapQuickCard key={selectedIds.join(',')} pins={selectedPins} onClose={closeCard} onOpen={(id) => { closeCard(); onOpen(id); }} actions={pinActions} />
      )}
    </>
  );
};

export default MapPanel;
