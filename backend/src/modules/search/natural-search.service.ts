import { HANOI_DISTRICT_SYNONYMS } from './slang.dictionary.js';
import { HANOI_LANDMARKS } from './landmarks.data.js';

export interface INaturalExtracted {
  district?: string;
  landmark?: string;
  roomType?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  furnishing?: string;
  elevator?: boolean;
  allowPets?: boolean;
  carParking?: boolean;
  balcony?: boolean;
  pcccStandard?: boolean;
}

export interface INaturalAnalysisResult {
  rawQuery: string;
  engineUsed: 'GEMINI_AI' | 'HEURISTIC_NLP';
  extracted: INaturalExtracted;
  badges: Array<{ label: string; type: 'district' | 'landmark' | 'price' | 'roomType' | 'amenity' }>;
  summary: string;
}

export class NaturalSearchService {
  /**
   * Phân tích câu tìm kiếm tự nhiên: Ưu tiên Gemini 2.5 Flash, tự động fallback sang Heuristic NLP
   */
  public static async analyze(rawText: string): Promise<INaturalAnalysisResult> {
    if (!rawText || !rawText.trim()) {
      return { rawQuery: '', engineUsed: 'HEURISTIC_NLP', extracted: {}, badges: [], summary: '' };
    }

    const query = rawText.trim();
    const apiKey = process.env.GEMINI_API_KEY;

    // 1. Thử phân tích bằng Gemini nếu có cấu hình API Key
    if (apiKey) {
      try {
        const aiResult = await this.callGemini(query, apiKey);
        if (aiResult) {
          const badges = this.buildBadges(aiResult);
          return {
            rawQuery: query,
            engineUsed: 'GEMINI_AI',
            extracted: aiResult,
            badges,
            summary: badges.map((b) => b.label).join(' • '),
          };
        }
      } catch (_err) {
        // Fallback sang Heuristic NLP bên dưới
      }
    }

    // 2. Chế độ Heuristic NLP thuần Regex (Zero Downtime, < 20ms)
    const heuristicResult = this.parseHeuristic(query);
    const badges = this.buildBadges(heuristicResult);
    return {
      rawQuery: query,
      engineUsed: 'HEURISTIC_NLP',
      extracted: heuristicResult,
      badges,
      summary: badges.map((b) => b.label).join(' • '),
    };
  }

  /**
   * Bóc tách bằng quy tắc ngôn ngữ học Heuristic & Regex Tiếng Việt
   */
  public static parseHeuristic(query: string): INaturalExtracted {
    const lower = query.toLowerCase();
    const result: INaturalExtracted = {};

    // 1. Bóc tách Quận/Huyện
    const norm = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '');
    for (const [typo, standard] of Object.entries(HANOI_DISTRICT_SYNONYMS)) {
      if (norm.replace(/\s+/g, '').includes(typo)) {
        result.district = standard;
        break;
      }
    }

    // 2. Bóc tách Điểm mốc trường học/tòa nhà
    for (const lm of HANOI_LANDMARKS) {
      const match = lm.aliases.some((a) => lower.includes(a)) || lower.includes(lm.shortName.toLowerCase());
      if (match) {
        result.landmark = lm.id;
        break;
      }
    }

    // 3. Bóc tách Loại phòng
    if (/studio/i.test(lower)) {
      result.roomType = 'studio';
      result.bedrooms = 0;
    } else if (/2\s*ng[uủ]|2n1k|2pn|2\s*ph[oò]ng\s*ng[uủ]/i.test(lower)) {
      result.roomType = '2pn';
      result.bedrooms = 2;
    } else if (/1\s*ng[uủ]|1n1k|1pn|1\s*ph[oò]ng\s*ng[uủ]/i.test(lower)) {
      result.roomType = '1pn';
      result.bedrooms = 1;
    } else if (/duplex|g[aá]c\s*(x[eé]p|l[uử]ng)/i.test(lower)) {
      result.roomType = 'duplex';
    }

    // 4. Bóc tách Khoảng giá
    this.extractPrice(lower, result);

    // 5. Bóc tách Tiện ích Hot (hỗ trợ cả có dấu và không dấu)
    if (/thang\s*m[aá]y/i.test(lower) || /thang\s*may/i.test(norm)) result.elevator = true;
    if (/pet|ch[oó]|m[eè]o|th[uú]\s*c[uư]ng/i.test(lower) || /pet|cho|meo|thu\s*cung/i.test(norm)) result.allowPets = true;
    if (/[oô]\s*t[oô]|xe\s*h[oơ]i/i.test(lower) || /o\s*to|xe\s*hoi/i.test(norm)) result.carParking = true;
    if (/ban\s*c[oô]ng/i.test(lower) || /ban\s*cong/i.test(norm)) result.balcony = true;
    if (/full\s*[dđ][oòóỏõọôồốổỗộ]/i.test(lower) || /full\s*do|day\s*du\s*(do|noi\s*that)/i.test(norm)) result.furnishing = 'FULL';
    if (/pccc/i.test(lower)) result.pcccStandard = true;

    return result;
  }

  /**
   * Bóc tách giá thuê từ ngôn ngữ nói (triệu, củ, tr, quay đầu, dưới)
   */
  private static extractPrice(text: string, result: INaturalExtracted) {
    // Kiểu 1: "từ X đến Y tr" hoặc "X - Y tr"
    const rangeMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:đến|-)\s*(\d+(?:[.,]\d+)?)\s*(?:tr|triệu|củ)/i);
    if (rangeMatch) {
      result.minPrice = Math.round(parseFloat(rangeMatch[1].replace(',', '.')) * 1000000);
      result.maxPrice = Math.round(parseFloat(rangeMatch[2].replace(',', '.')) * 1000000);
      return;
    }

    // Kiểu 2: "dưới X tr" hoặc "tầm X tr quay đầu / đổ lại" hoặc "X tr quay đầu"
    const maxMatch = text.match(/(?:dưới|<|tối đa|tầm|khoảng)?\s*(\d+(?:[.,]\d+)?)\s*(?:tr|triệu|củ)\s*(?:quay đầu|đổ lại|trở xuống)?/i);
    if (maxMatch) {
      const val = Math.round(parseFloat(maxMatch[1].replace(',', '.')) * 1000000);
      if (/trên|>|tối thiểu/i.test(text)) {
        result.minPrice = val;
      } else {
        result.maxPrice = val;
      }
    }
  }

  /**
   * Gọi mô hình Gemini để trích xuất JSON
   */
  private static async callGemini(query: string, apiKey: string): Promise<INaturalExtracted | null> {
    const prompt = `Bạn là trợ lý AI trích xuất tiêu chí tìm kiếm phòng trọ tại Hà Nội.
Hãy phân tích đoạn tin nhắn sau: "${query}"
Trả về DUY NHẤT một đối tượng JSON chuẩn (không giải thích):
{
  "district": "Tên quận Hà Nội nếu có (ví dụ: Cầu Giấy, Đống Đa, Nam Từ Liêm)",
  "roomType": "studio | 1pn | 2pn | duplex nếu có",
  "minPrice": số tiền VNĐ tối thiểu nếu có (number),
  "maxPrice": số tiền VNĐ tối đa nếu có (number),
  "elevator": boolean nếu yêu cầu thang máy,
  "allowPets": boolean nếu yêu cầu nuôi pet/chó mèo,
  "carParking": boolean nếu yêu cầu ô tô đỗ cửa,
  "balcony": boolean nếu yêu cầu ban công,
  "furnishing": "FULL nếu yêu cầu đầy đủ nội thất"
}`;

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
        }),
        signal: controller.signal,
      });

      if (!res.ok) return null;
      const data = (await res.json()) as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return text ? (JSON.parse(text) as INaturalExtracted) : null;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Chuyển đổi dữ liệu trích xuất thành danh sách nhãn trực quan (Badges)
   */
  private static buildBadges(data: INaturalExtracted) {
    const badges: Array<{ label: string; type: 'district' | 'landmark' | 'price' | 'roomType' | 'amenity' }> = [];

    if (data.district) badges.push({ label: `📍 Quận ${data.district}`, type: 'district' });
    if (data.landmark) badges.push({ label: `🎓 Mốc: ${data.landmark}`, type: 'landmark' });

    if (data.roomType) {
      const names: Record<string, string> = { studio: 'Studio', '1pn': '1PN / 1N1K', '2pn': '2PN', duplex: 'Duplex' };
      badges.push({ label: `🛏️ ${names[data.roomType] || data.roomType}`, type: 'roomType' });
    }

    if (data.minPrice && data.maxPrice) {
      badges.push({ label: `💰 ${data.minPrice / 1e6}tr - ${data.maxPrice / 1e6}tr`, type: 'price' });
    } else if (data.maxPrice) {
      badges.push({ label: `💰 ≤ ${(data.maxPrice / 1e6).toFixed(1).replace('.0', '')} triệu`, type: 'price' });
    } else if (data.minPrice) {
      badges.push({ label: `💰 ≥ ${(data.minPrice / 1e6).toFixed(1).replace('.0', '')} triệu`, type: 'price' });
    }

    if (data.elevator) badges.push({ label: '🛗 Thang máy', type: 'amenity' });
    if (data.allowPets) badges.push({ label: '🐾 Nuôi Pet', type: 'amenity' });
    if (data.carParking) badges.push({ label: '🚗 Ô tô đỗ cửa', type: 'amenity' });
    if (data.balcony) badges.push({ label: '🌿 Ban công', type: 'amenity' });
    if (data.furnishing === 'FULL') badges.push({ label: '✨ Full đồ', type: 'amenity' });

    return badges;
  }
}
