import React, { useState } from 'react';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { apartmentApi, GeoPlace } from '../../api/apartmentApi.js';

/**
 * Story 20.4: ô tìm địa chỉ / dán link Google Maps / Plus Code trên bản đồ đặt vị trí.
 * Chỉ tìm khi bấm Enter hoặc nút Tìm (chính sách Nominatim cấm gợi ý theo từng phím).
 * KHÔNG dùng <form>: bản đồ nằm trong form Thêm căn → Enter phải tự chặn để không gửi form căn.
 */
export const PlaceSearchBox: React.FC<{ onPick: (place: GeoPlace, query: string) => void }> = ({ onPick }) => {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<GeoPlace[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const pick = (place: GeoPlace) => {
    setPlaces(null);
    onPick(place, query.trim());
  };

  const search = async () => {
    const text = query.trim();
    if (text.length < 2 || loading) return;
    setLoading(true);
    setMessage('');
    setPlaces(null);
    try {
      const found = await apartmentApi.searchGeo(text);
      if (found.length === 1 && found[0].source !== 'OSM') pick(found[0]); // Link / Plus Code: bay thẳng tới điểm
      else if (found.length) setPlaces(found);
      else setMessage(/^https?:\/\//i.test(text) ? 'Không đọc được vị trí từ link — hãy kéo bản đồ để ghim' : 'Không tìm thấy — thử tên đường hoặc dán link Google Maps');
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Dịch vụ bản đồ đang bận, thử lại sau vài giây');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pointer-events-auto rounded-xl bg-white shadow-md border border-slate-200/80 overflow-hidden">
      <div className="flex items-center">
        <input
          type="search"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            search();
          }}
          placeholder="Tìm đường, tòa nhà hoặc dán link Google Maps"
          aria-label="Tìm địa chỉ trên bản đồ"
          autoComplete="off"
          className="flex-1 min-w-0 h-11 pl-3 text-base text-slate-900 placeholder:text-slate-500 bg-transparent focus:outline-none"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); setPlaces(null); setMessage(''); }} aria-label="Xóa nội dung tìm" className="w-11 h-11 flex items-center justify-center text-slate-500">
            <X className="w-4 h-4" aria-hidden />
          </button>
        )}
        <button type="button" onClick={search} disabled={loading} aria-label="Tìm" className="w-11 h-11 flex items-center justify-center text-indigo-700 disabled:opacity-60">
          {loading ? <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none" aria-hidden /> : <Search className="w-5 h-5" aria-hidden />}
        </button>
      </div>

      {message && <p role="status" className="px-3 py-2 border-t border-slate-100 text-sm text-slate-700">{message}</p>}
      {places && (
        <ul className="border-t border-slate-100 max-h-60 overflow-y-auto">
          {places.map((place) => (
            <li key={place.coordinates.join(',')}>
              <button type="button" onClick={() => pick(place)} className="w-full min-h-[44px] flex items-start gap-2 px-3 py-2 text-left active:bg-slate-100">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900 truncate">{place.label}</span>
                  {place.detail && <span className="block text-xs text-slate-600 truncate">{place.detail}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
