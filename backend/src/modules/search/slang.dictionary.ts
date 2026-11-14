/**
 * Từ điển Tiếng Lóng Bất Động Sản & Quy tắc Mở rộng Đồng nghĩa (Synonyms Mapping)
 */

export interface ISlangRule {
  keywords: string[];
  synonyms: string[];
  attributeFilter?: Record<string, any>;
}

export const REAL_ESTATE_SLANG_RULES: ISlangRule[] = [
  {
    keywords: ['ccmn', 'chung cu mini'],
    synonyms: ['chung cư mini', 'ccmn', 'căn hộ mini', 'khép kín'],
  },
  {
    keywords: ['chdv', 'can ho dich vu'],
    synonyms: ['căn hộ dịch vụ', 'chdv', 'serviced apartment'],
  },
  {
    keywords: ['1n1k', '1pn', '1 ngu 1 khach', '1 phong ngu'],
    synonyms: ['1n1k', '1 ngủ 1 khách', '1 phòng ngủ', '1pn'],
    attributeFilter: { 'attributes.bedrooms': 1 },
  },
  {
    keywords: ['2n1k', '2pn', '2 ngu 1 khach', '2 phong ngu'],
    synonyms: ['2n1k', '2 ngủ 1 khách', '2 phòng ngủ', '2pn'],
    attributeFilter: { 'attributes.bedrooms': 2 },
  },
  {
    keywords: ['studio'],
    synonyms: ['studio', 'khép kín', 'phòng đơn'],
    attributeFilter: { 'attributes.bedrooms': 1 },
  },
  {
    keywords: ['duplex', 'gac xep', 'gac lung'],
    synonyms: ['duplex', 'gác xép', 'gác lửng', 'thông tầng'],
  },
  {
    keywords: ['full do', 'full noi that', 'day du noi that'],
    synonyms: ['full đồ', 'đầy đủ nội thất', 'full nội thất', 'đủ đồ'],
    attributeFilter: { 'attributes.furnishing': 'FULL' },
  },
  {
    keywords: ['co ban', 'noi that co ban'],
    synonyms: ['cơ bản', 'nội thất cơ bản', 'điều hòa nóng lạnh'],
    attributeFilter: { 'attributes.furnishing': 'BASIC' },
  },
  {
    keywords: ['pet', 'thu cung', 'cho meo', 'nuoi pet'],
    synonyms: ['nuôi pet', 'thú cưng', 'chó mèo', 'cho nuôi pet'],
    attributeFilter: { 'attributes.allowPets': true },
  },
  {
    keywords: ['thang may'],
    synonyms: ['thang máy', 'elevator'],
    attributeFilter: { 'attributes.elevator': true },
  },
  {
    keywords: ['oto', 'o to', 'o to do cua', 'oto vao nha'],
    synonyms: ['ô tô', 'oto', 'ô tô đỗ cửa', 'ô tô vào nhà'],
    attributeFilter: { 'attributes.carParking': true },
  },
  {
    keywords: ['pccc', 'phong chay', 'thoat hiem'],
    synonyms: ['pccc', 'phòng cháy', 'thoát hiểm', 'thang thoát hiểm'],
    attributeFilter: { 'attributes.pcccStandard': true },
  },
];

/**
 * Tạo chuỗi Regex tiếng Việt linh hoạt không phân biệt dấu và chữ hoa thường
 */
export function buildDiacriticRegex(str: string): string {
  if (!str) return '';
  const map: Record<string, string> = {
    a: '[aàáảãạăằắẳẵặâầấẩẫậ]',
    e: '[eèéẻẽẹêềếểễệ]',
    i: '[iìíỉĩị]',
    o: '[oòóỏõọôồốổỗộơờớởỡợ]',
    u: '[uùúủũụưừứửữự]',
    y: '[yỳýỷỹỵ]',
    d: '[dđ]',
  };

  const lower = str.toLowerCase();
  let pattern = '';
  for (const ch of lower) {
    pattern += map[ch] || (/[a-z0-9]/.test(ch) ? ch : `\\${ch}`);
  }
  return pattern;
}

/**
 * Xử lý lỗi gõ nhầm (Levenshtein 1 lỗi) cho các địa danh Hà Nội phổ biến
 */
export const HANOI_DISTRICT_SYNONYMS: Record<string, string> = {
  caugiay: 'Cầu Giấy',
  caugay: 'Cầu Giấy',
  cg: 'Cầu Giấy',
  dongda: 'Đống Đa',
  doda: 'Đống Đa',
  dd: 'Đống Đa',
  namtuliem: 'Nam Từ Liêm',
  ntl: 'Nam Từ Liêm',
  bactuliem: 'Bắc Từ Liêm',
  btl: 'Bắc Từ Liêm',
  thanhxuan: 'Thanh Xuân',
  tx: 'Thanh Xuân',
  badinh: 'Ba Đình',
  tayho: 'Tây Hồ',
  th: 'Tây Hồ',
  haibatrung: 'Hai Bà Trưng',
  hbt: 'Hai Bà Trưng',
  hoangmai: 'Hoàng Mai',
  hadong: 'Hà Đông',
  hd: 'Hà Đông',
};

