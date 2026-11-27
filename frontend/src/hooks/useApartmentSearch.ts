import { useCallback, useEffect, useRef, useState } from 'react';
import { Apartment, apartmentApi, Pagination } from '../api/apartmentApi.js';
import { APARTMENT_REALTIME, RealtimeData, RealtimeMessage } from '../api/realtimeStream.js';

// Story 20.7: mốc diện tích m², nửa mở [min, max) như khoảng giá
export const AREA_RANGES: { id: string; label: string; min?: number; max?: number }[] = [
  { id: 'under_30', label: 'Dưới 30 m²', max: 30 },
  { id: '30_50', label: '30 – 50 m²', min: 30, max: 50 },
  { id: '50_80', label: '50 – 80 m²', min: 50, max: 80 },
  { id: 'above_80', label: 'Trên 80 m²', min: 80 },
];

// Nhãn tạm trên thẻ khi căn vừa đổi trong lúc đang xem (Story 11.4) — mất khi tải lại danh sách
export type LiveTag = 'DEPOSITED' | 'RENTED' | 'PRICE_DROP';

/**
 * Áp 1 sự kiện real-time (đổi trạng thái / giá / cờ "Chờ xác minh") vào 1 căn — dùng chung cho danh sách và
 * hộp chi tiết đang mở (Story 19.10: căn mở từ bản đồ không nằm trong trang danh sách hiện tại).
 */
export function applyRealtime(item: Apartment, data: RealtimeData): Apartment {
  // Story 13.6: mọi sự kiện mang cờ "Chờ xác minh" hiện tại (gắn khi đủ 2 người báo, gỡ khi Quản lý xử lý)
  const verification = data.flagged ? item.verification ?? { flaggedAt: new Date().toISOString(), reasons: [] } : undefined;
  // CTV nhận căn đã cho thuê không kèm giá → chỉ đổi trạng thái
  const changes = data.price ? { status: data.status, price: data.price, priceUsd: data.priceUsd } : { status: data.status };
  return { ...item, verification, ...changes };
}

// Phát sự kiện này khi kho căn đổi ở nơi khác (VD Nhập tin AI từ menu đáy) → Bảng hàng tự tải lại
export const APARTMENTS_CHANGED = 'apartments:changed';

export const AMENITY_KEYS = ['nearBeach', 'pool', 'gym', 'seaView', 'riverView', 'elevator', 'allowPets', 'carParking', 'balcony', 'pcccStandard'] as const;
type AmenityKey = (typeof AMENITY_KEYS)[number];

export type ApartmentFilterValues = {
  priceRange: string;
  areaRange: string; // Story 20.7: mã mốc diện tích (AREA_RANGES) → gửi minArea / maxArea
  roomType: string;
  status: string;
  landmark: string;
  landmarkName: string; // Chỉ để hiển thị chip, không gửi lên API
  radiusKm: string;
  zones: string[]; // Story 8.4: chọn nhiều
  propertyTypes: string[];
  needsLocation: boolean; // Story 15.7: [Quản lý] căn chưa có vị trí chính xác
} & Record<AmenityKey, boolean>;

export const EMPTY_FILTERS: ApartmentFilterValues = {
  priceRange: '',
  areaRange: '',
  roomType: '',
  status: '',
  landmark: '',
  landmarkName: '',
  radiusKm: '2',
  zones: [],
  propertyTypes: [],
  needsLocation: false,
  elevator: false,
  allowPets: false,
  carParking: false,
  balcony: false,
  pcccStandard: false,
  nearBeach: false,
  pool: false,
  gym: false,
  seaView: false,
  riverView: false,
};

export const countActiveFilters = (f: ApartmentFilterValues) =>
  [f.priceRange, f.areaRange, f.roomType, f.status, f.landmark, f.needsLocation].filter(Boolean).length + f.zones.length + f.propertyTypes.length + AMENITY_KEYS.filter((key) => f[key]).length;

const PAGE_SIZE = 12;
const EMPTY_PAGINATION: Pagination = { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 };

export function toParams(f: ApartmentFilterValues, page: number) {
  const params: Record<string, string | number | boolean> = { page, limit: PAGE_SIZE };
  if (f.priceRange) params.priceRange = f.priceRange;
  const area = AREA_RANGES.find((range) => range.id === f.areaRange);
  if (area?.min) params.minArea = area.min;
  if (area?.max) params.maxArea = area.max;
  if (f.roomType) params.roomType = f.roomType;
  if (f.status) params.status = f.status;
  if (f.zones.length) params.zones = f.zones.join(',');
  if (f.propertyTypes.length) params.propertyTypes = f.propertyTypes.join(',');
  if (f.needsLocation) params.needsLocation = true;
  if (f.landmark) Object.assign(params, { landmark: f.landmark, radiusKm: Number(f.radiusKm) || 2 });
  AMENITY_KEYS.forEach((key) => f[key] && (params[key] = true));
  return params;
}

/**
 * Tải bảng hàng theo ô tìm kiếm + bộ lọc (Epic 4).
 * - Chỉ có câu tìm: dùng tìm kiếm câu tự nhiên (hiểu "studio hải châu dưới 6tr"); backend tự giữ các từ khóa
 *   AI không bóc được (VD tên phường "Mỹ An") để lọc thêm. Lỗi (VD quá giới hạn) → tìm theo từ khóa.
 * - Có cả câu tìm và bộ lọc: tìm theo từ khóa kết hợp bộ lọc.
 */
export function useApartmentSearch(enabled = true) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<ApartmentFilterValues>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const quietReload = useRef(false); // Story 12.5: tải lại ngầm (kéo làm mới, có mạng lại) → giữ danh sách cũ, không nháy khung chờ
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION);
  const [aiSummary, setAiSummary] = useState('');
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [liveTags, setLiveTags] = useState<Record<string, LiveTag>>({});

  useEffect(() => {
    // Story 19.7: chế độ Bản đồ không hiện danh sách → không tải (không tốn lượt Gemini); quay lại danh sách mới tải
    if (!enabled) return;
    let cancelled = false; // Bỏ kết quả của request cũ khi người dùng đổi điều kiện nhanh
    const params = toParams(filters, page);

    const keywordSearch = async () => ({ res: await apartmentApi.searchApartments(query ? { ...params, q: query } : params), summary: '' });
    const load = async () => {
      if (!query || countActiveFilters(filters) > 0) return keywordSearch();
      try {
        const natural = await apartmentApi.searchNaturalApartments(query, { page, limit: PAGE_SIZE });
        return { res: natural, summary: (natural.naturalAnalysis?.summary as string) || '' };
      } catch {
        return keywordSearch(); // VD vượt giới hạn 20 lần/phút của tìm câu tự nhiên
      }
    };

    if (!quietReload.current) setStatus('loading');
    quietReload.current = false;
    load()
      .then(({ res, summary }) => {
        if (cancelled) return;
        setApartments(res.data || res.items || []);
        setPagination(res.pagination || EMPTY_PAGINATION);
        setAiSummary(summary);
        setLiveTags({});
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [query, filters, page, reloadKey, enabled]);

  const search = useCallback((text: string) => {
    setQuery(text.trim());
    setPage(1);
  }, []);

  const applyFilters = useCallback((next: ApartmentFilterValues) => {
    setFilters(next);
    setPage(1);
  }, []);

  const reload = useCallback(() => {
    quietReload.current = true;
    setReloadKey((key) => key + 1);
  }, []);
  // Có mạng lại (Story 9.1) hoặc vừa Nhập tin AI từ menu đáy (Story 9.3) → tải danh sách mới nhất
  useEffect(() => {
    window.addEventListener('online', reload);
    window.addEventListener(APARTMENTS_CHANGED, reload);
    return () => {
      window.removeEventListener('online', reload);
      window.removeEventListener(APARTMENTS_CHANGED, reload);
    };
  }, [reload]);
  // Story 11.4: căn đang hiện vừa đổi trạng thái / giảm giá ở máy khác → cập nhật đúng thẻ đó, không tải lại cả trang
  useEffect(() => {
    const onRealtime = (event: Event) => {
      const { type, data } = (event as CustomEvent<RealtimeMessage>).detail;
      if (type !== 'apartment.status' && type !== 'apartment.price' && type !== 'apartment.flagged') return;
      const tag: LiveTag | undefined = type === 'apartment.price' ? 'PRICE_DROP' : data.status === 'DEPOSITED' || data.status === 'RENTED' ? data.status : undefined;
      if (type !== 'apartment.flagged') setLiveTags(({ [data.id]: _previous, ...rest }) => (tag ? { ...rest, [data.id]: tag } : rest));
      setApartments((list) => list.map((item) => (item._id === data.id ? applyRealtime(item, data) : item)));
    };
    window.addEventListener(APARTMENT_REALTIME, onRealtime);
    return () => window.removeEventListener(APARTMENT_REALTIME, onRealtime);
  }, []);

  const removeApartment = useCallback((id: string) => setApartments((list) => list.filter((item) => item._id !== id)), []);

  return { apartments, liveTags, pagination, status, query, filters, aiSummary, search, applyFilters, setPage, reload, removeApartment };
}
