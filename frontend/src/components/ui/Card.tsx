import React from 'react';

/** Khung thẻ chuẩn (Story 12.1): nền trắng, bo rounded-2xl, viền slate-200. `padded={false}` khi bên trong tự canh lề (ảnh tràn viền). */
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement> & { padded?: boolean }> = ({ padded = true, className = '', ...rest }) => (
  <div className={`bg-surface-0 rounded-2xl border border-slate-200 ${padded ? 'p-4' : ''} ${className}`} {...rest} />
);
