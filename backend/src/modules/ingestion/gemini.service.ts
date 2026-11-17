import {
  GEMINI_REAL_ESTATE_SYSTEM_PROMPT,
  GEMINI_JSON_SCHEMA_INSTRUCTION,
} from './gemini.prompt.js';
import { resolveListingLocation, deriveZone, UNKNOWN_DISTRICT } from '../search/district.js';
import { fetchWithRetry } from '../../utils/fetch-retry.js';
import { splitAddress, ADDRESS_PLACEHOLDER } from '../../utils/street.js';
import { OTHER_ZONE, PROPERTY_TYPES, PropertyType, Zone, inferPropertyType, roundLeaseMonths } from '../apartments/listing-taxonomy.js';
import { INCLUDED_SERVICES, IncludedService } from '../apartments/apartment.model.js';

// Số nguyên dương trong khoảng cho phép, ngược lại undefined (AI có thể trả chuỗi/số âm/null)
const positiveInt = (value: unknown, max: number) => {
  const num = Math.round(Number(value));
  return Number.isFinite(num) && num > 0 && num <= max ? num : undefined;
};

// Tỷ giá quy đổi giá USD → VNĐ khi tin chỉ ghi USD (mặc định 25.000, đổi qua biến môi trường USD_VND_RATE)
const usdToVndRate = () => positiveInt(process.env.USD_VND_RATE, 1000000) || 25000;

/** Trường đặc thù Đà Nẵng (Story 7.2): chỉ nhận đúng kiểu & mã hợp lệ. */
function sanitizeMarketFields(ext: any) {
  const services = Array.isArray(ext.includedServices) ? ext.includedServices : [];
  return {
    pool: ext.pool === true,
    distanceToBeachM: ext.distanceToBeachM === 0 ? 0 : positiveInt(ext.distanceToBeachM, 100000),
    motorbikeParking: ext.motorbikeParking === true,
    priceUsd: positiveInt(ext.priceUsd, 100000),
    minLeaseMonths: roundLeaseMonths(ext.minLeaseMonths), // Story 8.4: làm tròn lên mốc 1/3/6/12
    includedServices: INCLUDED_SERVICES.filter((code) => services.includes(code)),
  };
}

export interface IParsedApartmentData {
  title: string;
  price: number;
  address: string;
  street?: string; // Tên đường gửi khách (Story 8.3)
  houseNumber?: string;
  ward?: string;
  district: string;
  city: string;
  area?: number;
  propertyType: PropertyType;
  zone: Zone;
  bedrooms: number;
  bathrooms: number;
  furnishing: 'FULL' | 'BASIC' | 'EMPTY';
  elevator: boolean;
  allowPets: boolean;
  carParking: boolean;
  pcccStandard: boolean;
  pool: boolean;
  distanceToBeachM?: number;
  motorbikeParking: boolean;
  priceUsd?: number;
  minLeaseMonths?: number;
  includedServices: IncludedService[];
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

    try {
      // Mỗi lần gọi chờ tối đa 8 giây; Gemini quá tải (429/503) hoặc timeout → tự thử lại 2 lần (sau 2s, 6s)
      // để tin Telegram/Zalo không bị mất khi Google quá tải tạm thời
      const response = await fetchWithRetry(
        url,
        {
          method: 'POST',
          // API key gửi qua header thay vì query string (?key=) để không bị ghi vào log proxy/server
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify(requestBody),
        },
        8000
      );

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
    const market = sanitizeMarketFields(ext);
    // Tin chỉ ghi giá USD → quy đổi ước tính theo tỷ giá cấu hình để căn vẫn lọc được theo giá VNĐ, Quản lý kiểm tra lại
    const priceFromUsd = !(Number(ext.price) > 0) && market.priceUsd ? Math.round((market.priceUsd * usdToVndRate()) / 100000) * 100000 : 0;
    const price = Number(ext.price) > 0 ? Number(ext.price) : priceFromUsd;
    const phone = ext.ownerContact?.phone ? String(ext.ownerContact.phone).trim() : '';

    const location = resolveListingLocation(ext);
    const address = typeof ext.address === 'string' && ext.address.trim() ? ext.address.trim() : ADDRESS_PLACEHOLDER;
    const unknownDistrict = location.district === UNKNOWN_DISTRICT;
    // Story 8.4: khu vực tính bằng code (không để AI đoán); loại căn AI trả sai → đoán theo tiêu đề, không ra thì "Căn hộ" + cần kiểm tra
    const zone = location.city === 'Đà Nẵng' ? deriveZone({ ...location, address }) : OTHER_ZONE;
    const guessedType = PROPERTY_TYPES.includes(ext.propertyType) ? ext.propertyType : inferPropertyType(ext.title);

    const needsReview = Boolean(ext.needsReview || price === 0 || priceFromUsd || !phone || unknownDistrict || !guessedType);
    const reviewReason =
      ext.reviewReason ||
      (price === 0
        ? 'Không tìm thấy mức giá cụ thể'
        : priceFromUsd
          ? `Giá VNĐ quy đổi từ ${market.priceUsd} USD (tỷ giá ${usdToVndRate()})`
          : !phone
            ? 'Không tìm thấy số điện thoại đầu mối'
            : unknownDistrict
              ? 'Chưa xác định được khu vực (quận)'
              : !guessedType
                ? 'Chưa rõ loại căn (tạm để Căn hộ)'
                : null);

    return {
      isRentalListing: true,
      rejectReason: null,
      extracted: {
        title: ext.title || 'Căn hộ cho thuê',
        price,
        address,
        houseNumber: splitAddress(address).houseNumber,
        // AI hay để trống hoặc ghi cả số nhà vào street → tách lại bằng code
        street: splitAddress(typeof ext.street === 'string' ? ext.street : '').street || splitAddress(address).street,
        ...location, // district, ward, city đã chuẩn hóa theo Đà Nẵng
        zone,
        propertyType: guessedType || 'APARTMENT',
        area: ext.area ? Number(ext.area) : undefined,
        bedrooms: Number(ext.bedrooms) || 1,
        bathrooms: Number(ext.bathrooms) || 1,
        furnishing: ['FULL', 'BASIC', 'EMPTY'].includes(ext.furnishing) ? ext.furnishing : 'BASIC',
        elevator: Boolean(ext.elevator),
        allowPets: Boolean(ext.allowPets),
        carParking: Boolean(ext.carParking),
        pcccStandard: Boolean(ext.pcccStandard),
        ...market,
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

