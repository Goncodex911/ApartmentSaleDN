import { LANDMARKS, DANANG_DISTRICTS } from './landmarks.data.js';
import { consumeDistrict, canonicalDistrict } from './district.js';
import { toSearchTokens, findPhrase } from './text-tokens.js';
import { GeminiService } from '../ingestion/gemini.service.js';

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
  nearBeach?: boolean;
  pool?: boolean;
}

export interface INaturalAnalysisResult {
  rawQuery: string;
  engineUsed: 'GEMINI_AI' | 'HEURISTIC_NLP';
  extracted: INaturalExtracted;
  badges: Array<{ label: string; type: 'district' | 'landmark' | 'price' | 'roomType' | 'amenity' }>;
  summary: string;
}

const ROOM_TYPES = ['studio', '1pn', '2pn', 'duplex'];
const FURNISHING_VALUES = ['FULL', 'BASIC', 'EMPTY'];
const AMENITY_KEYS = ['elevator', 'allowPets', 'carParking', 'balcony', 'pcccStandard', 'nearBeach', 'pool'] as const;

/**
 * Kết quả AI có thể bị khách chèn lệnh (prompt injection, VD bắt AI trả thêm "userRole":"ADMIN")
 * → chỉ giữ đúng các trường lọc, đúng kiểu dữ liệu.
 */
function sanitizeExtracted(raw: any): INaturalExtracted {
  const result: INaturalExtracted = {};
  // Chỉ nhận khu vực Đà Nẵng có trong danh sách: AI hay nhầm phường ("Mỹ An") thành quận → bỏ, chữ đó vẫn được lọc như từ khóa
  const district = typeof raw?.district === 'string' ? canonicalDistrict(raw.district.slice(0, 50)) : undefined;
  if (district) result.district = district;
  if (LANDMARKS.some((lm) => lm.id === raw?.landmark)) result.landmark = raw.landmark;
  if (ROOM_TYPES.includes(raw?.roomType)) result.roomType = raw.roomType;
  if (FURNISHING_VALUES.includes(raw?.furnishing)) result.furnishing = raw.furnishing;
  if (Number(raw?.minPrice) > 0) result.minPrice = Number(raw.minPrice);
  if (Number(raw?.maxPrice) > 0) result.maxPrice = Number(raw.maxPrice);
  if (Number.isInteger(raw?.bedrooms) && raw.bedrooms >= 0 && raw.bedrooms <= 10) result.bedrooms = raw.bedrooms;
  for (const key of AMENITY_KEYS) if (raw?.[key] === true) result[key] = true;
  return result;
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
            summary: badges.map((b) => b.label).join(' · '),
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
      summary: badges.map((b) => b.label).join(' · '),
    };
  }

  /**
   * Bóc tách bằng quy tắc ngôn ngữ học Heuristic & Regex Tiếng Việt
   */
  public static parseHeuristic(query: string): INaturalExtracted {
    const lower = query.toLowerCase();
    const tokens = toSearchTokens(query);
    const has = (...phrases: string[]) => phrases.some((phrase) => findPhrase(tokens, phrase));
    const result: INaturalExtracted = {};

    // 1. Quận: so khớp nguyên từ ("the" không còn bị hiểu là "th" = Tây Hồ)
    const district = consumeDistrict([...tokens]);
    if (district) result.district = district;

    // 2. Điểm mốc trường học/tòa nhà/bãi biển
    const landmark = LANDMARKS.find((lm) => has(lm.shortName, ...lm.aliases));
    if (landmark) result.landmark = landmark.id;

    // 3. Loại phòng (hỗ trợ cả tin tiếng Anh: 1BR/2BR)
    if (/studio/i.test(lower)) {
      result.roomType = 'studio';
      result.bedrooms = 0;
    } else if (/2\s*ng[uủ]|2n1k|2pn|2\s*ph[oò]ng\s*ng[uủ]|2\s*br\b|2\s*bed/i.test(lower)) {
      result.roomType = '2pn';
      result.bedrooms = 2;
    } else if (/1\s*ng[uủ]|1n1k|1pn|1\s*ph[oò]ng\s*ng[uủ]|1\s*br\b|1\s*bed/i.test(lower)) {
      result.roomType = '1pn';
      result.bedrooms = 1;
    } else if (/duplex|g[aá]c\s*(x[eé]p|l[uử]ng)/i.test(lower)) {
      result.roomType = 'duplex';
    }

    // 4. Khoảng giá
    this.extractPrice(lower, result);

    // 5. Tiện ích: so khớp cụm từ không dấu (trước đây "cho thuê" bị hiểu nhầm là "chó" → cho nuôi thú cưng)
    if (has('thang may', 'elevator', 'lift')) result.elevator = true;
    if (has('pet', 'pets', 'thu cung', 'cho meo', 'nuoi cho', 'nuoi meo')) result.allowPets = true;
    if (has('oto', 'o to', 'xe hoi', 'car')) result.carParking = true;
    if (has('ban cong', 'balcony')) result.balcony = true;
    if (has('full do', 'full noi that', 'day du noi that', 'du do', 'fully furnished')) result.furnishing = 'FULL';
    if (has('pccc')) result.pcccStandard = true;
    if (has('gan bien', 'sat bien', 'mat bien', 'view bien', 'ra bien', 'beach', 'beachfront')) result.nearBeach = true;
    if (has('ho boi', 'be boi', 'pool')) result.pool = true;

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
    const prompt = `Bạn là trợ lý AI trích xuất tiêu chí tìm căn hộ/phòng cho thuê tại Đà Nẵng. Câu có thể là tiếng Việt hoặc tiếng Anh.
Hãy phân tích đoạn tin nhắn sau: "${query}"
Chỉ điền trường được nhắc rõ, KHÔNG đoán. Trả về DUY NHẤT một đối tượng JSON chuẩn (không giải thích):
{
  "district": "Một trong: ${DANANG_DISTRICTS.join(', ')} — chỉ khi câu nhắc quận đó (tên phường như Mỹ An, An Hải thì để trống)",
  "landmark": "Mã điểm mốc nếu câu nhắc tới: ${LANDMARKS.map((lm) => `${lm.id} (${lm.name})`).join('; ')}",
  "roomType": "studio | 1pn | 2pn | duplex nếu có (1BR = 1pn, 2BR = 2pn)",
  "minPrice": số tiền VNĐ tối thiểu nếu có (number),
  "maxPrice": số tiền VNĐ tối đa nếu có (number),
  "elevator": boolean nếu yêu cầu thang máy,
  "allowPets": boolean nếu yêu cầu nuôi pet/chó mèo,
  "carParking": boolean nếu yêu cầu ô tô đỗ cửa,
  "balcony": boolean nếu yêu cầu ban công,
  "nearBeach": boolean nếu yêu cầu gần biển (gần biển, sát biển, near the beach),
  "pool": boolean nếu yêu cầu hồ bơi/bể bơi/pool,
  "furnishing": "FULL nếu yêu cầu đầy đủ nội thất"
}`;

    const model = GeminiService.getModel(); // Dùng chung cấu hình model với bộ bóc tách tin
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
      return text ? sanitizeExtracted(JSON.parse(text)) : null;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Chuyển đổi dữ liệu trích xuất thành danh sách nhãn trực quan (Badges)
   */
  private static buildBadges(data: INaturalExtracted) {
    const badges: Array<{ label: string; type: 'district' | 'landmark' | 'price' | 'roomType' | 'amenity' }> = [];

    if (data.district) badges.push({ label: data.district, type: 'district' });
    if (data.landmark) badges.push({ label: `Gần ${LANDMARKS.find((lm) => lm.id === data.landmark)?.shortName || data.landmark}`, type: 'landmark' });

    if (data.roomType) {
      const names: Record<string, string> = { studio: 'Studio', '1pn': '1PN / 1N1K', '2pn': '2PN', duplex: 'Duplex' };
      badges.push({ label: names[data.roomType] || data.roomType, type: 'roomType' });
    }

    if (data.minPrice && data.maxPrice) {
      badges.push({ label: `${data.minPrice / 1e6}–${data.maxPrice / 1e6} triệu`, type: 'price' });
    } else if (data.maxPrice) {
      badges.push({ label: `≤ ${(data.maxPrice / 1e6).toFixed(1).replace('.0', '')} triệu`, type: 'price' });
    } else if (data.minPrice) {
      badges.push({ label: `≥ ${(data.minPrice / 1e6).toFixed(1).replace('.0', '')} triệu`, type: 'price' });
    }

    if (data.elevator) badges.push({ label: 'Thang máy', type: 'amenity' });
    if (data.allowPets) badges.push({ label: 'Nuôi thú cưng', type: 'amenity' });
    if (data.carParking) badges.push({ label: 'Ô tô đỗ cửa', type: 'amenity' });
    if (data.balcony) badges.push({ label: 'Ban công', type: 'amenity' });
    if (data.furnishing === 'FULL') badges.push({ label: 'Full đồ', type: 'amenity' });
    if (data.nearBeach) badges.push({ label: 'Gần biển', type: 'amenity' });
    if (data.pool) badges.push({ label: 'Hồ bơi', type: 'amenity' });

    return badges;
  }
}
