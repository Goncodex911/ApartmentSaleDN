import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { QuotaMeters, adminApi } from '../../api/adminApi.js';
import { Card } from '../ui/Card.js';
import { Skeleton } from '../ui/Skeleton.js';
import { timeAgo } from '../../utils/format.js';

const BAR = { ok: 'bg-emerald-600', warn: 'bg-amber-500', danger: 'bg-rose-600' } as const;
const NOTE = { ok: '', warn: ' — sắp chạm hạn mức', danger: ' — gần hết, cần dọn dữ liệu hoặc nâng gói' } as const;

/** Thanh tiến trình có nhãn chữ "358 / 512 MB (70%)" — không chỉ dùng màu (Story 16.8b). */
const Meter: React.FC<{ label: string; used: number; limit: number; unit: string; level: keyof typeof BAR }> = ({ label, used, limit, unit, level }) => {
  const percent = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="space-y-1">
      <p className="text-sm text-slate-800">
        {label}: <strong className="tabular-nums">{used.toLocaleString('vi-VN')} / {limit.toLocaleString('vi-VN')} {unit} ({percent}%)</strong>
        <span className={level === 'ok' ? '' : 'font-semibold text-rose-800'}>{NOTE[level]}</span>
      </p>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-2 rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-full rounded-full ${BAR[level]}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

const Unavailable: React.FC<{ text: string }> = ({ text }) => <p className="text-sm text-slate-600">{text}</p>;
const isError = (value: unknown): value is { error: string } => Boolean(value && typeof value === 'object' && 'error' in value);

/** Story 16.8b: hạn mức từng gói — mỗi thẻ lỗi riêng, không làm hỏng cả khu vực. */
export const QuotaCards: React.FC = () => {
  const [data, setData] = useState<QuotaMeters | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    adminApi.healthQuotas().then(setData).catch(() => setFailed(true));
  }, []);

  if (failed) return <p className="flex items-center gap-2 text-sm text-slate-600"><WifiOff className="w-4 h-4" aria-hidden /> Không tải được hạn mức, vui lòng tải lại trang.</p>;
  if (!data) return <div className="grid gap-2 sm:grid-cols-2" aria-busy="true" aria-label="Đang tải hạn mức">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>;
  const { mongo, cloudinary, gemini, nominatim, telegram } = data;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Card className="space-y-2">
        <h3 className="font-semibold text-slate-900">MongoDB Atlas</h3>
        {isError(mongo) ? <Unavailable text={`Không đọc được dung lượng: ${mongo.error}`} /> : (
          <>
            <Meter label="Dung lượng" used={mongo.usedMb} limit={mongo.limitMb} unit="MB" level={mongo.level} />
            {mongo.collections ? (
              <ul className="text-xs text-slate-700 space-y-0.5">
                {mongo.collections.map((item) => <li key={item.name} className="flex justify-between gap-2"><span>{item.name}</span><span className="tabular-nums">{item.mb} MB</span></li>)}
              </ul>
            ) : <Unavailable text="Gói hiện tại không cho xem dung lượng từng bảng." />}
          </>
        )}
      </Card>

      <Card className="space-y-2">
        <h3 className="font-semibold text-slate-900">Cloudinary</h3>
        {cloudinary === null ? <Unavailable text="Chưa cấu hình." /> : isError(cloudinary) ? <Unavailable text={`Không đọc được: ${cloudinary.error}`} /> : (
          <>
            <Meter label="Credits tháng này" used={cloudinary.creditsUsed} limit={cloudinary.creditsLimit} unit="credits" level={cloudinary.level} />
            <p className="text-xs text-slate-700">Lưu trữ {cloudinary.storageMb.toLocaleString('vi-VN')} MB · Băng thông {cloudinary.bandwidthMb.toLocaleString('vi-VN')} MB · Biến đổi ảnh {cloudinary.transformations.toLocaleString('vi-VN')}</p>
          </>
        )}
      </Card>

      <Card className="space-y-1">
        <h3 className="font-semibold text-slate-900">Google Gemini</h3>
        <p className="text-sm text-slate-800">Model <code className="text-xs">{gemini.model}</code> · {gemini.callsLastHour} lượt / 1 giờ · {gemini.calls24h} lượt / 24 giờ</p>
        <p className={`text-sm ${gemini.rateLimited24h ? 'font-semibold text-rose-800' : 'text-slate-700'}`}>
          {gemini.rateLimited24h} lần bị giới hạn (429) trong 24 giờ{gemini.lastFailureAt ? ` · lỗi gần nhất ${timeAgo(gemini.lastFailureAt)}` : ''}
        </p>
        <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[44px] text-sm font-semibold text-indigo-700 hover:underline">Xem hạn mức model trong Google AI Studio</a>
      </Card>

      <Card className="space-y-1">
        <h3 className="font-semibold text-slate-900">Telegram & Nominatim</h3>
        {telegram === null ? <Unavailable text="Telegram chưa cấu hình." /> : isError(telegram) ? <Unavailable text={`Telegram: ${telegram.error}`} /> : (
          <>
            <p className="text-sm text-slate-800">Tin nhận cuối: {telegram.lastReceivedAt ? timeAgo(telegram.lastReceivedAt) : 'chưa có'}</p>
            {telegram.sources.length > 0 && (
              <ul className="text-xs text-slate-700">{telegram.sources.map((source) => <li key={source.name}>{source.name}: {source.count} tin / 24 giờ</li>)}</ul>
            )}
          </>
        )}
        <p className="text-sm text-slate-800 pt-1">
          Nominatim: {nominatim.calls24h} lượt gọi / 24 giờ{nominatim.rateLimited24h ? `, ${nominatim.rateLimited24h} lần 429` : ''}{nominatim.errors24h ? `, ${nominatim.errors24h} lỗi` : ''}
          {!isError(nominatim.cache) && ` · đã lưu ${nominatim.cache.found} tên đường (${nominatim.cache.missed} không tìm thấy)`}
        </p>
      </Card>
    </div>
  );
};
