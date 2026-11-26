import { Apartment } from '../api/apartmentApi.js';
import { User } from '../api/authApi.js';
import { ShareLinkInfo } from '../api/shareApi.js';
import { getWalkingDistanceToBeach } from './distance.js';
import { highlightsOf, placeOf } from './shareFacts.js';

const FALLBACK_USD_RATE = 25000; // Chỉ dùng khi máy chủ không trả tỷ giá (bản backend cũ)

function formatTypeEn(type?: string): string {
  switch (type) {
    case 'STUDIO':
      return 'Cozy Studio';
    case 'ONE_BED':
      return '1-Bedroom Apartment';
    case 'TWO_BED':
      return '2-Bedroom Apartment';
    case 'THREE_BED':
      return '3-Bedroom Apartment';
    case 'DUPLEX':
      return 'Modern Duplex';
    case 'PENTHOUSE':
      return 'Luxury Penthouse';
    default:
      return 'Modern Apartment';
  }
}

/** Link chia sẻ thật của CTV, mở trang khách bằng tiếng Anh */
const englishLink = (url: string) => `${url}${url.includes('?') ? '&' : '?'}lang=en`;

/**
 * Tạo bài đăng tiếng Anh chuẩn văn phong quốc tế dành riêng cho WhatsApp (Story 17.3).
 * Story 19.1: link chia sẻ thật, quy đổi USD theo tỷ giá cấu hình, vị trí không kèm số nhà, tiện ích theo dữ liệu thật.
 */
export function buildWhatsAppExpatPost(apartment: Apartment, ctv: User | null, link: ShareLinkInfo): string {
  const pType = formatTypeEn(apartment.attributes?.propertyType);
  const { street, area } = placeOf(apartment);
  const zone = apartment.location?.zone;
  const rate = link.usdRate || FALLBACK_USD_RATE;
  const usdPrice = apartment.priceUsd || (apartment.price ? Math.max(150, Math.round(apartment.price / rate / 5) * 5) : 0);
  const vndMil = apartment.price ? (apartment.price / 1_000_000).toFixed(1).replace('.0', '') : '';
  const beach = getWalkingDistanceToBeach(apartment.location?.coordinates);
  const ctvPhone = ctv?.phone || ctv?.zaloPhone || '+84 xxx xxx xxx';
  const ctvName = ctv?.name || 'Agent';
  const highlights = highlightsOf(apartment, 'en');

  const lines: string[] = [
    `🏡 *[${pType.toUpperCase()} FOR RENT IN DA NANG]*`,
    `📍 *Location:* ${[street, area, 'Da Nang'].filter(Boolean).join(', ')}`,
    `💵 *Price:* *$${usdPrice}/month*${vndMil ? ` (~${vndMil} million VND)` : ''}`,
  ];
  if (beach && beach.meters <= 2000) {
    lines.push(`🌊 *Beach Proximity:* ~${beach.meters}m to My Khe Beach (${beach.walkMins} mins walk)`);
  } else if (zone === 'Hải Châu') {
    lines.push(`🏙️ *Location Highlight:* In the heart of Da Nang city center, close to Han River`);
  }
  if (highlights.length) lines.push('', `✨ *Apartment Highlights:*`, ...highlights.map((item) => `• ${item}`));
  lines.push('', `📸 *Photos, Video Tour & Location:*`, `👉 ${englishLink(link.url)}`);
  lines.push('', `📲 *Contact via WhatsApp / Call for viewing:*`, `*${ctvPhone}* (${ctvName})`);
  return lines.join('\n');
}

/** Link mở thẳng WhatsApp kèm nội dung bài */
export const whatsAppShareUrl = (content: string) => `https://wa.me/?text=${encodeURIComponent(content)}`;
