import React from 'react';
import { Apartment } from '../../api/apartmentApi.js';
import { STATUS_STYLE } from '../../utils/statusStyle.js';

// soft = nền nhạt + viền mảnh + chữ đậm (dễ đọc ngoài trời); solid = nền đậm chữ trắng
const TONES = {
  neutral: { soft: 'bg-slate-100 text-slate-700 border-slate-300', solid: 'bg-slate-700 text-white' },
  accent: { soft: 'bg-indigo-50 text-indigo-800 border-indigo-200', solid: 'bg-brand-accent text-white' },
  navy: { soft: 'bg-slate-100 text-brand-navy border-slate-300', solid: 'bg-brand-navy text-white' },
  gold: { soft: 'bg-amber-50 text-amber-900 border-amber-200', solid: 'bg-brand-navy text-brand-gold-light' }, // vàng chỉ đứng trên nền navy
  danger: { soft: 'bg-rose-50 text-rose-800 border-rose-200', solid: 'bg-rose-600 text-white' },
} as const;

type BadgeProps = {
  tone?: keyof typeof TONES | Apartment['status'];
  variant?: 'soft' | 'solid';
  icon?: React.ElementType;
  className?: string;
  children: React.ReactNode;
};

/** Huy hiệu dùng chung (Story 12.1); tone nhận cả trạng thái căn (AVAILABLE…) → màu lấy từ STATUS_STYLE. */
export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', variant = 'soft', icon: Icon, className = '', children }) => {
  const palette = tone in STATUS_STYLE ? STATUS_STYLE[tone as Apartment['status']] : TONES[tone as keyof typeof TONES];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${variant === 'soft' ? `border ${palette.soft}` : palette.solid} ${className}`}>
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />}
      {children}
    </span>
  );
};
