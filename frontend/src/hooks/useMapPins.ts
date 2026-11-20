import { useCallback, useEffect, useState } from 'react';
import { MapLandmark, MapPin, apartmentApi } from '../api/apartmentApi.js';
import { APARTMENT_REALTIME, RealtimeMessage } from '../api/realtimeStream.js';
import { ApartmentFilterValues, toParams } from './useApartmentSearch.js';

/**
 * Ghim bản đồ theo bộ lọc + từ khóa đang chọn ở Bảng hàng (Story 11.2); tự cập nhật trạng thái / giá theo thời gian thực (11.4).
 * `bbox` "minLng,minLat,maxLng,maxLat": chỉ lấy căn trong khung nhìn (Story 15.3) — thay cho điểm mốc đang chọn.
 */
export function useMapPins(filters: ApartmentFilterValues, query: string, bbox?: string) {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [withoutLocation, setWithoutLocation] = useState(0);
  const [landmark, setLandmark] = useState<MapLandmark | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false; // Request cũ trả về sau request mới → bỏ
    const { page: _page, limit: _limit, ...params } = toParams(filters, 1);
    if (bbox) {
      delete params.landmark;
      delete params.radiusKm;
    }
    setStatus('loading');
    apartmentApi
      .getMapPins({ ...params, ...(query && { q: query }), ...(bbox && { bbox }) })
      .then((data) => {
        if (cancelled) return;
        setPins(data.pins);
        setWithoutLocation(data.withoutLocation);
        setLandmark(data.landmark);
        setTruncated(Boolean(data.truncated));
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [filters, query, bbox, reloadKey]);

  useEffect(() => {
    const onRealtime = (event: Event) => {
      const { type, data } = (event as CustomEvent<RealtimeMessage>).detail;
      if (type !== 'apartment.status' && type !== 'apartment.price') return;
      setPins((list) =>
        data.status === 'RENTED'
          ? list.filter((pin) => pin._id !== data.id) // Đã cho thuê → gỡ ghim
          : list.map((pin) => (pin._id === data.id ? { ...pin, status: data.status, ...(data.price ? { price: data.price, priceUsd: data.priceUsd } : {}) } : pin))
      );
    };
    window.addEventListener(APARTMENT_REALTIME, onRealtime);
    return () => window.removeEventListener(APARTMENT_REALTIME, onRealtime);
  }, []);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  return { pins, withoutLocation, landmark, truncated, status, reload };
}
