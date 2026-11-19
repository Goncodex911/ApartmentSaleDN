import React from 'react';
import { Lang } from '../../utils/shareLang.js';

const OPTIONS: { value: Lang; label: string; short: string }[] = [
  { value: 'vi', label: 'Tiếng Việt', short: 'VI' },
  { value: 'en', label: 'English', short: 'EN' },
];

// Chọn ngôn ngữ bài gửi khách & link xem phòng (Story 7.3). Điện thoại: chữ ngắn VI / EN để vừa thanh hành động (Story 12.6)
export const ShareLangToggle: React.FC<{ value: Lang; onChange: (lang: Lang) => void }> = ({ value, onChange }) => (
  <div role="radiogroup" aria-label="Ngôn ngữ gửi khách" className="flex items-center gap-2 text-sm">
    <span className="hidden sm:inline text-slate-600">Gửi khách:</span>
    <div className="flex p-0.5 rounded-xl bg-slate-100">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          aria-label={option.label}
          onClick={() => onChange(option.value)}
          className={`h-11 min-w-[44px] px-3 rounded-lg font-semibold transition-colors ${
            value === option.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="sm:hidden">{option.short}</span>
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  </div>
);
