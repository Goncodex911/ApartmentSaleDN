import { describe, expect, it } from 'vitest';
import { generateZaloPost } from '../src/utils/zaloPostGenerator.js';
import { buildWhatsAppExpatPost } from '../src/utils/whatsappFormatter.js';
import { inferDanangZone } from '../src/utils/reverseGeocoding.js';
import { isLngLat } from '../src/utils/mapTiles.js';

// Story 19.12: bộ test tối thiểu cho bài chia sẻ (Story 19.1) và định vị (Story 19.3, 19.10)

const LINK = { url: 'https://apartmentsaledn.pages.dev/p/can-ho-my-an-ab12cd34', code: 'ab12cd34', views: 0, usdRate: 25000 };
const apartment: any = {
  _id: '665f00000000000000000001',
  title: 'Căn hộ 1PN Mỹ An',
  price: 8_000_000,
  status: 'AVAILABLE',
  images: [],
  includedServices: ['WIFI'],
  attributes: { propertyType: 'ONE_BED', bedrooms: 1, furnishing: 'FULL', elevator: true },
  location: { address: 'K12/5 Lê Quang Đạo', houseNumber: 'K12/5', street: 'Lê Quang Đạo', zone: 'Mỹ An', district: 'Ngũ Hành Sơn' },
};

describe('Bài Zalo / WhatsApp (Story 19.1)', () => {
  it.each(['deal', 'professional', 'short'] as const)('Zalo (%s): link chia sẻ thật, không số nhà, chỉ tiện ích thật', (tone) => {
    const post = generateZaloPost(apartment, null, LINK.url, tone);
    expect(post).toContain(LINK.url);
    expect(post).not.toContain('/p/665f');
    expect(post).not.toContain('K12/5');
    expect(post).not.toMatch(/máy giặt|ban công|thang máy tốc độ cao/i); // Căn không có → không quảng cáo
  });

  it('Zalo: thiếu tên đường → không in chuỗi giữ chỗ', () => {
    const post = generateZaloPost({ ...apartment, location: { ...apartment.location, street: undefined, address: 'Đang cập nhật địa chỉ' } }, null, LINK.url);
    expect(post).not.toContain('Đang cập nhật');
  });

  it('WhatsApp: link tiếng Anh, giá USD theo tỷ giá, không tiện ích ghi cứng', () => {
    const post = buildWhatsAppExpatPost(apartment, null, { ...LINK, usdRate: 20000 });
    expect(post).toContain(`${LINK.url}?lang=en`);
    expect(post).toContain('$400/month'); // 8.000.000 / 20.000
    expect(post).not.toContain('washing machine');
    expect(post).toContain('Elevator');
  });
});

describe('Định vị (Story 19.3, 19.10)', () => {
  it('isLngLat loại mảng rỗng / sai kiểu', () => {
    expect(isLngLat([])).toBe(false);
    expect(isLngLat(['108.2', '16.0'])).toBe(false);
    expect(isLngLat([108.2, 16.05])).toBe(true);
  });

  it.each([
    ['An Thượng', 108.2445, 16.0525, 'Mỹ An'],
    ['Cầu Rồng bờ Đông', 108.2295, 16.061, 'An Hải'],
    ['Thuận Phước (bờ Tây sông Hàn)', 108.219, 16.084, 'Hải Châu'],
    ['Khuê Mỹ', 108.2455, 16.026, 'Khuê Mỹ'],
    ['Hòa Xuân', 108.22, 16.008, 'Hòa Xuân'],
    ['Mân Thái', 108.243, 16.094, 'Sơn Trà'],
  ])('%s → %s', (_name, lng, lat, zone) => expect(inferDanangZone(lng, lat)).toBe(zone));
});
