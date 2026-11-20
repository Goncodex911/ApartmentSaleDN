import { GraduationCap, LucideIcon, Plane, ShoppingBag, Waves } from 'lucide-react';
import { PoiGroup } from '../../api/apartmentApi.js';

// Story 15.4: nhóm tiện ích Đà Nẵng — icon lucide (không dùng emoji), màu khác hẳn bong bóng giá; chữ trắng trên nền đậm ≥ 4.5:1
export const POI_GROUPS: { id: PoiGroup; label: string; icon: LucideIcon; bg: string }[] = [
  { id: 'BEACH', label: 'Bãi biển', icon: Waves, bg: 'bg-sky-700' },
  { id: 'MARKET', label: 'Chợ & TTTM', icon: ShoppingBag, bg: 'bg-amber-700' },
  { id: 'UNIVERSITY', label: 'Đại học', icon: GraduationCap, bg: 'bg-violet-700' },
  { id: 'TRANSPORT', label: 'Sân bay & Cầu', icon: Plane, bg: 'bg-slate-700' },
];
