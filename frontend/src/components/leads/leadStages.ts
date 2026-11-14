import { LeadStage, LeadRequirements } from '../../api/leadApi.js';

// 5 giai đoạn phễu khách hàng (Story 6.1 - AC1)
export const LEAD_STAGES: { key: LeadStage; label: string; accent: string }[] = [
  { key: 'NEW', label: 'Mới liên hệ', accent: 'border-sky-400 bg-sky-50 text-sky-700' },
  { key: 'CONSULTING', label: 'Đang tư vấn', accent: 'border-indigo-400 bg-indigo-50 text-indigo-700' },
  { key: 'VIEWING', label: 'Hẹn xem phòng', accent: 'border-amber-400 bg-amber-50 text-amber-700' },
  { key: 'DEPOSITED', label: 'Đã đặt cọc', accent: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
  { key: 'LOST', label: 'Hủy / Không hợp', accent: 'border-slate-300 bg-slate-100 text-slate-600' },
];

// Giai đoạn cần nhập thêm thông tin trước khi chuyển (ngày hẹn / lý do hủy)
export const STAGES_NEED_INPUT: LeadStage[] = ['VIEWING', 'LOST'];

export const stageLabel = (stage: LeadStage) => LEAD_STAGES.find((s) => s.key === stage)?.label ?? stage;

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

/** Tóm tắt nhu cầu khách thành 1 dòng ngắn: "Cầu Giấy · ≤ 7tr · 🐾 · 🚗" */
export function summarizeRequirements(req: LeadRequirements): string {
  return [
    req.districts?.join(', '),
    req.maxBudget && `≤ ${Number((req.maxBudget / 1_000_000).toFixed(1))}tr`,
    req.bedrooms !== undefined && req.bedrooms !== null && (req.bedrooms === 0 ? 'Studio' : `${req.bedrooms}PN`),
    req.moveInDate && `vào ở ${req.moveInDate}`,
    req.allowPets && '🐾',
    req.carParking && '🚗',
  ]
    .filter(Boolean)
    .join(' · ');
}
