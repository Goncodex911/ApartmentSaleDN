import React from 'react';
import { Search } from 'lucide-react';
import { fieldClass } from '../ui/Input.js';

/** Ô tìm của trang quản trị (Epic 13): chữ 16px (iPhone không tự phóng to), icon kính lúp. */
export const AdminSearch: React.FC<{ value: string; onChange: (value: string) => void; placeholder: string }> = ({ value, onChange, placeholder }) => (
  <label className="relative block">
    <span className="sr-only">{placeholder}</span>
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" aria-hidden />
    <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${fieldClass} pl-10`} />
  </label>
);

/** Hàng tab lọc dạng chip, cuộn ngang trên điện thoại, vùng chạm 44px. */
export const AdminFilterTabs: React.FC<{ tabs: { id: string; label: string }[]; value: string; onChange: (id: string) => void; label: string }> = ({
  tabs,
  value,
  onChange,
  label,
}) => (
  <div role="tablist" aria-label={label} className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        role="tab"
        aria-selected={value === tab.id}
        onClick={() => onChange(tab.id)}
        className={`shrink-0 h-11 px-4 rounded-full border text-sm font-medium cursor-pointer transition-colors ${
          value === tab.id ? 'border-brand-accent bg-brand-accent text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);
