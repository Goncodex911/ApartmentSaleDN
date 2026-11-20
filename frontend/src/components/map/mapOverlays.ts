import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import { Flag, LucideIcon } from 'lucide-react';
import { MapLandmark, Poi } from '../../api/apartmentApi.js';
import { POI_GROUPS } from './poiStyle.js';
import { formatDistance } from '../../utils/distance.js';

// Leaflet divIcon cần chuỗi HTML → dựng icon lucide thành SVG tĩnh (không dùng emoji làm icon)
const svg = (icon: LucideIcon, size = 16) => renderToStaticMarkup(createElement(icon, { size, 'aria-hidden': true }));
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
const toLatLng = ([lng, lat]: [number, number]): L.LatLngTuple => [lat, lng];

/** Story 15.4: vòng bán kính indigo + cờ tên điểm mốc. Trả về khung bao vòng để canh bản đồ. */
export function drawLandmark(layer: L.LayerGroup, landmark: MapLandmark): L.LatLngBounds {
  const center = toLatLng(landmark.coordinates);
  const circle = L.circle(center, { radius: landmark.radiusKm * 1000, color: '#4f46e5', weight: 2, fillOpacity: 0.08, interactive: false }).addTo(layer);
  L.marker(center, {
    icon: L.divIcon({
      className: '',
      iconSize: [0, 0],
      html: `<div class="w-max -translate-x-1/2 -translate-y-full flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-md ring-2 ring-white">${svg(Flag, 14)}${escapeHtml(landmark.name)} · ${landmark.radiusKm}km</div>`,
    }),
    interactive: false,
    keyboard: false,
    zIndexOffset: -1000, // Nằm dưới bong bóng giá: giá căn quan trọng hơn nhãn mốc
  }).addTo(layer);
  return circle.getBounds();
}

/**
 * Story 15.4: icon tiện ích 28px trong vùng chạm 44px. Chạm → tên + khoảng cách tới vị trí của bạn (GPS) hoặc điểm mốc đang tìm.
 */
export function drawPois(layer: L.LayerGroup, pois: Poi[], reference: () => { latlng: L.LatLng; label: string } | null) {
  for (const poi of pois) {
    const style = POI_GROUPS.find((group) => group.id === poi.group)!;
    const position = L.latLng(toLatLng(poi.coordinates));
    L.marker(position, {
      title: poi.name,
      icon: L.divIcon({
        className: '',
        iconSize: [44, 44],
        html: `<span class="flex w-full h-full items-center justify-center"><span class="flex w-7 h-7 items-center justify-center rounded-full ${style.bg} text-white ring-2 ring-white shadow-md">${svg(style.icon)}</span></span>`,
      }),
    })
      .bindPopup(() => {
        const ref = reference();
        const distance = ref ? `<br><span class="text-slate-600">Cách ${escapeHtml(ref.label)} ${formatDistance(ref.latlng.distanceTo(position))}</span>` : '';
        return `<strong>${escapeHtml(poi.name)}</strong>${distance}`;
      })
      .addTo(layer);
  }
}
