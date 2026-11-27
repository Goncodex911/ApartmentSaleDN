import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Apartment, apartmentApi } from '../../api/apartmentApi.js';
import { formatVnd } from '../../utils/format.js';
import { roomParts, zoneText } from '../../utils/apartmentLabels.js';
import { LngLat, buildGoogleMapsDirUrl, haversineKm, orderNearestNeighbor, roundUpQuarter, suggestTimes } from '../../utils/tourRoute.js';
import { ArrowDown, ArrowUp, Navigation, Phone, X } from 'lucide-react';

type Stop = Apartment & { coordinates: LngLat };
const GPS_TIMEOUT_MS = 8000;

// Vị trí hiện tại của CTV; từ chối / quá 8 giây → null (xếp từ căn đầu tiên)
const currentPosition = () =>
  new Promise<LngLat | null>((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: 60_000 }
    );
  });

const timeText = (date: Date) => date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const toTimeInput = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

/**
 * Lịch trình dẫn khách (Story 11.3): xếp đường gần nhất, giờ hẹn gợi ý, đổi thứ tự bằng ↑↓, mở Google Maps chỉ đường xe máy.
 * Tính toàn bộ trên điện thoại; SĐT chủ nhà hiện theo quyền sẵn có (CTV thấy số đã che).
 */
export const TourPlanSheet: React.FC<{ ids: string[]; onClose: () => void }> = ({ ids, onClose }) => {
  const [stops, setStops] = useState<Stop[] | null>(null);
  const [origin, setOrigin] = useState<LngLat | null>(null);
  const [failed, setFailed] = useState(false);
  const [startTime, setStartTime] = useState(() => toTimeInput(roundUpQuarter()));

  const load = useCallback(() => {
    setFailed(false);
    setStops(null);
    Promise.all([Promise.all(ids.map((id) => apartmentApi.getApartmentById(id).then((res) => res.data as Apartment))), currentPosition()])
      .then(([apartments, position]) => {
        const located = apartments.filter((apt): apt is Stop => apt.location.coordinates?.length === 2).map((apt) => ({ ...apt, coordinates: apt.location.coordinates! }));
        setOrigin(position);
        setStops(orderNearestNeighbor(position, located));
      })
      .catch(() => setFailed(true));
  }, [ids]);
  useEffect(load, [load]);

  const move = (index: number, delta: number) =>
    setStops((list) => {
      if (!list) return list;
      const next = [...list];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });

  const legKm = useMemo(
    () => (stops || []).map((stop, index) => (index === 0 ? (origin ? haversineKm(origin, stop.coordinates) : 0) : haversineKm(stops![index - 1].coordinates, stop.coordinates))),
    [stops, origin]
  );
  const times = useMemo(() => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const start = new Date();
    start.setHours(hours || 0, minutes || 0, 0, 0);
    return suggestTimes(start, legKm);
  }, [startTime, legKm]);
  // Story 20.5: lộ trình 1 căn có link chủ nhà gửi → mở đúng link; ≥ 2 căn cần toạ độ cho các điểm dừng
  const mapsUrl = !stops?.length ? '' : stops.length === 1 && stops[0].location.mapUrl ? stops[0].location.mapUrl : buildGoogleMapsDirUrl(origin, stops.map((stop) => stop.coordinates));

  return (
    <div role="dialog" aria-label="Lộ trình xem nhà" className="fixed inset-0 z-50 flex flex-col bg-slate-50">
      <header className="flex items-center gap-2 px-2 h-14 border-b border-slate-200 bg-white">
        <button type="button" onClick={onClose} aria-label="Đóng" className="w-11 h-11 flex items-center justify-center text-slate-500">
          <X className="w-5 h-5" />
        </button>
        <h2 className="flex-1 text-base font-semibold text-slate-900">Lộ trình xem nhà</h2>
        <label className="flex items-center gap-1.5 pr-2 text-sm text-slate-600">
          Bắt đầu
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-10 px-2 rounded-lg border border-slate-200 text-base sm:text-sm" />
        </label>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {!stops && !failed && (
          // Story 12.5: giữ dòng chữ (lấy GPS có thể mất vài giây) + khung chờ đúng hình các dòng lộ trình
          <div className="space-y-2" aria-busy="true">
            <p className="text-sm text-slate-600">Đang lấy vị trí và xếp đường đi…</p>
            {ids.map((id) => <div key={id} className="skeleton h-28 rounded-2xl" />)}
          </div>
        )}
        {failed && (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-slate-600">Không tải được thông tin căn. Vui lòng kiểm tra mạng.</p>
            <button type="button" onClick={load} className="h-11 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold">Thử lại</button>
          </div>
        )}
        {stops && !origin && <p className="p-3 rounded-xl bg-amber-50 text-sm text-amber-800">Bật định vị để xếp đường chính xác hơn. Đang xếp từ căn đầu tiên.</p>}
        {stops && stops.length < ids.length && <p className="p-3 rounded-xl bg-slate-100 text-sm text-slate-600">{ids.length - stops.length} căn chưa có vị trí nên không đưa vào lộ trình.</p>}

        <ol className="space-y-2">
          {stops?.map((stop, index) => (
            <li key={stop._id} className="flex gap-3 p-3 rounded-2xl bg-white border border-slate-200">
              <div className="flex flex-col items-center gap-1">
                <span className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-navy text-white text-sm font-bold">{index + 1}</span>
                <span className="text-sm font-semibold text-slate-900 tabular-nums">{timeText(times[index])}</span>
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-semibold text-slate-900 line-clamp-2">{[stop.location.street, zoneText(stop.location)].filter(Boolean).join(', ')}</p>
                <p className="text-sm text-slate-600">{formatVnd(stop.price)} · {roomParts(stop.attributes).join(' · ')}</p>
                <p className="text-xs text-slate-500">
                  {index === 0 && !origin
                    ? 'Điểm xuất phát'
                    : legKm[index] > 0
                      ? `${legKm[index].toFixed(1)} km từ ${index === 0 ? 'vị trí của bạn' : 'căn trước'}`
                      : `Cùng vị trí ${index === 0 ? 'của bạn' : 'căn trước'}`}
                  {!stop.location.mapUrl && ' · vị trí ước lượng'}
                </p>
                {stop.ownerContact?.phone && (
                  <p className="flex items-center gap-1 text-xs text-slate-600">
                    <Phone className="w-3.5 h-3.5" aria-hidden /> Chủ nhà {stop.ownerContact.phone}
                    {stop.ownerContact.note && ` · ${stop.ownerContact.note}`}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Xem sớm hơn" className="w-11 h-11 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-30">
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button type="button" disabled={index === stops.length - 1} onClick={() => move(index, 1)} aria-label="Xem muộn hơn" className="w-11 h-11 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-30">
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
        {stops && <p className="text-xs text-slate-500">Giờ hẹn ước tính: xe máy ~25 km/h, mỗi căn xem 20 phút. Thứ tự xếp theo đường chim bay, dùng ↑↓ để sửa.</p>}
      </div>

      <footer className="p-3 pb-badge-safe bg-white border-t border-slate-200">
        <a
          href={mapsUrl || undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!mapsUrl}
          className={`h-12 flex items-center justify-center gap-2 rounded-xl text-base font-semibold ${mapsUrl ? 'bg-brand-navy text-white active:scale-[0.98] transition-transform duration-100 motion-reduce:transform-none' : 'pointer-events-none bg-slate-200 text-slate-600'}`}
        >
          <Navigation className="w-5 h-5" aria-hidden /> Mở Google Maps
        </a>
      </footer>
    </div>
  );
};
