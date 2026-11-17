import { useCallback, useEffect, useState } from 'react';
import { Apartment, apartmentApi, Pagination } from '../api/apartmentApi.js';

export const AMENITY_KEYS = ['elevator', 'allowPets', 'carParking', 'balcony', 'pcccStandard'] as const;
type AmenityKey = (typeof AMENITY_KEYS)[number];

export type ApartmentFilterValues = {
  priceRange: string;
  roomType: string;
  status: string;
  landmark: string;
  landmarkName: string; // Chỉ để hiển thị chip, không gửi lên API
  radiusKm: string;
} & Record<AmenityKey, boolean>;

export const EMPTY_FILTERS: ApartmentFilterValues = {
  priceRange: '',
  roomType: '',
  status: '',
  landmark: '',
  landmarkName: '',
  radiusKm: '2',
  elevator: false,
  allowPets: false,
  carParking: false,
  balcony: false,
  pcccStandard: false,
};

export const countActiveFilters = (f: ApartmentFilterValues) =>
  [f.priceRange, f.roomType, f.status, f.landmark].filter(Boolean).length + AMENITY_KEYS.filter((key) => f[key]).length;

const PAGE_SIZE = 12;
const EMPTY_PAGINATION: Pagination = { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 };

function toParams(f: ApartmentFilterValues, page: number) {
  const params: Record<string, string | number | boolean> = { page, limit: PAGE_SIZE };
  if (f.priceRange) params.priceRange = f.priceRange;
  if (f.roomType) params.roomType = f.roomType;
  if (f.status) params.status = f.status;
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
export function useApartmentSearch() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<ApartmentFilterValues>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION);
  const [aiSummary, setAiSummary] = useState('');
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');

  useEffect(() => {
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

    setStatus('loading');
    load()
      .then(({ res, summary }) => {
        if (cancelled) return;
        setApartments(res.data || res.items || []);
        setPagination(res.pagination || EMPTY_PAGINATION);
        setAiSummary(summary);
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [query, filters, page, reloadKey]);

  const search = useCallback((text: string) => {
    setQuery(text.trim());
    setPage(1);
  }, []);

  const applyFilters = useCallback((next: ApartmentFilterValues) => {
    setFilters(next);
    setPage(1);
  }, []);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  const removeApartment = useCallback((id: string) => setApartments((list) => list.filter((item) => item._id !== id)), []);

  return { apartments, pagination, status, query, filters, aiSummary, search, applyFilters, setPage, reload, removeApartment };
}
