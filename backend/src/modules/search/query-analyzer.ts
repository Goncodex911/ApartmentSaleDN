import {
  REAL_ESTATE_SLANG_RULES,
  buildDiacriticRegex,
  HANOI_DISTRICT_SYNONYMS,
} from './slang.dictionary.js';

export interface IAnalyzedQuery {
  expandedConditions: any[];
  recognizedDistrict?: string;
  cleanedQuery: string;
}

export class QueryAnalyzer {
  /**
   * Phân tích câu tìm kiếm: bóc tách tiếng lóng BĐS, từ đồng nghĩa và địa danh gõ nhầm
   */
  public static analyze(query: string): IAnalyzedQuery {
    if (!query) return { expandedConditions: [], cleanedQuery: '' };

    const lower = query.toLowerCase();
    const cleanNoDiacritics = lower
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '');

    // Kiểm tra lỗi gõ nhầm địa danh (VD: caugay -> Cầu Giấy)
    let recognizedDistrict: string | undefined;
    let matchedDistrictTypo: string | undefined;
    for (const [typo, standardName] of Object.entries(HANOI_DISTRICT_SYNONYMS)) {
      if (cleanNoDiacritics.includes(typo)) {
        recognizedDistrict = standardName;
        matchedDistrictTypo = typo;
        break;
      }
    }

    const conditions: any[] = [];
    const matchedSlangs: string[] = [];

    // Quét từ điển tiếng lóng
    for (const rule of REAL_ESTATE_SLANG_RULES) {
      const isMatch = rule.keywords.some((kw) => lower.includes(kw));
      if (isMatch) {
        matchedSlangs.push(...rule.keywords);

        const orClause: any[] = [];
        if (rule.attributeFilter) {
          orClause.push(rule.attributeFilter);
        }

        rule.synonyms.forEach((syn) => {
          const rx = new RegExp(buildDiacriticRegex(syn), 'i');
          orClause.push({ title: rx });
          orClause.push({ description: rx });
        });

        if (orClause.length > 0) {
          conditions.push({ $or: orClause });
        }
      }
    }

    // Lọc bỏ tiếng lóng và địa danh đã nhận diện khỏi từ khóa tự do
    let remaining = lower;
    matchedSlangs.forEach((slang) => {
      remaining = remaining.replace(new RegExp(slang, 'gi'), '');
    });
    if (matchedDistrictTypo) {
      remaining = remaining.replace(/cau\s*giay|cau\s*gay|\bcg\b|dong\s*da|\bdd\b/gi, '');
    }

    const remainingWords = remaining.trim().split(/\s+/).filter((w) => w.length >= 2);

    if (remainingWords.length > 0) {
      const orWords = remainingWords.map((word) => {
        const rx = new RegExp(buildDiacriticRegex(word), 'i');
        return {
          $or: [
            { title: rx },
            { description: rx },
            { 'location.address': rx },
            { 'location.district': rx },
          ],
        };
      });
      conditions.push({ $or: orWords });
    }

    return {
      expandedConditions: conditions,
      recognizedDistrict,
      cleanedQuery: remaining.trim(),
    };
  }
}

