import { DANANG_DISTRICTS } from './landmarks.data.js';

/**
 * Từ điển Tiếng Lóng Bất Động Sản & Quy tắc Mở rộng Đồng nghĩa (Synonyms Mapping)
 */

export interface ISlangRule {
  keywords: string[];
  synonyms: string[];
  attributeFilter?: Record<string, any>;
}

// Cụm từ không dấu → regex khớp cả có dấu/không dấu (VD "gan bien" khớp "gần biển")
const textRegex = (phrases: string[]) => new RegExp(phrases.map(buildDiacriticRegex).join('|'), 'i');
const BEACH_TEXT = textRegex(['gan bien', 'sat bien', 'mat bien', 'view bien', 'ra bien', 'beach']);
const POOL_TEXT = textRegex(['ho boi', 'be boi', 'pool']);

/**
 * Gần biển (Story 7.2): có số liệu ≤ 1km, HOẶC căn cũ chưa có số liệu nhưng tiêu đề/mô tả ghi "gần biển"/"beach".
 * Dùng chung cho chip bộ lọc (FilterBuilder) và câu tìm kiếm (QueryAnalyzer) để 2 cách tìm cho cùng kết quả.
 */
export const NEAR_BEACH_CONDITION = {
  $or: [
    { 'attributes.distanceToBeachM': { $lte: 1000 } },
    { 'attributes.distanceToBeachM': { $exists: false }, $or: [{ title: BEACH_TEXT }, { description: BEACH_TEXT }] },
  ],
};
export const POOL_CONDITION = { $or: [{ 'attributes.pool': true }, { title: POOL_TEXT }, { description: POOL_TEXT }] };

export const REAL_ESTATE_SLANG_RULES: ISlangRule[] = [
  {
    keywords: ['gan bien', 'sat bien', 'mat bien', 'view bien', 'ra bien', 'beach', 'near beach', 'beachfront'],
    synonyms: [], // Điều kiện chữ đã nằm trong NEAR_BEACH_CONDITION
    attributeFilter: NEAR_BEACH_CONDITION,
  },
  {
    keywords: ['ho boi', 'be boi', 'pool', 'swimming pool'],
    synonyms: [],
    attributeFilter: POOL_CONDITION,
  },
  {
    keywords: ['ccmn', 'chung cu mini'],
    synonyms: ['chung cư mini', 'ccmn', 'căn hộ mini', 'khép kín'],
  },
  {
    keywords: ['chdv', 'can ho dich vu'],
    synonyms: ['căn hộ dịch vụ', 'chdv', 'serviced apartment'],
  },
  {
    keywords: ['1n1k', '1pn', '1 ngu 1 khach', '1 phong ngu', '1br', '1 bedroom'],
    synonyms: ['1n1k', '1 ngủ 1 khách', '1 phòng ngủ', '1pn'],
    attributeFilter: { 'attributes.bedrooms': 1 },
  },
  {
    keywords: ['2n1k', '2pn', '2 ngu 1 khach', '2 phong ngu', '2br', '2 bedrooms', '2 bedroom'],
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
    keywords: ['do co ban', 'noi that co ban'], // Không dùng 'co ban' trơn: 'có ban công' sẽ khớp nhầm
    synonyms: ['cơ bản', 'nội thất cơ bản', 'điều hòa nóng lạnh'],
    attributeFilter: { 'attributes.furnishing': 'BASIC' },
  },
  {
    keywords: ['pet', 'thu cung', 'cho meo', 'nuoi pet'],
    synonyms: ['nuôi pet', 'thú cưng', 'chó mèo', 'cho nuôi pet'],
    attributeFilter: { 'attributes.allowPets': true },
  },
  {
    keywords: ['thang may', 'elevator'],
    synonyms: ['thang máy', 'elevator'],
    attributeFilter: { 'attributes.elevator': true },
  },
  {
    keywords: ['oto', 'o to', 'o to do cua', 'oto vao nha'],
    synonyms: ['ô tô', 'oto', 'ô tô đỗ cửa', 'ô tô vào nhà'],
    attributeFilter: { 'attributes.carParking': true },
  },
  {
    keywords: ['ban cong', 'balcony'],
    synonyms: ['ban công', 'balcony'],
    attributeFilter: { 'attributes.balcony': true },
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
 * Tên khu vực Đà Nẵng + viết tắt hay gõ (so khớp nguyên từ, không dấu, viết liền/rời đều nhận).
 * Không dùng "st" cho Sơn Trà: trùng chữ viết tắt "Street" trong tin tiếng Anh.
 */
export const DISTRICT_SYNONYMS: Record<string, string> = {
  ...Object.fromEntries(DANANG_DISTRICTS.map((name) => [name, name])),
  hc: 'Hải Châu',
  tk: 'Thanh Khê',
  nhs: 'Ngũ Hành Sơn',
  lc: 'Liên Chiểu',
  cl: 'Cẩm Lệ',
  hv: 'Hòa Vang',
};

