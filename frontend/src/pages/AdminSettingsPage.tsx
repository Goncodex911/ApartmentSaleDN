import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { useApp } from '../components/layout/AppShell.js';
import { ReviewPolicy, SystemSettings, adminApi } from '../api/adminApi.js';
import { DashboardSection } from '../components/admin/DashboardParts.js';
import { TelegramSourcesSection } from '../components/admin/TelegramSourcesSection.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { Button } from '../components/ui/Button.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { fieldClass } from '../components/ui/Input.js';

const POLICIES: { id: ReviewPolicy; title: string; description: string }[] = [
  { id: 'FLAG_ONLY', title: 'Đăng ngay, AI gắn cờ (mặc định)', description: 'Tin cào lên Bảng hàng ngay. Tin thiếu giá, SĐT, khu vực hoặc loại căn được gắn cờ "cần kiểm tra" cho Quản lý.' },
  { id: 'SAFE', title: 'An toàn', description: 'Mọi tin cào đều gắn cờ "cần kiểm tra" để Quản lý xem lại trước khi gửi khách.' },
  { id: 'FAST_LANE', title: 'Bán tự động', description: 'Chỉ bỏ cờ khi tin đủ giá, SĐT, khu vực, loại căn, không trùng ảnh VÀ điểm tin cậy AI từ 90 trở lên.' },
];

/** [ADMIN] Cấu hình hệ thống (Story 13.5): nguồn Telegram, chính sách duyệt tin cào, hotline / Zalo OA trên trang khách. */
export const AdminSettingsPage: React.FC = () => {
  const { user } = useApp();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [brand, setBrand] = useState({ hotline: '', zaloOaUrl: '' });
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const apply = (next: SystemSettings) => {
    setSettings(next);
    setBrand({ hotline: next.hotline, zaloOaUrl: next.zaloOaUrl });
  };
  const load = useCallback(() => {
    setLoadError(false);
    adminApi.getSettings().then(apply).catch(() => setLoadError(true));
  }, []);
  useEffect(load, [load]);

  if (user && user.role !== 'ADMIN') return <Navigate to="/apartments" replace />;

  const save = async (key: string, data: Parameters<typeof adminApi.updateSettings>[0]) => {
    setSaving(key);
    setMessage(null);
    try {
      apply(await adminApi.updateSettings(data));
      setMessage({ tone: 'ok', text: 'Đã lưu, có hiệu lực ngay' });
    } catch (err: any) {
      setMessage({ tone: 'error', text: err.response?.data?.message || 'Không lưu được, vui lòng thử lại' });
    } finally {
      setSaving('');
    }
  };

  const renderBody = () => {
    if (loadError) return <EmptyState icon={WifiOff} title="Không tải được cấu hình" description="Vui lòng kiểm tra mạng rồi thử lại." action={<Button onClick={load}>Thử lại</Button>} />;
    if (!settings) {
      return (
        <div className="space-y-3" aria-busy="true" aria-label="Đang tải cấu hình">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <TelegramSourcesSection settings={settings} onChange={apply} />

        <DashboardSection title="Chính sách duyệt tin cào" note="Áp dụng cho căn mới tạo từ tin cào. Tin trùng tự gộp vào căn có sẵn.">
          <div role="radiogroup" aria-label="Chính sách duyệt tin cào" className="grid gap-2">
            {POLICIES.map((policy) => {
              const selected = settings.reviewPolicy === policy.id;
              return (
                <button
                  key={policy.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={!!saving}
                  onClick={() => !selected && save('policy', { reviewPolicy: policy.id })}
                  className={`text-left p-3 rounded-xl border cursor-pointer transition-colors ${selected ? 'border-brand-accent bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <span className="flex items-center gap-2 font-semibold text-slate-900">
                    <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${selected ? 'border-brand-accent bg-brand-accent shadow-[inset_0_0_0_2px_white]' : 'border-slate-400'}`} aria-hidden />
                    {policy.title}
                  </span>
                  <span className="block mt-1 pl-6 text-sm text-slate-600">{policy.description}</span>
                </button>
              );
            })}
          </div>
        </DashboardSection>

        <DashboardSection title="Liên hệ công ty trên trang khách" note="Hiện ở chân trang xem phòng (/p/...). Để trống = không hiện.">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save('brand', brand);
            }}
            className="grid gap-2 sm:grid-cols-2"
          >
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Hotline</span>
              <input type="tel" inputMode="tel" value={brand.hotline} onChange={(e) => setBrand({ ...brand, hotline: e.target.value })} placeholder="0905123456" className={fieldClass} />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Link Zalo OA</span>
              <input type="url" inputMode="url" value={brand.zaloOaUrl} onChange={(e) => setBrand({ ...brand, zaloOaUrl: e.target.value })} placeholder="https://zalo.me/..." className={fieldClass} />
            </label>
            <Button type="submit" loading={saving === 'brand'} className="sm:col-span-2">Lưu thông tin liên hệ</Button>
          </form>
        </DashboardSection>
      </div>
    );
  };

  return (
    <main className="max-w-3xl mx-auto px-4 pt-4 pb-app space-y-3">
      <h1 className="text-xl font-bold text-slate-900">Cấu hình hệ thống</h1>
      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`p-3 rounded-xl text-sm ${message.tone === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}>
          {message.text}
        </p>
      )}
      {renderBody()}
    </main>
  );
};
