import { describe, expect, it } from 'vitest';
import { sameStreet, streetKey, suspectNumberedStreets } from '../src/modules/dedup/street-key.js';
import { splitAddress } from '../src/utils/street.js';
import { isTripletDuplicate } from '../src/modules/dedup/similar-apartment.js';
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
    // CE-03.1: đường ngày lễ có khóa chung (trước đây "2 9" / "30 4", "30/4" đứng một mình → "")
    ['Đường 2/9', '2 thang 9'],
    ['đường 30/4, Hải Châu', '30 thang 4'],
    ['30-4 Hải Châu', '30 thang 4'],
    ['2 tháng 9', '2 thang 9'],
    ['30/4 Mỹ An 22', 'my an 22'],
    ['Mỹ An 2 - Ngũ Hành Sơn', 'my an 2'],
    ['Mỹ An 2 (gần biển)', 'my an 2'],
    ['12 Nguyễn Văn Thoại Mỹ An', 'nguyen van thoai'],
    ['Võ Nguyên Giáp P. Phước Mỹ Sơn Trà', 'vo nguyen giap'],
    ['2 Mỹ An', 'my an'],
    ['Số 8 Lô 3 đường Võ Nguyên Giáp', 'vo nguyen giap'],
    ['Kiệt 12 Nguyễn Văn Linh', 'nguyen van linh'],
    ['Hẻm 45/2 Hà Bổng', 'ha bong'],
    ['Khuê Mỹ Đông 1', 'khue my dong 1'],
    ['Đang cập nhật địa chỉ', ''],
    ['30/4', '30 thang 4'],
  ])('%s → "%s"', (input, expected) => expect(streetKey(input)).toBe(expected));

  it.each([
    ['Mỹ An 22', 'Mỹ An 2', false],
    ['Mỹ An 22', 'Mỹ An', false],
    ['Mỹ An 22', '2 Mỹ An', false],
    ['Mỹ An 22', 'K12/3 Mỹ An 22', true],
    ['Mỹ An 2 - Ngũ Hành Sơn', 'Mỹ An 2', true],
    ['Mỹ An 2 (gần biển)', 'Mỹ An 2', true],
    ['Nguyễn Văn Thoại Mỹ An', 'Nguyễn Văn Thoại', true],
    ['Đường An Thượng 1', 'An Thượng 1, Ngũ Hành Sơn', true],
    ['Đường 2/9', '2 tháng 9', true],
  ])('sameStreet(%s, %s) = %s (CE-03.1)', (a, b, expected) => expect(sameStreet(a, b)).toBe(expected));

  it.each([
    ['30/4 Hải Châu', { street: '30/4' }],
    ['2 tháng 9', { street: '2 tháng 9' }],
    ['30/4 Mỹ An 22', { houseNumber: '30/4', street: 'Mỹ An 22' }],
    ['K12/3 Bà Huyện Thanh Quan, Mỹ An', { houseNumber: 'K12/3', street: 'Bà Huyện Thanh Quan' }],
  ])('splitAddress(%s) (CE-03.1)', (input, expected) => expect(splitAddress(input)).toEqual(expected));

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

describe('isTripletDuplicate (CE-03.2)', () => {
  const input = { street: 'Mỹ An 22', price: 8_000_000, propertyType: 'APARTMENT', bedrooms: 1, houseNumber: '16', phone: '0905123456' };
  const apt = (over: Record<string, any> = {}) =>
    ({
      title: 'Căn 1PN Mỹ An 22',
      price: 8_200_000,
      location: { street: 'Mỹ An 22', houseNumber: 'K16', ...over.location },
      attributes: { propertyType: 'APARTMENT', bedrooms: 1, ...over.attributes },
      ownerContact: { phone: '0905123456', ...over.ownerContact },
    }) as any;

  it('cùng số nhà viết khác (Kiệt 16 = K16)', () => {
    expect(isTripletDuplicate({ ...input, houseNumber: 'Kiệt 16' }, apt())).not.toBeNull();
  });
  it('đủ điều kiện → trùng, kèm lý do', () => {
    expect(isTripletDuplicate(input, apt())).toBe('Cùng đường Mỹ An 22, giá lệch 3%, cùng loại Căn hộ 1 PN');
  });
  it.each([
    ['khác số nhà', { location: { houseNumber: '40' } }],
    ['khác số nhà có chữ', { location: { houseNumber: 'Số 16S' } }],
    ['khác tòa nhà', { location: { buildingName: 'Monarchy' } }],
    ['khác SĐT chủ', { ownerContact: { phone: '0935999888' } }],
    ['cùng loại khác số phòng', { attributes: { bedrooms: 2 } }],
    ['khác đường số', { location: { street: 'Mỹ An 2' } }],
  ])('%s → không trùng', (_label, over) => expect(isTripletDuplicate({ ...input, buildingName: 'Sun' }, apt(over))).toBeNull());
});

describe('suspectNumberedStreets (CE-03.4)', () => {
  it.each([
    ['Mỹ An', 'Cho thuê căn 1PN kiệt 16 Mỹ An 22, giá 8tr', ['my an 22']],
    ['Mỹ An 2', 'Căn hộ đường Mỹ An 22 gần biển', ['my an 22']],
    ['Mỹ An 22', 'Căn hộ 16 Mỹ An 22 gần biển', []],
    ['Mỹ An', 'Phường Mỹ An 2 phòng ngủ full nội thất', []],
    ['Mỹ An', 'Căn Mỹ An 2PN', []],
    ['30/4', 'đường 30/4 gần cầu', []],
  ])('%s ← "%s"', (street, raw, expected) => expect(suspectNumberedStreets(street, raw)).toEqual(expected));
});
