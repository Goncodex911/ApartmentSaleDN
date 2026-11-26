import { describe, expect, it } from 'vitest';
import { sameStreet, streetKey } from '../src/modules/dedup/street-key.js';
import { decodePlusCode, isValidDanangCoordinates } from '../src/utils/google-maps.js';
import { toBedrooms } from '../src/modules/ingestion/gemini.service.js';
import { FilterBuilder } from '../src/modules/search/filter.builder.js';
import { buildPhoneRegex, matchesTargetListing } from '../src/modules/ingestion/telegram-match.util.js';
import { toTelegramError } from '../src/modules/ingestion/telegram-errors.js';

// Story 19.12: bộ test tối thiểu cho các hàm thuần quyết định khử trùng, định vị, lọc, cào tin Telegram

describe('streetKey / sameStreet (Story 19.4)', () => {
  it.each([
    ['K12/5 Lê Quang Đạo', 'le quang dao'],
    ['An Thượng 1', 'an thuong 1'],
    ['12 An Thượng 38', 'an thuong 38'],
    ['Mỹ An 3', 'my an 3'],
    ['Đường 2/9', '2 9'],
    ['đường 30/4, Hải Châu', '30 4'],
    ['Số 8 Lô 3 đường Võ Nguyên Giáp', 'vo nguyen giap'],
    ['Kiệt 12 Nguyễn Văn Linh', 'nguyen van linh'],
    ['Hẻm 45/2 Hà Bổng', 'ha bong'],
    ['Khuê Mỹ Đông 1', 'khue my dong 1'],
    ['Đang cập nhật địa chỉ', ''],
    ['30/4', ''],
  ])('%s → "%s"', (input, expected) => expect(streetKey(input)).toBe(expected));

  it('phân biệt đường cùng tên khác số hiệu, vẫn khớp khi chỉ khác số nhà', () => {
    expect(sameStreet('An Thượng 1', 'An Thượng 38')).toBe(false);
    expect(sameStreet('An Thượng 1', '25 An Thượng 1')).toBe(true);
    expect(sameStreet('Đang cập nhật địa chỉ', 'Đang cập nhật địa chỉ')).toBe(false);
  });
});

describe('decodePlusCode (Story 19.5)', () => {
  it('mã rút gọn phía Bắc vĩ tuyến 16° (Hải Châu)', () => {
    const [lng, lat] = decodePlusCode('369C+48')!;
    expect(lat).toBeGreaterThan(16);
    expect(isValidDanangCoordinates(lng, lat)).toBe(true);
  });
  it.each([
    ['X7H4+5W', 16], // FPT City
    ['V8JQ+25', 15.9], // Hội An
  ])('mã rút gọn phía Nam %s vẫn trong Đà Nẵng (vĩ độ < %s)', (code, maxLat) => {
    const [lng, lat] = decodePlusCode(code)!;
    expect(lat).toBeLessThan(maxLat);
    expect(isValidDanangCoordinates(lng, lat)).toBe(true);
  });
});

describe('Căn Studio 0 phòng ngủ (Story 19.6)', () => {
  it.each([
    [0, 0],
    ['0', 0],
    ['2', 2],
    [null, 1],
    ['', 1],
    [1.5, 1],
  ])('toBedrooms(%s) = %s', (input, expected) => expect(toBedrooms(input)).toBe(expected));

  it('bộ lọc nhận bedrooms = 0', () => {
    expect((FilterBuilder.build({ bedrooms: 0 } as any) as any)['attributes.bedrooms']).toBe(0);
    expect((FilterBuilder.build({} as any) as any)['attributes.bedrooms']).toBeUndefined();
  });
});

describe('Khớp SĐT người đăng Telegram', () => {
  const post = (text: string) => [{ message: text }];
  it('nhận mọi cách viết SĐT', () => {
    for (const text of ['LH 0905.123.456', 'Zalo +84 905 123 456', 'Liên hệ 0905-123-456']) {
      expect(matchesTargetListing(post(text), '0905123456')).toBe(true);
    }
  });
  it('không khớp nhầm số nằm trong dãy dài hơn', () => {
    expect(buildPhoneRegex('0905123456')!.test('Giá 10905123456 đồng')).toBe(false);
    expect(matchesTargetListing(post('SĐT 09051234567'), '0905123456')).toBe(false);
  });
});

describe('Lỗi Telegram tiếng Việt (Story 18.3)', () => {
  const rpc = (errorMessage: string, extra: object = {}) => Object.assign(new Error(errorMessage), { errorMessage, ...extra });
  it('ánh xạ mã lỗi', () => {
    expect((toTelegramError(rpc('PHONE_CODE_INVALID')) as any).code).toBe('TELEGRAM_CODE_INVALID');
    expect((toTelegramError(rpc('SESSION_REVOKED')) as any).code).toBe('TELEGRAM_SESSION_DEAD');
  });
  it('FLOOD_WAIT trả số giây chờ', () => {
    const error = toTelegramError(rpc('FLOOD', { seconds: 754 })) as any;
    expect(error.code).toBe('TELEGRAM_FLOOD_WAIT');
    expect(error.retryAfterSec).toBe(754);
  });
});
