import { useCallback, useEffect, useState } from 'react';
import { MapPin, apartmentApi } from '../api/apartmentApi.js';
import { APARTMENT_REALTIME, RealtimeMessage } from '../api/realtimeStream.js';
import { ApartmentFilterValues, toParams } from './useApartmentSearch.js';

/** Ghim bản đồ theo bộ lọc + từ khóa đang chọn ở Bảng hàng (Story 11.2); tự cập nhật trạng thái / giá theo thời gian thực (11.4). */
export function useMapPins(filters: ApartmentFilterValues, query: string) {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [withoutLocation, setWithoutLocation] = useState(0);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const { page: _page, limit: _limit, ...params } = toParams(filters, 1);
    setStatus('loading');
    apartmentApi
      .getMapPins(query ? { ...params, q: query } : params)
      .then((data) => {
        if (cancelled) return;
        setPins(data.pins);
        setWithoutLocation(data.withoutLocation);
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [filters, query, reloadKey]);

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
  return { pins, withoutLocation, status, reload };
}
