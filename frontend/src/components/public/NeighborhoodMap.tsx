import React, { useEffect, useRef, useState } from 'react';
import { Coffee, Navigation, ShoppingBag, Waves } from 'lucide-react';
import { PublicListing } from '../../api/shareApi.js';
import { TILE_ATTRIBUTION, TILE_URL } from '../../utils/mapTiles.js';
import { formatDistance } from '../../utils/distance.js';
import { Lang } from '../../utils/shareLang.js';
import { PUBLIC_COPY } from '../../utils/publicCopy.js';

const APPROX_RADIUS_M = 500;
const NEARBY_ICON = { BEACH: Waves, MARKET: ShoppingBag, NIGHTLIFE: Coffee } as const;

/**
 * Story 15.5: bản đồ trang khách — đúng vị trí (EXACT → ghim), vị trí theo tên đường / khu vực → vòng mờ "gần đúng".
 * Leaflet chỉ tải khi cuộn tới gần (không làm nặng lần mở trang). Khóa kéo 1 ngón để không kẹt cuộn trang.
 */
export const NeighborhoodMap: React.FC<{ listing: PublicListing; lang: Lang }> = ({ listing, lang }) => {
  const copy = PUBLIC_COPY[lang];
  const { location, nearby } = listing;
  const boxRef = useRef<HTMLDivElement>(null);
  const mapBoxRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setVisible(true), { rootMargin: '200px' });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !location.coordinates || !mapBoxRef.current) return;
    let map: import('leaflet').Map | undefined;
    let disposed = false;
    const [lng, lat] = location.coordinates;
    Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]).then(([{ default: L }]) => {
      if (disposed || !mapBoxRef.current) return;
      const exact = location.precision === 'EXACT';
      map = L.map(mapBoxRef.current, { dragging: false, scrollWheelZoom: false, zoomControl: false }).setView([lat, lng], exact ? 16 : 15);
      L.tileLayer(TILE_URL, { maxZoom: 20, attribution: TILE_ATTRIBUTION }).addTo(map);
      map.attributionControl.setPrefix(false);
      if (exact) L.marker([lat, lng], { icon: L.divIcon({ className: '', iconSize: [22, 22], html: '<span class="public-pin"></span>' }), keyboard: false, interactive: false }).addTo(map);
      else L.circle([lat, lng], { radius: APPROX_RADIUS_M, color: '#3b82f6', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.15, interactive: false }).addTo(map);
    });
    return () => {
      disposed = true;
      map?.remove();
    };
  }, [visible, location.coordinates, location.precision]);

  const directions = location.coordinates ? `https://www.google.com/maps/search/?api=1&query=${location.coordinates[1]},${location.coordinates[0]}` : null;

  return (
    <section ref={boxRef} className="space-y-2" aria-label={copy.mapTitle}>
      <h2 className="text-sm font-semibold text-slate-900">{copy.mapTitle}</h2>
      {location.coordinates && <div ref={mapBoxRef} className="h-56 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 isolate" />}
      <div className="flex items-start gap-3">
        <p className="flex-1 min-w-0 text-sm text-slate-800">
          {location.buildingName && <span className="block font-semibold">{location.buildingName}</span>}
          {location.fullAddress}
          {location.coordinates && location.precision !== 'EXACT' && <span className="block text-xs text-slate-600">{copy.approxNote}</span>}
        </p>
        {directions && (
          <a href={directions} target="_blank" rel="noopener noreferrer" className="shrink-0 min-h-[44px] inline-flex items-center gap-1.5 px-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 active:bg-slate-100 transition-colors duration-100">
            <Navigation className="w-4 h-4" aria-hidden /> {copy.directions}
          </a>
        )}
      </div>
      {nearby.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {nearby.map((item) => {
            const Icon = NEARBY_ICON[item.group];
            return (
              <li key={item.group} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 text-sm text-sky-900">
                <Icon className="w-4 h-4 shrink-0" aria-hidden />
                {copy.nearby(lang === 'en' ? item.nameEn : item.name, formatDistance(item.distanceM), item.walkMinutes)}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
