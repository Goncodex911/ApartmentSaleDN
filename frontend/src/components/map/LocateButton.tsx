import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { LocateFixed, Loader2 } from 'lucide-react';

const DENIED = 'Bạn đã tắt quyền vị trí cho app. Bật lại trong Cài đặt trình duyệt rồi thử lại.';
const FAILED = 'Không lấy được vị trí hiện tại. Vui lòng bật định vị trên điện thoại.';

/**
 * Nút "Vị trí của tôi" (Story 15.1): bay tới GPS của CTV, chấm xanh + vòng sai số (accuracy, mét).
 * Vị trí chỉ dùng trên máy — không gửi server, không lưu.
 */
export const LocateButton: React.FC<{ getMap: () => L.Map | null; onLocated?: (latlng: L.LatLng) => void }> = ({ getMap, onLocated }) => {
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('');
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 4000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => () => void layerRef.current?.remove(), []);

  if (!('geolocation' in navigator)) return null;

  const locate = () => {
    setLocating(true);
    setMessage('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const map = getMap();
        if (!map) return;
        const here: L.LatLngTuple = [coords.latitude, coords.longitude];
        onLocated?.(L.latLng(here));
        layerRef.current?.remove();
        layerRef.current = L.layerGroup([
          L.circle(here, { radius: coords.accuracy, color: '#2563eb', weight: 1, fillOpacity: 0.1, interactive: false }),
          L.marker(here, { icon: L.divIcon({ className: '', iconSize: [18, 18], html: '<span class="locate-dot"></span>' }), interactive: false, keyboard: false }),
        ]).addTo(map);
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) map.setView(here, 16);
        else map.flyTo(here, 16, { duration: 0.8 });
      },
      (error) => {
        setLocating(false);
        setMessage(error.code === error.PERMISSION_DENIED ? DENIED : FAILED);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={locate}
        disabled={locating}
        aria-label="Vị trí của tôi"
        title="Vị trí của tôi"
        className="absolute right-2.5 top-[86px] z-[1000] w-11 h-11 flex items-center justify-center rounded-xl bg-white text-slate-700 shadow-md border border-slate-200 active:bg-slate-100 transition-colors duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
      >
        {locating ? <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none" aria-hidden /> : <LocateFixed className="w-5 h-5" aria-hidden />}
      </button>
      {message && (
        <p role="status" className="absolute left-2 right-16 top-2 z-[1000] px-3 py-2 rounded-xl bg-slate-900/90 text-white text-sm shadow-md">
          {message}
        </p>
      )}
    </>
  );
};
