import React from 'react';
import { House, Search } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode; // Nút hành động chính (VD Xóa tất cả bộ lọc)
  icon?: React.ElementType; // Mặc định: ngôi nhà + kính lúp
  compact?: boolean; // Dùng trong khung nhỏ (VD mục Căn phù hợp)
}

/** Màn hình trống chuẩn (Story 12.5): icon minh hoạ, tiêu đề, gợi ý làm gì tiếp, 1 nút hành động. */
export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action, icon: Icon, compact }) => (
  <div className={`flex flex-col items-center text-center ${compact ? 'py-4 gap-1.5' : 'py-12 px-6 gap-2'}`} role="status">
    {!compact && (
      <div className="relative mb-2 w-16 h-16 flex items-center justify-center rounded-2xl bg-indigo-50 text-brand-accent" aria-hidden>
        {Icon ? (
          <Icon className="w-8 h-8" />
        ) : (
          <>
            <House className="w-8 h-8" />
            <span className="absolute -right-1.5 -bottom-1.5 w-7 h-7 flex items-center justify-center rounded-full bg-white ring-2 ring-indigo-50">
              <Search className="w-4 h-4" />
            </span>
          </>
        )}
      </div>
    )}
    <p className={`font-semibold text-slate-900 ${compact ? 'text-sm' : 'text-base'}`}>{title}</p>
    {description && <p className={`text-slate-600 max-w-sm ${compact ? 'text-xs' : 'text-sm'}`}>{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);
