import { Apartment } from '../api/apartmentApi.js';

export type AcLevel = 'low' | 'medium' | 'high';
export interface CostOptions {
  people: number; // 1–4
  acLevel: AcLevel;
  motorbike: boolean;
}
export type CostItem = 'rent' | 'electricity' | 'water' | 'service' | 'parking';
export interface CostEstimate {
  items: Record<CostItem, number>; // VNĐ / tháng
  totalVnd: number;
  totalUsd: number;
  referenceItems: CostItem[]; // Khoản dùng giá tham khảo vì căn chưa có thông tin
}
type CostListing = Pick<Apartment, 'price' | 'priceUsd' | 'fees' | 'includedServices'>;

export const DEFAULT_COST_OPTIONS: CostOptions = { people: 2, acLevel: 'medium', motorbike: false };
// Giờ chạy điều hoà / ngày: Ít 4–6h, Vừa 8–10h, Nhiều 14–18h → lấy giữa khoảng
export const AC_HOURS: Record<AcLevel, number> = { low: 5, medium: 9, high: 16 };
const AC_KW = 0.9; // Máy 9.000–12.000 BTU
const BASE_KWH = 50; // Tủ lạnh, đèn, nấu ăn... cho 1 người
const EXTRA_PERSON_KWH = 25;
const REFERENCE_KWH_PRICE = 3500; // Giá điện phòng trọ phổ biến khi căn chưa ghi
const WATER_PER_PERSON_THRESHOLD = 50_000; // ≥ 50k → hiểu là đ/người/tháng; nhỏ hơn → đ/m³
const WATER_M3_PER_PERSON = 4;
const REFERENCE_WATER_PER_PERSON = 100_000;

const roundThousand = (value: number) => Math.round(value / 1000) * 1000;

/**
 * Ước tính chi phí sinh hoạt / tháng (Story 11.6). Đơn vị fees.water trong dữ liệu không thống nhất
 * (lúc theo người, lúc theo m³) → đoán theo ngưỡng 50.000đ. Dịch vụ đã bao (ELECTRICITY / WATER) → 0đ.
 * USD: tiền thuê dùng đúng giá USD của tin nếu có, các khoản khác quy theo tỷ giá; làm tròn tới $5.
 */
export function estimateMonthlyCost(listing: CostListing, options: CostOptions, rawUsdRate: number): CostEstimate {
  // Story 19.10: tỷ giá ≤ 0 / không phải số (cấu hình sai) → 25.000, tránh chia 0 ra NaN / Infinity
  const usdRate = Number.isFinite(rawUsdRate) && rawUsdRate > 0 ? rawUsdRate : 25000;
  const included = listing.includedServices || [];
  const fees = listing.fees || {};
  const people = Math.min(4, Math.max(1, options.people));
  const referenceItems: CostItem[] = [];

  const kwh = BASE_KWH + EXTRA_PERSON_KWH * (people - 1) + AC_KW * AC_HOURS[options.acLevel] * 30;
  let electricity = 0;
  if (!included.includes('ELECTRICITY')) {
    if (!fees.electricity) referenceItems.push('electricity');
    electricity = kwh * (fees.electricity || REFERENCE_KWH_PRICE);
  }

  let water = 0;
  if (!included.includes('WATER')) {
    // Story 19.10: 0đ = chủ nhà ghi miễn phí nước (khác với chưa nhập → dùng giá tham khảo)
    if (fees.water === undefined || fees.water === null) {
      referenceItems.push('water');
      water = REFERENCE_WATER_PER_PERSON * people;
    } else {
      water = fees.water >= WATER_PER_PERSON_THRESHOLD ? fees.water * people : fees.water * WATER_M3_PER_PERSON * people;
    }
  }

  const items: Record<CostItem, number> = {
    rent: listing.price || (listing.priceUsd || 0) * usdRate,
    electricity: roundThousand(electricity),
    water: roundThousand(water),
    service: fees.service || 0,
    parking: options.motorbike ? fees.parkingMotor || 0 : 0,
  };
  const totalVnd = Object.values(items).reduce((sum, value) => sum + value, 0);
  const extrasUsd = (totalVnd - items.rent) / usdRate;
  const rentUsd = listing.priceUsd || items.rent / usdRate;
  return { items, totalVnd, totalUsd: Math.round((rentUsd + extrasUsd) / 5) * 5, referenceItems };
}
