import { Apartment } from '../api/apartmentApi.js';

type Status = Apartment['status'];

/**
 * Nguồn DUY NHẤT cho nhãn + màu trạng thái căn (Story 12.1): thẻ căn, StatusBadge, bản đồ, bộ lọc đều đọc từ đây.
 * Trống = xanh lá, Sắp trống = cam, Đã cọc = xanh da trời, Đã thuê = xám. Mọi cặp chữ / nền đạt tương phản ≥ 4.5:1.
 * Viết đủ tên lớp Tailwind (không ghép chuỗi) để Tailwind quét được.
 */
export const STATUS_STYLE: Record<Status, { label: string; dot: string; soft: string; solid: string }> = {
  AVAILABLE: { label: 'Trống', dot: 'bg-emerald-600', soft: 'bg-emerald-50 text-emerald-800 border-emerald-200', solid: 'bg-emerald-700 text-white' },
  UPCOMING: { label: 'Sắp trống', dot: 'bg-amber-500', soft: 'bg-amber-50 text-amber-900 border-amber-200', solid: 'bg-amber-400 text-slate-900' },
  DEPOSITED: { label: 'Đã cọc', dot: 'bg-sky-600', soft: 'bg-sky-50 text-sky-800 border-sky-200', solid: 'bg-sky-700 text-white' },
  RENTED: { label: 'Đã thuê', dot: 'bg-slate-400', soft: 'bg-slate-100 text-slate-700 border-slate-300', solid: 'bg-slate-600 text-white' },
};

export const STATUS_ORDER: Status[] = ['AVAILABLE', 'UPCOMING', 'DEPOSITED', 'RENTED'];
