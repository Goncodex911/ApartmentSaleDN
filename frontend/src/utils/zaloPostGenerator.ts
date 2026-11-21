import { Apartment } from '../api/apartmentApi.js';
import { User } from '../api/authApi.js';
import { priceShort } from './priceShort.js';
import { propertyTypeLabel } from './danang.js';
import { resolveSpintax, SPINTAX_TEMPLATES, generateDanangHashtags } from './spintax.js';

export type ZaloPostTone = 'deal' | 'professional' | 'short';

export interface GenerateZaloOptions {
  tone?: ZaloPostTone;
}

/**
 * Trình tạo bài đăng Zalo thông minh kết hợp Spintax Engine (Story 17.2).
 * Giữ nguyên các thông số cốt lõi: Giá, SĐT, Tên CTV, Link xem phòng.
 */
export function generateZaloPost(
  apartment: Apartment,
  ctv: User | null,
  options: GenerateZaloOptions = {}
): string {
  const tone = options.tone || 'deal';
  const zone = apartment.location?.zone || '';
  const street = apartment.location?.street || apartment.location?.address || 'Đà Nẵng';
  const pType = propertyTypeLabel(apartment.attributes?.propertyType);
  const priceDisplay = priceShort(apartment.price, apartment.priceUsd);
  const formattedPrice = apartment.price ? `${apartment.price.toLocaleString('vi-VN')} đ/tháng` : priceDisplay;
  const ctvPhone = ctv?.zaloPhone || ctv?.phone || '09xx xxx xxx';
  const ctvName = ctv?.name || 'Em';
  const ctvCode = ctv?.ctvCode || '';

  // Link xem phòng công khai
  const clientBase = typeof window !== 'undefined' ? window.location.origin : 'https://apartmentsaledn.netlify.app';
  const publicLink = apartment._id
    ? `${clientBase}/p/${apartment._id}${ctvCode ? `?ctv=${encodeURIComponent(ctvCode)}` : ''}`
    : '';

  const zoneHighlight = SPINTAX_TEMPLATES.locationHighlights[zone] || '{vị trí trung tâm thuận tiện | khu vực dân trí cao an ninh}';
  const hashtags = generateDanangHashtags(zone);

  if (tone === 'short') {
    // Phong cách Ngắn gọn (Micro-post 4-5 dòng)
    const rawShort = `
{🏠 | ⚡ | 🔥} ${pType} - ${street}${zone ? ` (${zone})` : ''}
💰 {Giá chỉ: | Giá: | Giá thuê:} ${formattedPrice}
✨ {Full nội thất xách vali vào ở | Phòng đẹp ban công thoáng mát | Bếp riêng, máy giặt riêng}
${publicLink ? `👉 Xem ảnh & video chi tiết: ${publicLink}\n` : ''}📞 Zalo/Call: ${ctvPhone} (${ctvName})
    `.trim();
    return resolveSpintax(rawShort);
  }

  if (tone === 'professional') {
    // Phong cách Chuyên nghiệp
    const heading = SPINTAX_TEMPLATES.proHeadings[Math.floor(Math.random() * SPINTAX_TEMPLATES.proHeadings.length)];
    const rawPro = `
${heading} ${zone ? zone.toUpperCase() : 'ĐÀ NẴNG'}

📍 Vị trí: Đường ${street}, ${zone ? `khu vực ${zone}, ` : ''}Đà Nẵng (${zoneHighlight})
🏢 Loại căn: ${pType}${apartment.attributes?.area ? ` (${apartment.attributes.area}m²)` : ''}
💵 Giá thuê niêm yết: ${formattedPrice}

📋 {THÔNG TIN DỊCH VỤ & TIỆN NGHI: | TIỆN ÍCH TÒA NHÀ:}
- ${SPINTAX_TEMPLATES.furnitureVariants[0]}
- ${SPINTAX_TEMPLATES.furnitureVariants[1]}
- ${SPINTAX_TEMPLATES.furnitureVariants[2]}
- ${SPINTAX_TEMPLATES.furnitureVariants[3]}
${apartment.attributes?.allowPets ? '- 🐾 Cho phép nuôi thú cưng (Pet-friendly)\n' : ''}
${publicLink ? `🔗 Chi tiết mặt bằng, hình ảnh & video tour:\n${publicLink}\n` : ''}
${SPINTAX_TEMPLATES.ctaVariants[1]} ${ctvPhone} (${ctvName})

${hashtags}
    `.trim();
    return resolveSpintax(rawPro);
  }

  // Phong cách Bắt Mắt / Hot Deal (Mặc định)
  const heading = SPINTAX_TEMPLATES.dealHeadings[Math.floor(Math.random() * SPINTAX_TEMPLATES.dealHeadings.length)];
  const rawDeal = `
${heading} 💥

🏡 Căn hộ ${pType} cực xinh tại ${street}${zone ? ` - ${zone}` : ''}
📍 Vị trí đắc địa: ${zoneHighlight}
💰 {Giá thuê hấp dẫn chỉ: | Giá thuê sốc: | Chỉ từ:} ${formattedPrice}

🌟 {Ưu điểm vượt trội: | Điểm cộng nổi bật: | Tiện nghi đầy đủ:}
✔ ${SPINTAX_TEMPLATES.furnitureVariants[0]}
✔ ${SPINTAX_TEMPLATES.furnitureVariants[1]}
✔ ${SPINTAX_TEMPLATES.furnitureVariants[2]}
✔ ${SPINTAX_TEMPLATES.furnitureVariants[3]}
${apartment.attributes?.allowPets ? '✔ 🐾 Nhận thú cưng ngoan ngoãn\n' : ''}
${publicLink ? `📸 Xem trọn bộ ảnh gốc & video phòng tại đây:\n👉 ${publicLink}\n` : ''}
${SPINTAX_TEMPLATES.ctaVariants[0]}
📞 Hotline/Zalo: ${ctvPhone} (${ctvName})

${hashtags}
  `.trim();

  return resolveSpintax(rawDeal);
}
