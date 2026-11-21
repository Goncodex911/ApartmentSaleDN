import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertOctagon } from 'lucide-react';
import { ServiceStatus, adminApi } from '../../api/adminApi.js';
import { HEALTH_CHANGED } from './adminNav.js';
import { SERVICE_INFO } from './serviceGuides.js';

/**
 * Story 16.8a: dải cảnh báo đỏ cố định đầu khu Quản trị khi có dịch vụ Lỗi / Cần thay key.
 * Tải khi vào khu Quản trị và sau mỗi lần kiểm tra lại; tự ẩn khi dịch vụ hết lỗi. Không nhấp nháy.
 */
export const IncidentBanner: React.FC = () => {
  const [incidents, setIncidents] = useState<ServiceStatus[]>([]);
  useEffect(() => {
    const load = () =>
      adminApi
        .healthStatus()
        .then(({ services }) => setIncidents(services.filter((item) => item.state === 'DOWN' || item.state === 'KEY_INVALID')))
        .catch(() => undefined); // Lỗi tải trạng thái không chặn trang quản trị
    load();
    window.addEventListener(HEALTH_CHANGED, load);
    return () => window.removeEventListener(HEALTH_CHANGED, load);
  }, []);

  if (!incidents.length) return null;
  return (
    <div role="alert" className="mx-4 mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 max-w-5xl lg:mx-auto">
      <AlertOctagon className="w-5 h-5 mt-0.5 text-rose-700 shrink-0" aria-hidden />
      <div className="flex-1 text-sm text-rose-900 space-y-0.5">
        {incidents.map((item) => (
          <p key={item.service}>
            <strong>{SERVICE_INFO[item.service].label}</strong> đang gặp sự cố ({item.state === 'KEY_INVALID' ? 'API key không hợp lệ hoặc hết hạn' : 'không kết nối được'}). Kiểm tra và thay key để tránh gián đoạn.
          </p>
        ))}
        <Link to="/admin/health" className="inline-flex items-center min-h-[44px] font-semibold text-rose-800 underline">Xem Sức khỏe hệ thống</Link>
      </div>
    </div>
  );
};
