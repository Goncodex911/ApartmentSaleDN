import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Poi, PoiGroup, apartmentApi } from '../../api/apartmentApi.js';
import { ApartmentFilterValues } from '../../hooks/useApartmentSearch.js';
import { useMapPins } from '../../hooks/useMapPins.js';
import ApartmentMap, { MapView } from './ApartmentMap.js';
import { MapQuickCard } from './MapQuickCard.js';
import { PoiChips } from './PoiChips.js';
import { Search, WifiOff } from 'lucide-react';

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

// Lựa chọn lưu trên máy (localStorage có thể bị chặn trong ẩn danh / trình duyệt Zalo → bọc try/catch)
const POI_KEY = 'map-poi-groups';
const AUTO_KEY = 'map-auto-search';
const readStored = <T,>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
};
const store = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Không lưu được thì lần sau dùng mặc định
  }
};

const MOVE_THRESHOLD_M = 500; // Story 15.3: kéo tâm bản đồ xa hơn mức này → gợi ý tìm lại
const AUTO_SEARCH_DELAY_MS = 500;
const chip = 'px-2.5 py-1 rounded-full bg-white/95 text-xs text-slate-700 shadow-sm';

/**
 * Chế độ Bản đồ của Bảng hàng (Story 11.2) — tải riêng (React.lazy) cùng Leaflet để không làm chậm lần mở danh sách.
 * Story 15.3: "Tìm ở khu vực này" / tự tìm khi di chuyển. Story 15.4: vòng bán kính điểm mốc + lớp tiện ích Đà Nẵng.
 */
const MapPanel: React.FC<MapPanelProps> = ({ filters, query, hasFilters, onClearFilters, onOpen, pinActions }) => {
  const [bbox, setBbox] = useState<string>();
  const { pins, withoutLocation, landmark, truncated, status, reload } = useMapPins(filters, query, bbox);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [poiGroups, setPoiGroups] = useState<PoiGroup[]>(() => readStored(POI_KEY, []));
  const [allPois, setAllPois] = useState<Poi[]>([]);
  const [autoSearch, setAutoSearch] = useState<boolean>(() => readStored(AUTO_KEY, false));
  const [showSearchHere, setShowSearchHere] = useState(false);
  const anchorRef = useRef<MapView | null>(null); // Khung nhìn của lần tải ghim gần nhất
  const viewRef = useRef<MapView | null>(null);
  const autoTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // Đổi bộ lọc / từ khóa → thoát chế độ khung nhìn, bản đồ tự canh lại như cũ
  useEffect(() => {
    setBbox(undefined);
    setShowSearchHere(false);
    anchorRef.current = null;
  }, [filters, query]);
  useEffect(() => () => clearTimeout(autoTimer.current), []);

  // Tiện ích chỉ tải khi bật nhóm đầu tiên
  useEffect(() => {
    if (poiGroups.length && !allPois.length) apartmentApi.getPois().then(setAllPois).catch(() => undefined);
  }, [poiGroups, allPois.length]);
  const visiblePois = useMemo(() => allPois.filter((poi) => poiGroups.includes(poi.group)), [allPois, poiGroups]);
  const togglePoi = (group: PoiGroup) =>
    setPoiGroups((current) => {
      const next = current.includes(group) ? current.filter((g) => g !== group) : [...current, group];
      store(POI_KEY, next);
      return next;
    });

  const searchHere = useCallback(() => {
    if (!viewRef.current) return;
    anchorRef.current = viewRef.current;
    setShowSearchHere(false);
    setBbox(viewRef.current.bbox);
  }, []);

  // Story 15.3: so khung mới với lần tải trước — lệch > 500m hoặc đổi ≥ 2 nấc phóng → gợi ý / tự tìm
  const onViewChange = useCallback(
    (view: MapView) => {
      viewRef.current = view;
      const anchor = anchorRef.current;
      if (!anchor) return void (anchorRef.current = view); // Lần di chuyển đầu (bản đồ tự canh khung) làm mốc
      const moved = anchor.center.distanceTo(view.center) > MOVE_THRESHOLD_M || Math.abs(anchor.zoom - view.zoom) >= 2;
      if (!moved) return;
      clearTimeout(autoTimer.current);
      if (autoSearch) autoTimer.current = setTimeout(searchHere, AUTO_SEARCH_DELAY_MS);
      else setShowSearchHere(true);
    },
    [autoSearch, searchHere]
  );

  const showAll = () => {
    setBbox(undefined);
    anchorRef.current = null;
  };

  const selectedPins = useMemo(() => pins.filter((pin) => selectedIds.includes(pin._id)), [pins, selectedIds]);
  const closeCard = useCallback(() => setSelectedIds([]), []);

  // Thẻ xem nhanh nằm NGOÀI khung bản đồ: các lớp Leaflet có z-index 400–1000 sẽ che mất bảng trượt
  return (
    <>
      <div className="relative -mx-4 sm:mx-0 h-map sm:rounded-2xl overflow-hidden border-y sm:border border-slate-200 isolate">
        <ApartmentMap pins={pins} selectedIds={selectedIds} onSelect={setSelectedIds} landmark={landmark} pois={visiblePois} fitToPins={!bbox} onViewChange={onViewChange} />
        <PoiChips active={poiGroups} onToggle={togglePoi} />

        <div className="absolute left-2 right-[60px] top-14 z-[900] flex flex-col items-start gap-1.5 pointer-events-none">
          {showSearchHere && !bbox && (
            <button
              type="button"
              onClick={searchHere}
              className="pointer-events-auto self-center min-h-[44px] inline-flex items-center gap-1.5 px-4 rounded-full bg-white text-indigo-700 text-sm font-semibold shadow-lg border border-slate-200 active:bg-slate-100 transition-colors duration-150"
            >
              <Search className="w-4 h-4" aria-hidden /> Tìm ở khu vực này
            </button>
          )}
          {bbox && (
            <p role="status" className={`${chip} pointer-events-auto flex items-center gap-2`}>
              {truncated ? 'Có hơn 500 căn, phóng to để xem đủ' : 'Đang xem căn trong khung bản đồ'}
              <button type="button" onClick={showAll} className="min-h-[32px] font-semibold text-indigo-700 underline underline-offset-2">
                Xem toàn bộ
              </button>
            </p>
          )}
          {status === 'ready' && withoutLocation > 0 && !bbox && <p className={chip}>{withoutLocation} căn chưa có vị trí</p>}
        </div>

        <label className={`${chip} absolute left-2 bottom-14 z-[900] inline-flex items-center gap-2 min-h-[36px] cursor-pointer`}>
          <input
            type="checkbox"
            checked={autoSearch}
            onChange={(e) => {
              setAutoSearch(e.target.checked);
              store(AUTO_KEY, e.target.checked);
            }}
            className="w-4 h-4 accent-indigo-600"
          />
          Tự động tìm khi di chuyển
        </label>
        {status === 'ready' && pins.some((pin) => pin.approximate) && <p className={`${chip} absolute left-2 bottom-6 z-[900]`}>Viền nét đứt: vị trí theo tên đường / khu vực</p>}

        {!online ? (
          <Overlay>
            <WifiOff className="w-6 h-6 text-slate-400" aria-hidden />
            Cần có mạng để xem bản đồ. Danh sách vẫn xem được khi mất mạng.
          </Overlay>
        ) : status === 'loading' && !bbox ? (
          <div className="absolute inset-0 z-[1100] bg-slate-200/70 animate-pulse motion-reduce:animate-none" aria-busy="true" aria-label="Đang tải bản đồ" />
        ) : status === 'error' ? (
          <Overlay>
            Không tải được bản đồ.
            <button type="button" onClick={reload} className="h-11 px-5 rounded-xl bg-indigo-600 text-white font-semibold">Thử lại</button>
          </Overlay>
        ) : status === 'ready' && pins.length === 0 && withoutLocation === 0 && !bbox ? (
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
