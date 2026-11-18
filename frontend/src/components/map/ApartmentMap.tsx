import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from '../../api/apartmentApi.js';
import { priceShort } from '../../utils/priceShort.js';
import { clusterPoints } from '../../utils/mapCluster.js';

const DANANG_CENTER: L.LatLngTuple = [16.0544, 108.2022];
// Tile OSM chuẩn (không dùng kiểu cũ {s}.tile...) — chính sách OSM bắt buộc ghi nguồn; service worker KHÔNG cache tile này
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
const NO_CLUSTER_ZOOM = 17; // Phóng to tới mức này thì hiện từng ghim
// Màu theo trạng thái, chữ tương phản ≥ 4.5:1 (xanh = Trống, cam = Sắp trống, xám = Đã cọc)
const PILL_TONE: Record<MapPin['status'], string> = {
  AVAILABLE: 'bg-emerald-700 text-white',
  UPCOMING: 'bg-amber-400 text-slate-900',
  DEPOSITED: 'bg-slate-500 text-white',
  RENTED: 'bg-slate-500 text-white',
};

const toLatLng = (pin: MapPin): L.LatLngTuple => [pin.coordinates[1], pin.coordinates[0]];

function pillIcon(pin: MapPin, selected: boolean) {
  const outline = pin.approximate ? 'border-2 border-dashed border-white/90' : 'border-2 border-white';
  const lift = selected ? 'scale-110 ring-4 ring-indigo-500/40' : '';
  return L.divIcon({
    className: '',
    iconSize: [0, 0], // Kích thước theo nội dung; dịch lên để mũi bong bóng chạm đúng vị trí
    html: `<div class="w-max -translate-x-1/2 -translate-y-full pb-1"><span class="inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-[13px] font-bold shadow-md shadow-slate-900/25 transition-transform duration-150 ${outline} ${lift} ${PILL_TONE[pin.status]}">${priceShort(pin.price, pin.priceUsd)}</span></div>`,
  });
}

function clusterIcon(count: number) {
  const size = count >= 50 ? 52 : count >= 10 ? 46 : 40;
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    html: `<span class="flex w-full h-full items-center justify-center rounded-full bg-brand-navy text-white text-sm font-bold ring-4 ring-brand-navy/25 shadow-md">${count}</span>`,
  });
}

interface ApartmentMapProps {
  pins: MapPin[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void; // 1 căn → thẻ xem nhanh; nhiều căn trùng vị trí → danh sách
}

/**
 * Bản đồ căn hộ (Story 11.2) — gọi Leaflet trực tiếp, không cần react-leaflet. Ghim gần nhau gom theo ô lưới 60px
 * (utils/mapCluster); bấm cụm → phóng to vào cụm, cụm toàn căn trùng toạ độ (ước lượng theo tâm quận) → mở danh sách.
 */
const ApartmentMap: React.FC<ApartmentMapProps> = ({ pins, selectedIds, onSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [zoomVersion, setZoomVersion] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const map = L.map(containerRef.current!, {
      zoomControl: false,
      zoomAnimation: !reduceMotion,
      markerZoomAnimation: !reduceMotion,
      fadeAnimation: !reduceMotion,
    }).setView(DANANG_CENTER, 13);
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    map.attributionControl.setPrefix(false); // Bỏ chữ "Leaflet", giữ nguồn OSM bắt buộc
    layerRef.current = L.layerGroup().addTo(map);
    map.on('zoomend', () => setZoomVersion((version) => version + 1));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Bộ lọc đổi → canh khung vừa đủ các ghim
  const pinKey = pins.map((pin) => pin._id).join(',');
  useEffect(() => {
    const map = mapRef.current;
    if (!map || pins.length === 0) return;
    map.fitBounds(L.latLngBounds(pins.map(toLatLng)), { padding: [48, 48], maxZoom: 16 });
  }, [pinKey]); // Chỉ canh lại khi tập căn đổi, không phải khi giá / trạng thái đổi (real-time)

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const zoom = map.getZoom();
    const points = pins.map((pin) => ({ ...map.project(toLatLng(pin), zoom), item: pin }));
    const clusters = zoom >= NO_CLUSTER_ZOOM ? points.map((p) => ({ x: p.x, y: p.y, items: [p.item] })) : clusterPoints(points);

    for (const cluster of clusters) {
      const position = map.unproject([cluster.x, cluster.y], zoom);
      const [first] = cluster.items;
      if (cluster.items.length === 1) {
        L.marker(position, { icon: pillIcon(first, selectedIds.includes(first._id)), title: `${priceShort(first.price, first.priceUsd)} – ${first.street || first.zone || first.district}`, riseOnHover: true })
          .on('click', () => onSelect([first._id]))
          .addTo(layer);
        continue;
      }
      const bounds = L.latLngBounds(cluster.items.map(toLatLng));
      const samePlace = bounds.getNorthEast().distanceTo(bounds.getSouthWest()) < 30; // mét
      L.marker(position, { icon: clusterIcon(cluster.items.length), title: `${cluster.items.length} căn` })
        .on('click', () => (samePlace || zoom >= NO_CLUSTER_ZOOM - 1 ? onSelect(cluster.items.map((pin) => pin._id)) : map.fitBounds(bounds, { padding: [64, 64] })))
        .addTo(layer);
    }
  }, [pins, zoomVersion, selectedIds, onSelect]);

  return <div ref={containerRef} className="w-full h-full bg-slate-100" role="region" aria-label="Bản đồ căn hộ" />;
};

export default ApartmentMap;
