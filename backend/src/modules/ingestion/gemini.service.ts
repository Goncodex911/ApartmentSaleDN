import {
  GEMINI_REAL_ESTATE_SYSTEM_PROMPT,
  GEMINI_JSON_SCHEMA_INSTRUCTION,
} from './gemini.prompt.js';

export interface IParsedApartmentData {
  title: string;
  price: number;
  deposit: number;
  address: string;
  district: string;
  city: string;
  area?: number;
  bedrooms: number;
  bathrooms: number;
  furnishing: 'FULL' | 'BASIC' | 'EMPTY';
  elevator: boolean;
  allowPets: boolean;
  carParking: boolean;
  pcccStandard: boolean;
  fees?: {
    electricity?: number;
    water?: number;
    service?: number;
  };
  ownerContact: {
    name: string;
    phone: string;
  };
  needsReview: boolean;
  reviewReason?: string | null;
}

export interface IParsedResult {
  isRentalListing: boolean;
  rejectReason: string | null;
  extracted?: IParsedApartmentData;
}

export class GeminiService {
  public static getApiKey(): string {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('Chưa cấu hình GEMINI_API_KEY trong biến môi trường');
    }
    return key;
  }

  public static getModel(): string {
    return process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  }

  /**
   * Bóc tách văn bản thô tiếng Việt thành JSON căn hộ chuẩn
   */
  public static async parseRealEstatePost(rawText: string): Promise<IParsedResult> {
    const apiKey = this.getApiKey();
    const model = this.getModel();

    const promptText = `
${GEMINI_REAL_ESTATE_SYSTEM_PROMPT}

${GEMINI_JSON_SCHEMA_INSTRUCTION}

---
VĂN BẢN TIN ĐĂNG CẦN PHÂN TÍCH:
"""
${rawText.trim()}
"""
`;

    const requestBody = {
      contents: [
        {
          parts: [{ text: promptText }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1, // Nhiệt độ thấp để đảm bảo kết quả trích xuất nhất quán
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    // Sử dụng AbortController với thời gian chờ tối đa 8 giây
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        // API key gửi qua header thay vì query string (?key=) để không bị ghi vào log proxy/server
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Gemini API trả về lỗi HTTP ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as any;
      const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textOutput) {
        throw new Error('Mô hình Gemini không trả về dữ liệu nội dung');
      }

      const parsedJson: IParsedResult = JSON.parse(textOutput);
      return this.sanitizeResult(parsedJson, rawText);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Quá thời gian chờ (Timeout) khi gọi Gemini API');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Chuẩn hóa và bảo đảm dữ liệu đầu ra an toàn
   */
  private static sanitizeResult(data: any, rawText: string): IParsedResult {
    if (!data.isRentalListing) {
      return {
        isRentalListing: false,
        rejectReason: data.rejectReason || 'Bài viết không phải là tin cho thuê căn hộ/phòng trọ',
      };
    }

    const ext = data.extracted || {};
    const price = Number(ext.price) || 0;
    const phone = ext.ownerContact?.phone ? String(ext.ownerContact.phone).trim() : '';

    const needsReview = Boolean(ext.needsReview || price === 0 || !phone);
    const reviewReason =
      ext.reviewReason ||
      (price === 0
        ? 'Không tìm thấy mức giá cụ thể'
        : !phone
          ? 'Không tìm thấy số điện thoại đầu mối'
          : null);

    return {
      isRentalListing: true,
      rejectReason: null,
      extracted: {
        title: ext.title || 'Căn hộ cho thuê',
        price,
        deposit: Number(ext.deposit) || 0,
        address: ext.address || 'Đang cập nhật địa chỉ',
        district: ext.district || 'Cầu Giấy',
        city: ext.city || 'Hà Nội',
        area: ext.area ? Number(ext.area) : undefined,
        bedrooms: Number(ext.bedrooms) || 1,
        bathrooms: Number(ext.bathrooms) || 1,
        furnishing: ['FULL', 'BASIC', 'EMPTY'].includes(ext.furnishing) ? ext.furnishing : 'BASIC',
        elevator: Boolean(ext.elevator),
        allowPets: Boolean(ext.allowPets),
        carParking: Boolean(ext.carParking),
        pcccStandard: Boolean(ext.pcccStandard),
        fees: {
          electricity: ext.fees?.electricity ? Number(ext.fees.electricity) : undefined,
          water: ext.fees?.water ? Number(ext.fees.water) : undefined,
          service: ext.fees?.service ? Number(ext.fees.service) : undefined,
        },
        ownerContact: {
          name: ext.ownerContact?.name || 'Chủ nhà',
          phone,
        },
        needsReview,
        reviewReason,
      },
    };
  }
}

