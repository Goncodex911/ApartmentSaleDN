import React, { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { Check, LocateFixed, Loader2, MapPin, X } from 'lucide-react';
import { DANANG_CENTER, TILE_ATTRIBUTION, TILE_URL } from '../../utils/mapTiles.js';

const inDanang = (lng: number, lat: number) => lng >= 107.9 && lng <= 108.4 && lat >= 15.8 && lat <= 16.25;
const round6 = (value: number) => Number(value.toFixed(6));

/**
 * Story 15.7: đặt vị trí chính xác của căn — ghim cố định giữa khung, kéo BẢN ĐỒ bên dưới (dễ thao tác 1 tay hơn kéo ghim).
 * Hộp thoại toàn màn hình (không dùng BottomSheet: kéo bản đồ sẽ tranh cử chỉ vuốt đóng bảng trượt). Leaflet tải khi mở.
 */
export const LocationPicker: React.FC<{ initial?: [number, number]; onConfirm: (coordinates: [number, number]) => void; onClose: () => void }> = ({ initial, onConfirm, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let disposed = false;
    Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]).then(([{ default: L }]) => {
      if (disposed || !containerRef.current) return;
      const map = L.map(containerRef.current, { zoomControl: false }).setView(initial ? [initial[1], initial[0]] : DANANG_CENTER, initial ? 18 : 13);
      L.tileLayer(TILE_URL, { maxZoom: 20, attribution: TILE_ATTRIBUTION }).addTo(map);
      L.control.zoom({ position: 'topright' }).addTo(map);
      map.attributionControl.setPrefix(false);
      map.on('movestart', () => setError(''));
      mapRef.current = map;
      setReady(true);
    });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      disposed = true;
      document.removeEventListener('keydown', onKey);
      mapRef.current?.remove();
    };
  }, []); // Chỉ dựng bản đồ 1 lần khi mở

  const useMyLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        mapRef.current?.setView([coords.latitude, coords.longitude], 19);
      },
      () => {
        setLocating(false);
        setError('Không lấy được vị trí hiện tại. Vui lòng bật định vị rồi thử lại.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const confirm = () => {
    const center = mapRef.current?.getCenter();
    if (!center) return;
    if (!inDanang(center.lng, center.lat)) return setError('Vị trí phải nằm trong Đà Nẵng.');
    onConfirm([round6(center.lng), round6(center.lat)]);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Đặt vị trí căn trên bản đồ" className="fixed inset-0 z-[60] flex flex-col bg-white">
      <div className="flex items-center gap-2 px-2 h-14 border-b border-slate-100 shrink-0">
        <button type="button" onClick={onClose} aria-label="Đóng" className="w-11 h-11 flex items-center justify-center text-slate-600 hover:text-slate-900">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-slate-900">Đặt vị trí căn</h2>
      </div>

      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="w-full h-full bg-slate-100" />
        {!ready && <div className="absolute inset-0 bg-slate-200/70 animate-pulse motion-reduce:animate-none" aria-busy="true" aria-label="Đang tải bản đồ" />}
        {/* Ghim cố định giữa khung: mũi ghim đúng tâm bản đồ */}
        <MapPin className="absolute left-1/2 top-1/2 z-[500] w-10 h-10 -translate-x-1/2 -translate-y-full text-rose-600 fill-rose-600/20 drop-shadow-md pointer-events-none" aria-hidden />
        <p className="absolute left-2 right-16 top-2 z-[500] px-3 py-2 rounded-xl bg-white/95 text-sm text-slate-700 shadow-sm">Kéo bản đồ để mũi ghim đúng cửa nhà / tòa nhà</p>
      </div>

      <div className="shrink-0 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] space-y-2 border-t border-slate-100">
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          {'geolocation' in navigator && (
            <button type="button" onClick={useMyLocation} disabled={locating || !ready} className="min-h-[48px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 active:bg-slate-100 disabled:opacity-60 transition-colors duration-100">
              {locating ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <LocateFixed className="w-4 h-4" aria-hidden />}
              Vị trí hiện tại
            </button>
          )}
          <button type="button" onClick={confirm} disabled={!ready} className={`${'geolocation' in navigator ? '' : 'col-span-2'} min-h-[48px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold active:bg-indigo-700 disabled:opacity-60 transition-colors duration-100`}>
            <Check className="w-4 h-4" aria-hidden /> Xác nhận vị trí
          </button>
        </div>
      </div>
    </div>
  );
};
