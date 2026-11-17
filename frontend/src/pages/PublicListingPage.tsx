import React, { useEffect, useState } from 'react';
import { formatVnd } from '../utils/format.js';
import { useParams } from 'react-router-dom';
import { shareApi, PublicListing } from '../api/shareApi.js';
import { PhotoSlider } from '../components/public/PhotoSlider.js';
import { CtvContactBar } from '../components/public/CtvContactBar.js';
import { ChatWidget } from '../components/public/ChatWidget.js';
import { MapPin, LinkIcon } from 'lucide-react';
import { marketLabels, usdText } from '../utils/apartmentLabels.js';
import { usePublicLang } from '../hooks/usePublicLang.js';
import { PUBLIC_COPY } from '../utils/publicCopy.js';
import { Lang } from '../utils/shareLang.js';
import { headlineEn, addressEn, toAscii, formatVndEn, feesEn, amenitiesEn, bedroomsEn, FURNISHING_EN, minStayEn, dateEn } from '../utils/listingEn.js';

const FURNISHING_LABEL = { FULL: 'Full đồ', BASIC: 'Đồ cơ bản', EMPTY: 'Nhà trống' } as const;

// Bản đồ khu vực chung: tâm đã làm tròn ~500m từ backend, vòng tròn mờ thay cho ghim vị trí
const AreaMap: React.FC<{ center: [number, number]; title: string }> = ({ center: [lng, lat], title }) => (
  <div className="relative h-56 rounded-xl overflow-hidden border border-slate-200">
    <iframe
      title={title}
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.012},${lat - 0.008},${lng + 0.012},${lat + 0.008}&layer=mapnik`}
      className="w-full h-full border-0"
      loading="lazy"
    />
    <div className="absolute top-1/2 left-1/2 w-28 h-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/20 border-2 border-indigo-500 pointer-events-none" />
  </div>
);

// Nút đổi ngôn ngữ trang khách (Story 7.3)
const LangSwitch: React.FC<{ lang: Lang; onChange: (lang: Lang) => void }> = ({ lang, onChange }) => (
  <div className="absolute top-3 right-3 z-10 flex p-0.5 rounded-full bg-black/50 text-xs font-semibold">
    {(['vi', 'en'] as const).map((option) => (
      <button
        key={option}
        type="button"
        onClick={() => onChange(option)}
        aria-pressed={lang === option}
        className={`h-8 min-w-[40px] px-2.5 rounded-full ${lang === option ? 'bg-white text-slate-900' : 'text-white'}`}
      >
        {option.toUpperCase()}
      </button>
    ))}
  </div>
);

/** Nội dung căn theo ngôn ngữ: tiếng Anh tự sinh từ dữ liệu (tiêu đề gốc do AI viết tiếng Việt). */
function describe(listing: PublicListing, lang: Lang) {
  const { attributes, fees, location } = listing;
  if (lang === 'en') {
    return {
      title: headlineEn(listing),
      place: addressEn(listing),
      price: formatVndEn(listing.price),
      fees: feesEn(listing),
      facts: [
        attributes.area && `${attributes.area}m²`,
        bedroomsEn(attributes.bedrooms),
        FURNISHING_EN[attributes.furnishing],
        ...amenitiesEn(listing),
        listing.minLeaseMonths && `Minimum stay: ${minStayEn(listing.minLeaseMonths)}`,
      ].filter(Boolean) as string[],
      date: (iso: string) => dateEn(iso),
    };
  }
  return {
    title: listing.title,
    place: [location.street, location.ward, location.district, location.city].filter(Boolean).join(', '),
    price: formatVnd(listing.price),
    fees: [
      fees.electricity && `Điện ${formatVnd(fees.electricity)}/kWh`,
      fees.water && `Nước ${formatVnd(fees.water)}`,
      fees.service && `Dịch vụ ${formatVnd(fees.service)}/tháng`,
      fees.parkingMotor && `Gửi xe ${formatVnd(fees.parkingMotor)}/tháng`,
    ].filter(Boolean) as string[],
    facts: [
      attributes.area && `${attributes.area}m²`,
      attributes.bedrooms === 0 ? 'Studio' : `${attributes.bedrooms} phòng ngủ`,
      FURNISHING_LABEL[attributes.furnishing],
      attributes.washingMachine === 'PRIVATE' && 'Máy giặt riêng',
      attributes.elevator && 'Thang máy',
      attributes.carParking && 'Ô tô đỗ cửa',
      attributes.allowPets && 'Nuôi thú cưng',
      attributes.balcony && 'Ban công',
      attributes.pcccStandard && 'PCCC đạt chuẩn',
      ...marketLabels(listing),
    ].filter(Boolean) as string[],
    date: (iso: string) => new Date(iso).toLocaleDateString('vi-VN'),
  };
}

export const PublicListingPage: React.FC = () => {
  const { slug = '' } = useParams();
  const code = slug.split('-').pop() || '';
  const [listing, setListing] = useState<PublicListing | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const { lang, setLang } = usePublicLang();
  const copy = PUBLIC_COPY[lang];

  useEffect(() => {
    shareApi
      .getPublicListing(code)
      .then((data) => {
        setListing(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [code]);

  const view = listing ? describe(listing, lang) : null;
  useEffect(() => {
    if (view) document.title = view.title;
    document.documentElement.lang = lang;
  }, [view?.title, lang]);

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

  if (status === 'error' || !listing || !view) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-3">
        <LinkIcon className="w-12 h-12 text-slate-300" />
        <h1 className="text-lg font-bold text-slate-700">{copy.expiredTitle}</h1>
        <p className="text-sm text-slate-500">{copy.expiredBody}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-44">
      <div className="max-w-xl mx-auto bg-white min-h-screen">
        <div className="relative">
          <PhotoSlider images={listing.images} title={view.title} emptyLabel={copy.noPhotos} photoLabel={copy.photo} />
          <LangSwitch lang={lang} onChange={setLang} />
        </div>

        <div className="p-4 space-y-5">
          {listing.status === 'RENTED' && (
            <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">{copy.rented}</p>
          )}
          {listing.status === 'UPCOMING' && listing.availableDate && (
            <p className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sm text-sky-800">{copy.availableFrom(view.date(listing.availableDate))}</p>
          )}

          <div>
            <h1 className="text-xl font-bold text-slate-900">{view.title}</h1>
            <p className="mt-1 text-sm text-slate-500 flex items-center gap-1">
              <MapPin className="w-4 h-4 shrink-0" />
              {view.place}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
            <p className="text-2xl font-extrabold text-indigo-700">
              {view.price}
              <span className="text-sm font-medium text-indigo-500">{copy.perMonth}</span>
              {listing.priceUsd && <span className="ml-2 text-base font-semibold text-indigo-500">{usdText(listing.priceUsd)}</span>}
            </p>
            {view.fees.length > 0 && <p className="text-sm text-slate-500 mt-2">{view.fees.join(' · ')}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            {view.facts.map((item) => (
              <span key={item} className="px-3 py-1.5 rounded-full bg-slate-100 text-sm text-slate-700">
                {item}
              </span>
            ))}
          </div>

          {listing.location.approximateCenter && (
            <div className="space-y-1.5">
              <AreaMap center={listing.location.approximateCenter} title={copy.mapTitle} />
              <p className="text-[11px] text-slate-400">{copy.mapNote}</p>
            </div>
          )}

          {/* Lời chào CTV tự viết bằng tiếng Việt → chỉ hiện ở trang tiếng Việt */}
          {lang === 'vi' && listing.ctv.greetingMessage && (
            <p className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-600 italic">“{listing.ctv.greetingMessage}”</p>
          )}
        </div>
      </div>

      <ChatWidget code={code} ctvName={listing.ctv.name} greeting={lang === 'vi' ? listing.ctv.greetingMessage : undefined} lang={lang} />
      <CtvContactBar ctv={listing.ctv} copy={copy} />
    </div>
  );
};
