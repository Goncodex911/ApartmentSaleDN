import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapLandmark, MapPin, Poi } from '../../api/apartmentApi.js';
import { drawLandmark, drawPois } from './mapOverlays.js';
import { priceShort } from '../../utils/priceShort.js';
import { clusterPoints } from '../../utils/mapCluster.js';
import { spiderfyOffsets } from '../../utils/spiderfy.js';
import { DANANG_CENTER, TILE_ATTRIBUTION, TILE_URL } from '../../utils/mapTiles.js';
import { LocateButton } from './LocateButton.js';
import { STATUS_STYLE } from '../../utils/statusStyle.js'; // Màu bong bóng theo trạng thái — dùng chung toàn app (Story 12.1)

const NO_CLUSTER_ZOOM = 17; // Phóng to tới mức này thì hiện từng ghim
// Story 15.2: tản nhóm trùng vị trí (< 15m) từ mức phóng 16; > 15 căn trải quá bề ngang điện thoại 390px → giữ danh sách
const SAME_PLACE_M = 15;
const SPIDER_ZOOM = 16;
const SPIDER_MAX = 15;
const OPEN_MS = 200;
const COLLAPSE_MS = 160;
const SPIDER_CLASS: Record<SpiderPhase, string> = { opening: 'spider-pin', open: '', collapsing: 'spider-pin is-collapsing' };
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const toLatLng = (pin: MapPin): L.LatLngTuple => [pin.coordinates[1], pin.coordinates[0]];

type SpiderPhase = 'opening' | 'open' | 'collapsing';
type SpiderOffset = { x: number; y: number; phase: SpiderPhase };

/** Bong bóng giá. `spider`: ghim đã tản (Story 15.2) — canh giữa điểm, trượt ra từ tâm (hoặc về tâm khi thu). */
function pillIcon(pin: MapPin, selected: boolean, spider?: SpiderOffset) {
  const outline = pin.approximate ? 'border-2 border-dashed border-white/90' : 'border-2 border-white';
  const lift = selected ? 'scale-110 ring-4 ring-indigo-500/40' : '';
  const pill = `<span class="inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-[13px] font-bold shadow-md shadow-slate-900/25 transition-transform duration-150 ${outline} ${lift} ${STATUS_STYLE[pin.status].solid}">${priceShort(pin.price, pin.priceUsd)}</span>`;
  const html = spider
    ? `<div class="w-max -translate-x-1/2 -translate-y-1/2"><div class="${SPIDER_CLASS[spider.phase]}" style="--dx:${-spider.x}px;--dy:${-spider.y}px">${pill}</div></div>`
    : `<div class="w-max -translate-x-1/2 -translate-y-full pb-1">${pill}</div>`; // Dịch lên để mũi bong bóng chạm đúng vị trí
  return L.divIcon({ className: '', iconSize: [0, 0], html }); // Kích thước theo nội dung
}

function clusterIcon(count: number) {
  const size = count >= 50 ? 52 : count >= 10 ? 46 : 40;
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    html: `<span class="flex w-full h-full items-center justify-center rounded-full bg-brand-navy text-white text-sm font-bold ring-4 ring-brand-navy/25 shadow-md">${count}</span>`,
  });
}

export interface MapView {
  bbox: string; // "minLng,minLat,maxLng,maxLat" (Story 15.3)
  center: L.LatLng;
  zoom: number;
}

interface ApartmentMapProps {
  pins: MapPin[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void; // 1 căn → thẻ xem nhanh; nhiều căn trùng vị trí → danh sách
  landmark?: MapLandmark | null; // Story 15.4: vòng bán kính điểm mốc đang tìm
  pois?: Poi[]; // Story 15.4: tiện ích đang bật
  fitToPins?: boolean; // Story 15.3: false khi tìm theo khung nhìn → bản đồ đứng yên
  onViewChange?: (view: MapView) => void;
}

/**
 * Bản đồ căn hộ (Story 11.2) — gọi Leaflet trực tiếp, không cần react-leaflet. Ghim gần nhau gom theo ô lưới 60px
 * (utils/mapCluster); bấm cụm → phóng to vào cụm, cụm toàn căn trùng toạ độ (ước lượng theo tâm quận) → mở danh sách.
 */
const ApartmentMap: React.FC<ApartmentMapProps> = ({ pins, selectedIds, onSelect, landmark, pois = [], fitToPins = true, onViewChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const landmarkLayerRef = useRef<L.LayerGroup | null>(null);
  const poiLayerRef = useRef<L.LayerGroup | null>(null);
  const userPosRef = useRef<L.LatLng | null>(null); // Vị trí GPS gần nhất (15.1) — chỉ để tính khoảng cách tới tiện ích
  const viewChangeRef = useRef(onViewChange);
  viewChangeRef.current = onViewChange;
  const [zoomVersion, setZoomVersion] = useState(0);
  const [spider, setSpider] = useState<{ key: string; phase: SpiderPhase } | null>(null); // Story 15.2: nhóm đang tản

  useEffect(() => {
    const reduceMotion = prefersReducedMotion();
    const map = L.map(containerRef.current!, {
      zoomControl: false,
      zoomAnimation: !reduceMotion,
      markerZoomAnimation: !reduceMotion,
      fadeAnimation: !reduceMotion,
    }).setView(DANANG_CENTER, 13);
    L.tileLayer(TILE_URL, { maxZoom: 20, attribution: TILE_ATTRIBUTION }).addTo(map); // Story 15.1: CARTO / OSM theo cấu hình
    L.control.zoom({ position: 'topright' }).addTo(map);
    map.attributionControl.setPrefix(false); // Bỏ chữ "Leaflet", giữ nguồn OSM / CARTO bắt buộc
    landmarkLayerRef.current = L.layerGroup().addTo(map);
    poiLayerRef.current = L.layerGroup().addTo(map);
    layerRef.current = L.layerGroup().addTo(map); // Bong bóng giá nằm trên cùng
    map.on('zoomend', () => setZoomVersion((version) => version + 1));
    map.on('moveend', () => viewChangeRef.current?.({ bbox: map.getBounds().toBBoxString(), center: map.getCenter(), zoom: map.getZoom() }));
    // Chạm vùng trống → thu ghim đã tản; phóng to / thu nhỏ → bỏ tản ngay (vị trí pixel đổi)
    map.on('click', () => setSpider((current) => (current && current.phase !== 'collapsing' ? { ...current, phase: 'collapsing' } : current)));
    map.on('zoomstart', () => setSpider(null));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Bộ lọc đổi → canh khung vừa đủ các ghim. Không canh khi đang tìm theo khung nhìn (15.3) hoặc có điểm mốc (canh theo vòng)
  const pinKey = pins.map((pin) => pin._id).join(',');
  useEffect(() => {
    const map = mapRef.current;
    if (!map || pins.length === 0 || !fitToPins || landmark) return;
    map.fitBounds(L.latLngBounds(pins.map(toLatLng)), { padding: [48, 48], maxZoom: 16 });
  }, [pinKey]); // Chỉ canh lại khi tập căn đổi, không phải khi giá / trạng thái đổi (real-time)

  // Story 15.4: vòng bán kính điểm mốc + canh khung bao trọn vòng
  const landmarkKey = landmark ? `${landmark.coordinates.join(',')}:${landmark.radiusKm}` : '';
  useEffect(() => {
    const map = mapRef.current;
    const layer = landmarkLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (landmark) map.fitBounds(drawLandmark(layer, landmark), { padding: [24, 24] });
  }, [landmarkKey]);

  // Story 15.4: tiện ích đang bật; chạm → khoảng cách tới vị trí GPS của bạn, không có thì tới điểm mốc đang tìm
  const landmarkRef = useRef(landmark);
  landmarkRef.current = landmark;
  useEffect(() => {
    const layer = poiLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    drawPois(layer, pois, () => {
      if (userPosRef.current) return { latlng: userPosRef.current, label: 'bạn' };
      const current = landmarkRef.current;
      return current ? { latlng: L.latLng(current.coordinates[1], current.coordinates[0]), label: current.name } : null;
    });
  }, [pois]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const zoom = map.getZoom();
    const points = pins.map((pin) => ({ ...map.project(toLatLng(pin), zoom), item: pin }));
    // Phóng sát: chỉ gom các ghim đè hẳn lên nhau (ô 6px) để còn tản được
    const clusters = clusterPoints(points, zoom >= NO_CLUSTER_ZOOM ? 6 : 60);
    const addPill = (pin: MapPin, position: L.LatLngExpression, offset?: SpiderOffset) =>
      L.marker(position, { icon: pillIcon(pin, selectedIds.includes(pin._id), offset), title: `${priceShort(pin.price, pin.priceUsd)} – ${pin.street || pin.zone || pin.district}`, riseOnHover: true })
        .on('click', () => onSelect([pin._id]))
        .addTo(layer);

    for (const cluster of clusters) {
      const position = map.unproject([cluster.x, cluster.y], zoom);
      const [first] = cluster.items;
      if (cluster.items.length === 1) {
        addPill(first, position);
        continue;
      }
      const bounds = L.latLngBounds(cluster.items.map(toLatLng));
      const samePlace = bounds.getNorthEast().distanceTo(bounds.getSouthWest()) < SAME_PLACE_M;
      const canSpiderfy = samePlace && zoom >= SPIDER_ZOOM && cluster.items.length <= SPIDER_MAX;

      // Story 15.2: nhóm trùng vị trí đang tản → chấm gốc + chân mảnh + từng bong bóng giá
      if (canSpiderfy && spider?.key === first._id) {
        L.circleMarker(position, { radius: 4, color: '#0f2a45', fillOpacity: 1, interactive: false }).addTo(layer);
        spiderfyOffsets(cluster.items.length).forEach((offset, i) => {
          const spot = map.unproject([cluster.x + offset.x, cluster.y + offset.y], zoom);
          L.polyline([position, spot], { color: '#475569', weight: 1.5, opacity: 0.5, interactive: false }).addTo(layer);
          addPill(cluster.items[i], spot, { ...offset, phase: spider.phase });
        });
        continue;
      }
      L.marker(position, { icon: clusterIcon(cluster.items.length), title: `${cluster.items.length} căn` })
        .on('click', () => {
          if (canSpiderfy) setSpider({ key: first._id, phase: 'opening' });
          else if (samePlace || zoom >= NO_CLUSTER_ZOOM - 1) onSelect(cluster.items.map((pin) => pin._id)); // > 15 căn (thường dồn tâm quận) → danh sách
          else map.fitBounds(bounds, { padding: [64, 64] });
        })
        .addTo(layer);
    }
  }, [pins, zoomVersion, selectedIds, onSelect, spider]);

  // Hiệu ứng chỉ chạy lúc mở / thu (chọn ghim, real-time vẽ lại không làm ghim bay ra lần nữa).
  // Thu: chạy ngược cùng đường về tâm rồi mới gỡ; giảm chuyển động → đổi ngay
  useEffect(() => {
    if (!spider || spider.phase === 'open') return;
    const done = () => setSpider(spider.phase === 'opening' ? { ...spider, phase: 'open' } : null);
    const timer = setTimeout(done, prefersReducedMotion() ? 0 : spider.phase === 'opening' ? OPEN_MS : COLLAPSE_MS);
    return () => clearTimeout(timer);
  }, [spider]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full bg-slate-100" role="region" aria-label="Bản đồ căn hộ" />
      <LocateButton getMap={() => mapRef.current} onLocated={(latlng) => (userPosRef.current = latlng)} />
    </div>
  );
};

export default ApartmentMap;
