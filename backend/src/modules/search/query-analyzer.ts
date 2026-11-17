import { REAL_ESTATE_SLANG_RULES, buildDiacriticRegex } from './slang.dictionary.js';
import { consumeDistrict } from './district.js';
import { LANDMARKS } from './landmarks.data.js';
import { toSearchTokens, consumePhrase, meaningfulWords } from './text-tokens.js';

export interface IAnalyzedQuery {
  expandedConditions: any[];
  recognizedDistrict?: string;
  cleanedQuery: string; // Từ khóa có nghĩa còn lại sau khi bóc quận, tiếng lóng, điểm mốc, từ đệm, cụm giá
}

// Các trường văn bản dùng để khớp từ khóa tự do
const KEYWORD_FIELDS = ['title', 'description', 'location.address', 'location.ward', 'location.district'];
const WORD_START = `(?:^|[\\s,.;:!?()/'"-])`;
const WORD_END = `(?=$|[\\s,.;:!?()/'"-])`;

export class QueryAnalyzer {
  /**
   * Phân tích câu tìm kiếm: bóc tách quận (kể cả viết tắt/gõ nhầm), tiếng lóng BĐS, điểm mốc;
   * phần còn lại là từ khóa tự do — MỖI từ có nghĩa đều phải xuất hiện (AND), tránh kết quả quá lỏng.
   */
  public static analyze(query: string): IAnalyzedQuery {
    if (!query) return { expandedConditions: [], cleanedQuery: '' };

    const tokens = toSearchTokens(query);
    const recognizedDistrict = consumeDistrict(tokens);
    const conditions: any[] = [];

    // Tiếng lóng BĐS: mỗi quy tắc khớp → 1 điều kiện (thuộc tính HOẶC từ đồng nghĩa trong tiêu đề/mô tả)
    for (const rule of REAL_ESTATE_SLANG_RULES) {
      if (!consumePhrase(tokens, rule.keywords)) continue;
      while (consumePhrase(tokens, rule.keywords)) {
        /* bỏ các lần lặp lại của cùng quy tắc */
      }
      const orClause: any[] = rule.attributeFilter ? [rule.attributeFilter] : [];
      rule.synonyms.forEach((syn) => {
        const rx = new RegExp(buildDiacriticRegex(syn), 'i');
        orClause.push({ title: rx }, { description: rx });
      });
      conditions.push({ $or: orClause });
    }

    // Điểm mốc đã được tìm theo bán kính GPS → bỏ khỏi từ khóa để không lọc trùng theo chữ
    for (const lm of LANDMARKS) consumePhrase(tokens, [lm.shortName, ...lm.aliases]);

    const words = meaningfulWords(tokens.filter(Boolean));
    for (const word of words) {
      // Khớp nguyên từ ("an" không khớp "Thanh"); \b của regex không hiểu chữ có dấu nên tự định nghĩa ranh giới
      const rx = new RegExp(`${WORD_START}${buildDiacriticRegex(word)}${WORD_END}`, 'i');
      conditions.push({ $or: KEYWORD_FIELDS.map((field) => ({ [field]: rx })) });
    }

    return { expandedConditions: conditions, recognizedDistrict, cleanedQuery: words.join(' ') };
  }
}
