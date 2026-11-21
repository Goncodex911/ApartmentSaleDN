import React, { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { Check, Layers, LocateFixed, Loader2, MapPin, X } from 'lucide-react';
import { DANANG_CENTER, TILE_ATTRIBUTION, TILE_URL } from '../../utils/mapTiles.js';
import { reverseGeocodeDanang } from '../../utils/reverseGeocoding.js';
import { Zone } from '../../utils/danang.js';

const SATELLITE_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SATELLITE_ATTRIBUTION = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP';

const inDanang = (lng: number, lat: number) => lng >= 107.85 && lng <= 108.45 && lat >= 15.80 && lat <= 16.30;
const round6 = (value: number) => Number(value.toFixed(6));

interface LocationPickerProps {
  initial?: [number, number];
  onConfirm: (coordinates: [number, number], info?: { street?: string; zone?: Zone; ward?: string }) => void;
  onClose: () => void;
}

/**
 * Story 17.4: Đặt vị trí chính xác của căn trên bản đồ:
 * - Ghim cố định giữa khung, kéo bản đồ mượt mà (dễ thao tác 1 tay).
 * - Nút Vệ tinh / Đường phố (nhìn rõ nóc nhà / ban công).
 * - Bắt GPS hiện tại nơi môi giới đứng khảo sát.
 * - Tự động phân giải tên đường / khu vực (Reverse Geocoding).
 */
export const LocationPicker: React.FC<LocationPickerProps> = ({ initial, onConfirm, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const tileLayerRef = useRef<Leaflet.TileLayer | null>(null);

  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mapType, setMapType] = useState<'STREET' | 'SATELLITE'>('STREET');
  const [centerCoords, setCenterCoords] = useState<[number, number]>(() => initial || DANANG_CENTER);
  const [error, setError] = useState('');

  useEffect(() => {
    let disposed = false;
    Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]).then(([{ default: L }]) => {
      if (disposed || !containerRef.current) return;
      const initialPos = initial ? [initial[1], initial[0]] as [number, number] : [DANANG_CENTER[1], DANANG_CENTER[0]] as [number, number];
      const map = L.map(containerRef.current, { zoomControl: false }).setView(initialPos, initial ? 18 : 14);

      const layer = L.tileLayer(TILE_URL, { maxZoom: 20, attribution: TILE_ATTRIBUTION }).addTo(map);
      tileLayerRef.current = layer;

      L.control.zoom({ position: 'topright' }).addTo(map);
      map.attributionControl.setPrefix(false);

      map.on('move', () => {
        const c = map.getCenter();
        setCenterCoords([round6(c.lng), round6(c.lat)]);
      });
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
  }, []);

  // Đổi giữa lớp Đường phố và Vệ tinh
  const toggleMapType = () => {
    if (!mapRef.current || !tileLayerRef.current) return;
    const nextType = mapType === 'STREET' ? 'SATELLITE' : 'STREET';
    setMapType(nextType);

    import('leaflet').then(({ default: L }) => {
      if (!mapRef.current) return;
      if (tileLayerRef.current) mapRef.current.removeLayer(tileLayerRef.current);

      const nextUrl = nextType === 'SATELLITE' ? SATELLITE_TILE_URL : TILE_URL;
      const nextAttr = nextType === 'SATELLITE' ? SATELLITE_ATTRIBUTION : TILE_ATTRIBUTION;
      const nextLayer = L.tileLayer(nextUrl, { maxZoom: 19, attribution: nextAttr }).addTo(mapRef.current);
      tileLayerRef.current = nextLayer;
    });
  };

  const useMyLocation = () => {
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        mapRef.current?.flyTo([coords.latitude, coords.longitude], 19, { duration: 1.2 });
      },
      () => {
        setLocating(false);
        setError('Không lấy được vị trí GPS. Vui lòng bật định vị trên thiết bị.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const confirm = async () => {
    const center = mapRef.current?.getCenter();
    if (!center) return;
    if (!inDanang(center.lng, center.lat)) {
      return setError('Vị trí phải nằm trong địa giới khu vực Đà Nẵng.');
    }

    const coords: [number, number] = [round6(center.lng), round6(center.lat)];
    setSubmitting(true);

    try {
      // Phân giải nhanh tên đường & khu vực ngược (reverse geocoding)
      const info = await reverseGeocodeDanang(coords[0], coords[1]);
      onConfirm(coords, {
        street: info.street,
        zone: info.zone as Zone | undefined,
        ward: info.ward,
      });
    } catch {
      onConfirm(coords);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Đặt vị trí căn trên bản đồ" className="fixed inset-0 z-[60] flex flex-col bg-white">
      <div className="flex items-center justify-between px-3 h-14 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} aria-label="Đóng" className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold text-slate-900">Đặt vị trí chính xác</h2>
        </div>

        {/* Nút đổi lớp bản đồ Vệ tinh */}
        <button
          type="button"
          onClick={toggleMapType}
          disabled={!ready}
          className={`h-9 px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            mapType === 'SATELLITE'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" aria-hidden />
          {mapType === 'SATELLITE' ? 'Vệ tinh' : 'Đường phố'}
        </button>
      </div>

      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="w-full h-full bg-slate-100" />
        {!ready && <div className="absolute inset-0 bg-slate-200/70 animate-pulse motion-reduce:animate-none" aria-busy="true" aria-label="Đang tải bản đồ" />}

        {/* Ghim cố định giữa khung: mũi ghim cắm đúng tâm bản đồ */}
        <MapPin className="absolute left-1/2 top-1/2 z-[500] w-10 h-10 -translate-x-1/2 -translate-y-full text-rose-600 fill-rose-600/25 drop-shadow-lg pointer-events-none" aria-hidden />

        <div className="absolute left-3 right-16 top-3 z-[500] flex flex-col gap-1 pointer-events-none">
          <p className="inline-block px-3 py-1.5 rounded-xl bg-white/95 text-xs font-medium text-slate-800 shadow-sm border border-slate-200/60 backdrop-blur-sm">
            🎯 Kéo bản đồ để mũi ghim đúng cửa nhà / nóc tòa nhà
          </p>
        </div>

        {/* Tọa độ hiện tại hiển thị nổi góc dưới bản đồ */}
        <div className="absolute left-3 bottom-3 z-[500] px-2.5 py-1 rounded-md bg-slate-900/80 text-[11px] font-mono text-slate-100 backdrop-blur-sm pointer-events-none">
          GPS: {centerCoords[1].toFixed(5)}, {centerCoords[0].toFixed(5)}
        </div>
      </div>

      <div className="shrink-0 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] space-y-2 border-t border-slate-100 bg-white">
        {error && <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          {'geolocation' in navigator && (
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating || !ready}
              className="min-h-[48px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 active:bg-slate-100 disabled:opacity-60 transition-colors duration-100"
            >
              {locating ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <LocateFixed className="w-4 h-4" aria-hidden />}
              Vị trí hiện tại
            </button>
          )}
          <button
            type="button"
            onClick={confirm}
            disabled={!ready || submitting}
            className={`${'geolocation' in navigator ? '' : 'col-span-2'} min-h-[48px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold active:bg-indigo-700 disabled:opacity-60 transition-colors duration-100`}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Check className="w-4 h-4" aria-hidden />}
            Xác nhận vị trí
          </button>
        </div>
      </div>
    </div>
  );
};
