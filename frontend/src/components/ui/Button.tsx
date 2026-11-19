import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-brand-accent text-white hover:bg-brand-accent-dark',
  secondary: 'bg-brand-navy text-white hover:bg-brand-navy-soft',
  outline: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
} as const;
// sm vẫn cao 44px trên điện thoại (vùng chạm), gọn lại 36px từ màn sm trở lên
const SIZES = { sm: 'h-11 sm:h-9 px-3 text-sm', md: 'h-11 px-4 text-sm', lg: 'h-12 px-5 text-base' } as const;

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  loading?: boolean;
  icon?: React.ElementType;
};

/**
 * Nút dùng chung (Story 12.1): phản hồi ngay khi chạm (co 2%, 100ms — tắt khi "giảm chuyển động"),
 * `loading` hiện vòng quay và khoá nút để không gửi 2 lần.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, icon: Icon, className = '', disabled, children, type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold cursor-pointer transition-[background-color,transform] duration-100 active:scale-[0.98] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : Icon && <Icon className="w-4 h-4 shrink-0" aria-hidden />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
