import { LeadStage, LeadRequirements } from '../../api/leadApi.js';

// 5 giai đoạn phễu khách hàng (Story 6.1 - AC1)
export const LEAD_STAGES: { key: LeadStage; label: string; accent: string }[] = [
  { key: 'NEW', label: 'Mới liên hệ', accent: 'border-sky-400 bg-sky-50 text-sky-700' },
  { key: 'CONSULTING', label: 'Đang tư vấn', accent: 'border-indigo-400 bg-indigo-50 text-indigo-700' },
  { key: 'VIEWING', label: 'Hẹn xem phòng', accent: 'border-amber-400 bg-amber-50 text-amber-700' },
  { key: 'DEPOSITED', label: 'Đã đặt cọc', accent: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
  { key: 'LOST', label: 'Hủy / Không hợp', accent: 'border-slate-300 bg-slate-100 text-slate-600' },
];

// Giai đoạn cần nhập thêm thông tin trước khi chuyển (ngày hẹn / căn đã cọc — Story 14.8 / lý do hủy)
export const STAGES_NEED_INPUT: LeadStage[] = ['VIEWING', 'DEPOSITED', 'LOST'];

export const stageLabel = (stage: LeadStage) => LEAD_STAGES.find((s) => s.key === stage)?.label ?? stage;

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

const AMENITY_SHORT: Record<string, string> = { pool: 'hồ bơi', allowPets: 'nuôi pet', privateWasher: 'máy giặt riêng', elevator: 'thang máy' };
// "2026-12-01" (ô chọn ngày) → "01/12"; chữ tự do của khách cũ / chat AI giữ nguyên
const moveInText = (value: string) => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value.slice(8, 10)}/${value.slice(5, 7)}` : value);
const budgetText = (req: LeadRequirements) =>
  req.budgetCurrency === 'USD' ? `≤ $${req.maxBudget}` : `≤ ${Number((req.maxBudget! / 1_000_000).toFixed(1))}tr`;

/** Tóm tắt nhu cầu khách thành 1 dòng ngắn: "Mỹ An, An Hải · ≤ 7tr · 2PN · hồ bơi · nuôi pet" */
export function summarizeRequirements(req: LeadRequirements): string {
  return [
    [...(req.zones || []), ...(req.districts || [])].join(', '),
    req.maxBudget && budgetText(req),
    req.bedrooms !== undefined && req.bedrooms !== null && (req.bedrooms === 0 ? 'Studio' : `${req.bedrooms}PN`),
    req.moveInDate && `vào ở ${moveInText(req.moveInDate)}`,
    ...(req.amenities || []).map((key) => AMENITY_SHORT[key]),
    req.allowPets && !req.amenities?.includes('allowPets') && 'nuôi pet',
    req.carParking && 'ô tô',
  ]
    .filter(Boolean)
    .join(' · ');
}
