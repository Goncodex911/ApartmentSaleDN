import React from 'react';
import { Card } from './Card.js';

/** Khối chờ có vệt sáng lướt qua (Story 12.5) — lớp `.skeleton` trong index.css, tự đứng yên khi "giảm chuyển động". */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => <div className={`skeleton rounded-md ${className}`} aria-hidden />;

/**
 * Thẻ căn giả lập đúng kích thước thẻ thật (Story 12.5) → dữ liệu về không làm giật bố cục.
 * card = thẻ ảnh lớn 4:3; list = danh sách gọn (ảnh 96px).
 */
export const ApartmentCardSkeleton: React.FC<{ layout: 'card' | 'list' }> = ({ layout }) =>
  layout === 'card' ? (
    <Card padded={false} className="overflow-hidden" aria-hidden>
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="p-3 space-y-2">
        <div className="flex justify-between gap-2">
          <Skeleton className="h-6 w-2/5" />
          <Skeleton className="h-4 w-16 mt-1" />
        </div>
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-1.5">
          {['w-14', 'w-12', 'w-16'].map((width) => <Skeleton key={width} className={`h-5 ${width}`} />)}
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-1/3" />
          <div className="flex gap-1.5">
            <Skeleton className="w-11 h-11 rounded-xl" />
            <Skeleton className="w-11 h-11 rounded-xl" />
          </div>
        </div>
      </div>
    </Card>
  ) : (
    <Card padded={false} className="flex gap-3 p-3" aria-hidden>
      <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
        <div className="mt-auto flex items-end justify-between">
          <div className="space-y-1.5 w-1/2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="w-11 h-11 rounded-xl" />
        </div>
      </div>
    </Card>
  );
