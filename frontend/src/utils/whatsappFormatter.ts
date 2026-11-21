import { Apartment } from '../api/apartmentApi.js';
import { User } from '../api/authApi.js';
import { getWalkingDistanceToBeach } from './distance.js';

const USD_RATE = 25000;

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

/**
 * Tạo bài đăng tiếng Anh chuẩn văn phong quốc tế dành riêng cho WhatsApp (Story 17.3).
 * Sử dụng WhatsApp Markdown: *bold*, _italic_.
 */
export function buildWhatsAppExpatPost(apartment: Apartment, ctv: User | null): string {
  const pType = formatTypeEn(apartment.attributes?.propertyType);
  const street = apartment.location?.street || apartment.location?.address || 'Da Nang';
  const zone = apartment.location?.zone || 'Da Nang';

  // Quy đổi USD
  const usdPrice =
    apartment.priceUsd || (apartment.price ? Math.max(150, Math.round(apartment.price / USD_RATE / 5) * 5) : 0);
  const vndMil = apartment.price ? (apartment.price / 1_000_000).toFixed(1).replace('.0', '') : '';

  // Khoảng cách ra biển
  const beach = getWalkingDistanceToBeach(apartment.location?.coordinates);

  const ctvPhone = ctv?.phone || ctv?.zaloPhone || '+84 xxx xxx xxx';
  const ctvName = ctv?.name || 'Agent';
  const ctvCode = ctv?.ctvCode || '';

  const clientBase = typeof window !== 'undefined' ? window.location.origin : 'https://apartmentsaledn.netlify.app';
  const publicLink = apartment._id
    ? `${clientBase}/p/${apartment._id}?lang=en${ctvCode ? `&ctv=${encodeURIComponent(ctvCode)}` : ''}`
    : '';

  const lines: string[] = [
    `🏡 *[${pType.toUpperCase()} FOR RENT IN DA NANG]*`,
    `📍 *Location:* ${street}, ${zone}, Da Nang`,
    `💵 *Price:* *$${usdPrice}/month*${vndMil ? ` (~${vndMil} million VND)` : ''}`,
  ];

  if (beach && beach.meters <= 2000) {
    lines.push(`🌊 *Beach Proximity:* ~${beach.meters}m to My Khe Beach (${beach.walkMins} mins walk)`);
  } else if (zone === 'Hải Châu') {
    lines.push(`🏙️ *Location Highlight:* In the heart of Da Nang city center, close to Han River`);
  }

  lines.push('');
  lines.push(`✨ *Apartment Highlights:*`);
  lines.push(`• Fully furnished with modern AC, cozy bed & smart TV`);
  lines.push(`• Private kitchen with induction stove, fridge & microwave`);
  lines.push(`• Private in-unit washing machine & clothes drying rack`);
  if (apartment.attributes?.allowPets) {
    lines.push(`• 🐾 *Pet-friendly:* Yes (well-behaved pets welcomed)`);
  }
  lines.push(`• Elevator access, 24/7 security cameras & high-speed Wi-Fi`);

  if (publicLink) {
    lines.push('');
    lines.push(`📸 *Photos, Video Tour & Exact Location:*`);
    lines.push(`👉 ${publicLink}`);
  }

  lines.push('');
  lines.push(`📲 *Contact via WhatsApp / Call for viewing:*`);
  lines.push(`*${ctvPhone}* (${ctvName})`);

  return lines.join('\n');
}

/**
 * Sinh link mở trực tiếp WhatsApp kèm nội dung bài viết
 */
export function createWhatsAppShareUrl(apartment: Apartment, ctv: User | null): string {
  const content = buildWhatsAppExpatPost(apartment, ctv);
  return `https://wa.me/?text=${encodeURIComponent(content)}`;
}
