import React from 'react';

/** Bảng trượt từ dưới lên trên điện thoại, hộp giữa màn hình trên máy tính. Chạm nền mờ để đóng. */
export const BottomSheet: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 pb-badge-safe sm:pb-0" onClick={onClose}>
    <div role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md p-4 space-y-4 bg-white rounded-t-2xl sm:rounded-2xl">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {children}
    </div>
  </div>
);
