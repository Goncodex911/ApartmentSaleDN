import { Apartment } from '../api/apartmentApi.js';
import { User } from '../api/authApi.js';
import { priceShort } from './priceShort.js';
import { propertyTypeLabel } from './danang.js';
import { resolveSpintax, SPINTAX_TEMPLATES, generateDanangHashtags } from './spintax.js';
import { highlightsOf, placeOf } from './shareFacts.js';

export type ZaloPostTone = 'deal' | 'professional' | 'short';

/**
 * Trình tạo bài đăng Zalo thông minh kết hợp Spintax Engine (Story 17.2).
 * Story 19.1: `link` là link chia sẻ thật của CTV (`/p/<slug>-<mã>`) — mở được trang căn, ghi nhận lượt xem;
 * vị trí chỉ gồm tên đường + khu vực; tiện ích lấy từ dữ liệu thật của căn.
 */
export function generateZaloPost(apartment: Apartment, ctv: User | null, link: string, tone: ZaloPostTone = 'deal'): string {
  const { street, area } = placeOf(apartment);
  const zone = apartment.location?.zone || '';
  const place = street ? `${street}${area ? ` - ${area}` : ''}` : area || 'Đà Nẵng';
  const pType = propertyTypeLabel(apartment.attributes?.propertyType);
  const formattedPrice = apartment.price ? `${apartment.price.toLocaleString('vi-VN')} đ/tháng` : priceShort(apartment.price, apartment.priceUsd);
  const ctvPhone = ctv?.zaloPhone || ctv?.phone || '09xx xxx xxx';
  const ctvName = ctv?.name || 'Em';
  const highlights = highlightsOf(apartment, 'vi');
  const zoneHighlight = SPINTAX_TEMPLATES.locationHighlights[zone] || '{vị trí trung tâm thuận tiện | khu vực dân trí cao an ninh}';
  const hashtags = generateDanangHashtags(zone);

  if (tone === 'short') {
    return resolveSpintax(`
{🏠 | ⚡ | 🔥} ${pType} - ${place}
💰 {Giá chỉ: | Giá: | Giá thuê:} ${formattedPrice}
${highlights.length ? `✨ ${highlights.slice(0, 3).join(', ')}\n` : ''}👉 Xem ảnh & video chi tiết: ${link}
📞 Zalo/Call: ${ctvPhone} (${ctvName})
    `);
  }

  const list = (bullet: string) => highlights.map((item) => `${bullet} ${item}`).join('\n');

  if (tone === 'professional') {
    const heading = SPINTAX_TEMPLATES.proHeadings[Math.floor(Math.random() * SPINTAX_TEMPLATES.proHeadings.length)];
    return resolveSpintax(`
${heading} ${zone ? zone.toUpperCase() : 'ĐÀ NẴNG'}

📍 Vị trí: ${street ? `Đường ${street}, ` : ''}${area ? `khu vực ${area}, ` : ''}Đà Nẵng (${zoneHighlight})
🏢 Loại căn: ${pType}${apartment.attributes?.area ? ` (${apartment.attributes.area}m²)` : ''}
💵 Giá thuê niêm yết: ${formattedPrice}
${highlights.length ? `\n📋 {THÔNG TIN DỊCH VỤ & TIỆN NGHI: | TIỆN ÍCH CĂN HỘ:}\n${list('-')}\n` : ''}
🔗 Chi tiết mặt bằng, hình ảnh & video tour:
${link}

${SPINTAX_TEMPLATES.ctaVariants[1]} ${ctvPhone} (${ctvName})

${hashtags}
    `);
  }

  // Phong cách Bắt Mắt / Hot Deal (Mặc định)
  const heading = SPINTAX_TEMPLATES.dealHeadings[Math.floor(Math.random() * SPINTAX_TEMPLATES.dealHeadings.length)];
  return resolveSpintax(`
${heading} 💥

🏡 ${pType} tại ${place}
📍 Vị trí: ${zoneHighlight}
💰 {Giá thuê hấp dẫn chỉ: | Giá thuê: | Chỉ từ:} ${formattedPrice}
${highlights.length ? `\n🌟 {Điểm cộng nổi bật: | Tiện nghi:}\n${list('✔')}\n` : ''}
📸 Xem trọn bộ ảnh gốc & video phòng tại đây:
👉 ${link}

${SPINTAX_TEMPLATES.ctaVariants[0]}
📞 Hotline/Zalo: ${ctvPhone} (${ctvName})

${hashtags}
  `);
}
