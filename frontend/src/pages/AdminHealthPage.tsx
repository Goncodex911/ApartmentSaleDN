import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { ServiceStatus, adminApi } from '../api/adminApi.js';
import { ServiceCard } from '../components/admin/ServiceCard.js';
import { QuotaCards } from '../components/admin/QuotaCards.js';
import { notifyHealthChanged } from '../components/admin/adminNav.js';
import { Button } from '../components/ui/Button.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { TILE_URL } from '../utils/mapTiles.js';

/** CARTO chỉ kiểm tra được trên trình duyệt (key nằm ở frontend): tải 1 ô bản đồ Đà Nẵng. */
async function checkCarto(): Promise<ServiceStatus> {
  const base: ServiceStatus = { service: 'carto', state: 'UNKNOWN', env: { vars: ['VITE_MAP_TILE_URL'], where: 'Frontend' }, lastCheckedAt: null, latencyMs: null, message: null, calls24h: 0, rateLimited24h: 0, errors24h: 0, lastFailureAt: null };
  if (!TILE_URL.includes('cartocdn.com')) return { ...base, state: 'NOT_CONFIGURED', message: 'Đang dùng bản đồ OpenStreetMap mặc định (chưa đặt VITE_MAP_TILE_URL).' };
  const url = TILE_URL.replace('{z}', '13').replace('{x}', '6527').replace('{y}', '3779').replace('{r}', '').replace('{s}', 'a');
  const started = performance.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const latencyMs = Math.round(performance.now() - started);
    const isImage = res.headers.get('content-type')?.startsWith('image/');
    const state = res.ok && isImage ? 'OK' : res.status === 401 || res.status === 403 ? 'KEY_INVALID' : 'DOWN';
    return { ...base, state, latencyMs, lastCheckedAt: new Date().toISOString(), message: state === 'OK' ? null : `HTTP ${res.status}` };
  } catch {
    // CARTO trả 403 không kèm CORS → trình duyệt chỉ báo lỗi mạng, không đọc được mã lỗi
    return { ...base, state: 'DOWN', lastCheckedAt: new Date().toISOString(), message: `Không tải được ô bản đồ: key sai, website ${location.host} chưa được phép dùng key (giới hạn Referer trên CARTO), hoặc mất mạng.` };
  }
}

/** [ADMIN] Story 16.8a: Sức khỏe hệ thống — trạng thái từng dịch vụ ngoài, kiểm tra 1 chạm, hướng dẫn thay key. */
export const AdminHealthPage: React.FC = () => {
  const [services, setServices] = useState<ServiceStatus[] | null>(null);
  const [jobsLastRun, setJobsLastRun] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [checking, setChecking] = useState<string[]>([]);

  // Gộp kết quả server với CARTO (trình duyệt tự kiểm tra)
  const merge = (list: ServiceStatus[], carto?: ServiceStatus) =>
    setServices((current) => list.map((item) => (item.service === 'carto' ? carto ?? current?.find((old) => old.service === 'carto') ?? item : item)));

  const load = useCallback(() => {
    setLoadFailed(false);
    Promise.all([adminApi.healthStatus(), checkCarto()])
      .then(([data, carto]) => {
        merge(data.services, carto);
        setJobsLastRun(data.dailyJobsLastRun);
      })
      .catch(() => setLoadFailed(true));
  }, []);
  useEffect(load, [load]);

  const check = async (names?: ServiceStatus['service'][]) => {
    const targets = names ?? services?.map((item) => item.service) ?? [];
    setChecking(targets);
    setError('');
    try {
      const [list, carto] = await Promise.all([adminApi.healthPing(names?.filter((name) => name !== 'carto')), targets.includes('carto') ? checkCarto() : Promise.resolve(undefined)]);
      merge(list, carto);
      notifyHealthChanged();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không kiểm tra được, vui lòng thử lại.');
    } finally {
      setChecking([]);
    }
  };

  const renderBody = () => {
    if (loadFailed) return <EmptyState icon={WifiOff} title="Không tải được trạng thái" description="Vui lòng kiểm tra mạng rồi thử lại." action={<Button onClick={load}>Thử lại</Button>} />;
    if (!services) return <div className="grid gap-2 sm:grid-cols-2" aria-busy="true" aria-label="Đang tải trạng thái">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>;
    return (
      <ul className="grid gap-2 sm:grid-cols-2">
        {services.map((status) => (
          <ServiceCard key={status.service} status={status} checking={checking.includes(status.service)} onCheck={() => check([status.service])} />
        ))}
      </ul>
    );
  };

  return (
    <main className="max-w-5xl mx-auto px-4 pt-4 pb-app space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-900">Sức khỏe hệ thống</h1>
        <Button icon={RefreshCw} loading={checking.length > 1} disabled={!services || checking.length > 0} onClick={() => check()}>Kiểm tra tất cả</Button>
      </div>
      <p className="text-sm text-slate-600">
        Trạng thái lấy từ lần gọi thật gần nhất của hệ thống và lần bấm kiểm tra. Việc hằng ngày (nhắc tái ký, dọn ảnh, dọn Thùng rác) chạy gần nhất: {jobsLastRun ?? 'chưa ghi nhận'}.
      </p>
      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 text-sm text-rose-700">{error}</p>}
      {renderBody()}
      <section className="space-y-2 pt-2" aria-labelledby="quota-title">
        <h2 id="quota-title" className="text-lg font-bold text-slate-900">Hạn mức gói dịch vụ</h2>
        <p className="text-sm text-slate-600">Vàng từ 70%, đỏ từ 90%. Lượt tải bản đồ CARTO xem trong trang quản lý key CARTO.</p>
        <QuotaCards />
      </section>
    </main>
  );
};
