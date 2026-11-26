import React, { useEffect, useRef, useState, useMemo } from 'react';
import type * as Leaflet from 'leaflet';
import {
  Check,
  ChevronRight,
  ExternalLink,
  Layers,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
} from 'lucide-react';
import { apartmentApi, Apartment } from '../../api/apartmentApi.js';
import { DANANG_CENTER, DANANG_LNG_LAT, TILE_ATTRIBUTION, TILE_URL, isLngLat } from '../../utils/mapTiles.js';
import { ZONES } from '../../utils/danang.js';
import { priceShort } from '../../utils/priceShort.js';

const SATELLITE_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SATELLITE_ATTRIBUTION = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS';

const inDanang = (lng: number, lat: number) => lng >= 107.85 && lng <= 108.45 && lat >= 15.80 && lat <= 16.30;
const round6 = (value: number) => Number(value.toFixed(6));

export const MapQAPage: React.FC = () => {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [exactCount, setExactCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zone, setZone] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Map state
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerRef = useRef<Leaflet.Marker | null>(null);
  const tileLayerRef = useRef<Leaflet.TileLayer | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState<'STREET' | 'SATELLITE'>('STREET');
  const [currentCoords, setCurrentCoords] = useState<[number, number] | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const selected = useMemo(
    () => apartments.find((a) => a._id === selectedId) || null,
    [apartments, selectedId]
  );

  const fetchPending = async (targetZone = zone) => {
    setLoading(true);
    try {
      const data = await apartmentApi.getMapQAPending({ zone: targetZone || undefined, limit: 50 });
      setApartments(data.apartments);
      setTotalCount(data.totalCount);
      setExactCount(data.exactCount);
      setPendingCount(data.pendingCount);

      // Đổi khu vực: căn đang chọn không còn trong danh sách → chọn căn đầu (thanh Lưu không biến mất)
      setSelectedId((current) => (data.apartments.some((a) => a._id === current) ? current : data.apartments[0]?._id ?? null));
    } catch {
      // Bỏ qua lỗi
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, [zone]);

  // Khởi tạo Leaflet Map
  useEffect(() => {
    let disposed = false;
    Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]).then(([{ default: L }]) => {
      if (disposed || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView(
        DANANG_CENTER,
        13
      );
      const layer = L.tileLayer(TILE_URL, { maxZoom: 20, attribution: TILE_ATTRIBUTION }).addTo(map);
      tileLayerRef.current = layer;
      L.control.zoom({ position: 'topright' }).addTo(map);
      map.attributionControl.setPrefix(false);

      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      disposed = true;
      mapRef.current?.remove();
    };
  }, []);

  // Đổi giữa lớp đường phố và vệ tinh
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

  // Cập nhật marker khi chọn căn hộ
  useEffect(() => {
    if (!mapReady || !mapRef.current || !selected) return;

    import('leaflet').then(({ default: L }) => {
      if (!mapRef.current) return;

      // Căn chưa có tọa độ (mảng rỗng) → đặt ghim ở tâm Đà Nẵng để kéo tới đúng vị trí, không làm sập bản đồ
      const saved = selected.location?.coordinates;
      const coords: [number, number] = isLngLat(saved) ? saved : DANANG_LNG_LAT;
      setCurrentCoords(coords);

      const icon = L.divIcon({
        className: 'custom-calibrator-pin',
        html: `
          <div style="background-color: #f97316; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; cursor: grab;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      if (markerRef.current) {
        markerRef.current.setLatLng([coords[1], coords[0]]);
        markerRef.current.setIcon(icon);
      } else {
        const marker = L.marker([coords[1], coords[0]], { draggable: true, icon }).addTo(mapRef.current);
        marker.on('drag', () => {
          const latLng = marker.getLatLng();
          setCurrentCoords([round6(latLng.lng), round6(latLng.lat)]);
        });
        markerRef.current = marker;
      }

      mapRef.current.flyTo([coords[1], coords[0]], 18, { duration: 0.8 });
    });
  }, [selectedId, mapReady]);

  // Phím tắt điều hướng & Lưu nhanh
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!apartments.length) return;
      const currentIndex = apartments.findIndex((a) => a._id === selectedId);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = apartments[(currentIndex + 1) % apartments.length];
        setSelectedId(next._id);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = apartments[(currentIndex - 1 + apartments.length) % apartments.length];
        setSelectedId(prev._id);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [apartments, selectedId, currentCoords]);

  // Lưu vị trí căn và tự chuyển sang căn kế tiếp
  const handleSave = async () => {
    if (!selected || !currentCoords || saving) return;
    const [lng, lat] = currentCoords;
    if (!inDanang(lng, lat)) {
      setToast('⚠️ Vị trí phải nằm trong khu vực Đà Nẵng.');
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setSaving(true);
    try {
      await apartmentApi.calibrateLocation(selected._id, [lng, lat]);
      setToast('✅ Đã chuẩn hóa vị trí 100%!');
      setTimeout(() => setToast(null), 2000);

      // Cập nhật danh sách: bỏ căn vừa chuẩn hóa
      const nextList = apartments.filter((a) => a._id !== selected._id);
      setApartments(nextList);
      setExactCount((c) => c + 1);
      setPendingCount((c) => Math.max(0, c - 1));

      if (nextList.length > 0) {
        setSelectedId(nextList[0]._id);
      } else {
        setSelectedId(null);
      }
    } catch {
      setToast('❌ Lỗi khi lưu vị trí. Thử lại.');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const progressPercent = totalCount > 0 ? Math.round((exactCount / totalCount) * 100) : 100;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
      {/* Toast thông báo */}
      {toast && (
        <div className="fixed top-16 right-4 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Main Split-Screen Container */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Left Column: Căn hộ cần chuẩn hóa (~400px) */}
        <div className="w-full md:w-[420px] flex flex-col border-r border-slate-200 bg-white shrink-0 z-10">
          {/* Header & Thanh Tiến Độ */}
          <div className="p-4 border-b border-slate-100 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base font-bold text-slate-900">Rà Soát Bản Đồ (Map QA)</h1>
                <p className="text-xs text-slate-500">Kéo ghim nóc nhà & bấm Lưu để đạt 100%</p>
              </div>
              <button
                type="button"
                onClick={() => fetchPending()}
                disabled={loading}
                aria-label="Làm mới"
                className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Thanh tiến độ */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700">Tiến độ chuẩn hóa vị trí</span>
                <span className="text-emerald-700">{exactCount}/{totalCount} ({progressPercent}%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-700 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Cần xử lý: {pendingCount} căn</span>
                <span className="text-slate-400">Dùng phím ↑ ↓ để chuyển căn</span>
              </div>
            </div>

            {/* Bộ lọc Khu vực */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setZone('')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  !zone ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả
              </button>
              {ZONES.map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZone(z)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    zone === z ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>

          {/* Danh sách căn chờ duyệt */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0">
            {loading && apartments.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-sm text-slate-600 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-800" />
                Đang tải danh sách căn...
              </div>
            ) : apartments.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 flex items-center justify-center text-emerald-800">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Tuyệt vời!</h3>
                <p className="text-xs text-slate-600">Toàn bộ căn hộ trong khu vực này đã có vị trí chính xác 100%.</p>
              </div>
            ) : (
              apartments.map((item) => {
                const isSelected = item._id === selectedId;
                const photo = item.images?.[0];
                const precision = item.location?.geoPrecision || 'APPROXIMATE';

                return (
                  <div
                    key={item._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(item._id)}
                    className={`flex items-start gap-3 p-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-amber-50/80 border-l-4 border-amber-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200/60">
                      {photo ? (
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <MapPin className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-emerald-800">
                          {priceShort(item.price)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                          {precision === 'STREET' ? 'Tên đường' : 'Tâm quận'}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 truncate">{item.title}</h4>
                      <p className="text-[11px] text-slate-600 truncate">
                        📍 {item.location?.street || item.location?.address || 'Chưa có tên đường'}
                        {item.location?.zone ? ` · ${item.location.zone}` : ''}
                      </p>
                    </div>

                    <ChevronRight className={`w-4 h-4 shrink-0 mt-2 ${isSelected ? 'text-amber-700' : 'text-slate-300'}`} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Bản đồ tương tác & Bảng điều khiển vị trí */}
        <div className="flex-1 relative flex flex-col min-h-0 bg-slate-100">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Controls Overlay Trên Bản Đồ */}
          <div className="absolute top-4 left-4 z-[500] flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMapType}
              className={`h-9 px-3 inline-flex items-center gap-1.5 rounded-xl text-xs font-semibold border shadow-md backdrop-blur-md transition-colors ${
                mapType === 'SATELLITE'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" aria-hidden />
              {mapType === 'SATELLITE' ? 'Vệ tinh' : 'Đường phố'}
            </button>

            {selected?.location?.mapUrl && (
              <a
                href={selected.location.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="h-9 px-3 inline-flex items-center gap-1.5 rounded-xl text-xs font-semibold bg-white/95 text-blue-700 border border-slate-200 shadow-md hover:bg-white transition-colors backdrop-blur-md"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Mở link Maps gốc
              </a>
            )}
          </div>

          {/* Action Bar Nổi Dưới Đáy Bản Đồ */}
          {selected && (
            <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[28rem] z-[500] p-4 rounded-2xl bg-white/95 border border-slate-200/80 shadow-2xl backdrop-blur-md space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Căn đang chọn</h3>
                  <p className="text-sm font-semibold text-slate-900 truncate max-w-[280px]">
                    {selected.title}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono text-slate-600 block">
                    {currentCoords ? `${currentCoords[1].toFixed(5)}, ${currentCoords[0].toFixed(5)}` : 'Đang lấy...'}
                  </span>
                  <span className="text-[10px] text-amber-800 font-medium">Kéo ghim đến nóc nhà</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selected.location?.coordinates && mapRef.current) {
                      mapRef.current.flyTo([selected.location.coordinates[1], selected.location.coordinates[0]], 18);
                    }
                  }}
                  className="h-11 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Căn tâm
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 h-11 px-4 rounded-xl bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 shadow-lg shadow-emerald-700/20 active:bg-emerald-900 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Lưu vị trí chính xác (Ctrl+S)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
