import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { shareApi, PublicListing } from '../api/shareApi.js';
import { PhotoSlider } from '../components/public/PhotoSlider.js';
import { CtvContactBar } from '../components/public/CtvContactBar.js';
import { MapPin, LinkIcon } from 'lucide-react';

const formatVnd = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + 'đ';
const FURNISHING_LABEL = { FULL: 'Full đồ', BASIC: 'Đồ cơ bản', EMPTY: 'Nhà trống' } as const;

// Bản đồ khu vực chung: tâm đã làm tròn ~500m từ backend, vòng tròn mờ thay cho ghim vị trí
const AreaMap: React.FC<{ center: [number, number] }> = ({ center: [lng, lat] }) => (
  <div className="relative h-56 rounded-xl overflow-hidden border border-slate-200">
    <iframe
      title="Khu vực căn hộ"
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.012},${lat - 0.008},${lng + 0.012},${lat + 0.008}&layer=mapnik`}
      className="w-full h-full border-0"
      loading="lazy"
    />
    <div className="absolute top-1/2 left-1/2 w-28 h-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/20 border-2 border-indigo-500 pointer-events-none" />
  </div>
);

export const PublicListingPage: React.FC = () => {
  const { slug = '' } = useParams();
  const code = slug.split('-').pop() || '';
  const [listing, setListing] = useState<PublicListing | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');

  useEffect(() => {
    shareApi
      .getPublicListing(code)
      .then((data) => {
        setListing(data);
        setStatus('ready');
        document.title = data.title;
      })
      .catch(() => setStatus('error'));
  }, [code]);

  if (status === 'loading') {
    return (
      <div className="max-w-xl mx-auto animate-pulse">
        <div className="aspect-[4/3] bg-slate-200" />
        <div className="p-4 space-y-3">
          <div className="h-6 bg-slate-200 rounded w-3/4" />
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="h-20 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (status === 'error' || !listing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-3">
        <LinkIcon className="w-12 h-12 text-slate-300" />
        <h1 className="text-lg font-bold text-slate-700">Link không còn hiệu lực</h1>
        <p className="text-sm text-slate-500">Vui lòng liên hệ người đã gửi link cho bạn để nhận thông tin mới nhất.</p>
      </div>
    );
  }

  const { attributes, fees, location } = listing;
  const feeItems = [
    fees.electricity && `Điện ${formatVnd(fees.electricity)}/kWh`,
    fees.water && `Nước ${formatVnd(fees.water)}`,
    fees.service && `Dịch vụ ${formatVnd(fees.service)}/tháng`,
    fees.parkingMotor && `Gửi xe ${formatVnd(fees.parkingMotor)}/tháng`,
  ].filter(Boolean);
  const amenities = [
    attributes.area && `📐 ${attributes.area}m²`,
    attributes.bedrooms === 0 ? '🛏 Studio' : `🛏 ${attributes.bedrooms} phòng ngủ`,
    `🛋 ${FURNISHING_LABEL[attributes.furnishing]}`,
    attributes.washingMachine === 'PRIVATE' && '🧺 Máy giặt riêng',
    attributes.elevator && '🛗 Thang máy',
    attributes.carParking && '🚗 Ô tô đỗ cửa',
    attributes.allowPets && '🐾 Nuôi pet',
    attributes.balcony && '🌿 Ban công',
    attributes.pcccStandard && '🛡️ PCCC đạt chuẩn',
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-xl mx-auto bg-white min-h-screen">
        <PhotoSlider images={listing.images} title={listing.title} />

        <div className="p-4 space-y-5">
          {listing.status === 'RENTED' && (
            <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
              Căn này đã được thuê — liên hệ tư vấn viên để xem các căn tương tự.
            </p>
          )}
          {listing.status === 'UPCOMING' && listing.availableDate && (
            <p className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sm text-sky-800">
              🗓 Trống từ ngày {new Date(listing.availableDate).toLocaleDateString('vi-VN')}
            </p>
          )}

          <div>
            <h1 className="text-xl font-bold text-slate-900">{listing.title}</h1>
            <p className="mt-1 text-sm text-slate-500 flex items-center gap-1">
              <MapPin className="w-4 h-4 shrink-0" />
              {[location.ward, location.district, location.city].filter(Boolean).join(', ')}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
            <p className="text-2xl font-extrabold text-indigo-700">
              {formatVnd(listing.price)}
              <span className="text-sm font-medium text-indigo-500">/tháng</span>
            </p>
            {listing.deposit > 0 && <p className="text-sm text-slate-600 mt-1">Đặt cọc: {formatVnd(listing.deposit)}</p>}
            {feeItems.length > 0 && <p className="text-xs text-slate-500 mt-2">{feeItems.join(' · ')}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            {amenities.map((item) => (
              <span key={String(item)} className="px-3 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-700">
                {item}
              </span>
            ))}
          </div>

          {location.approximateCenter && (
            <div className="space-y-1.5">
              <AreaMap center={location.approximateCenter} />
              <p className="text-[11px] text-slate-400">Khu vực gần đúng — địa chỉ chính xác sẽ được gửi khi hẹn xem phòng.</p>
            </div>
          )}

          {listing.ctv.greetingMessage && (
            <p className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-600 italic">“{listing.ctv.greetingMessage}”</p>
          )}
        </div>
      </div>

      <CtvContactBar ctv={listing.ctv} />
    </div>
  );
};
