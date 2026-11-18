import React from 'react';
import { Lang } from '../../utils/shareLang.js';

const OPTIONS: { value: Lang; label: string }[] = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
];

// Chọn ngôn ngữ bài gửi khách & link xem phòng (Story 7.3)
export const ShareLangToggle: React.FC<{ value: Lang; onChange: (lang: Lang) => void }> = ({ value, onChange }) => (
  <div role="radiogroup" aria-label="Ngôn ngữ gửi khách" className="flex items-center gap-2 text-sm">
    <span className="text-slate-500">Gửi khách:</span>
    <div className="flex p-0.5 rounded-lg bg-slate-100">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`h-11 px-3 rounded-md font-medium transition-colors ${
            value === option.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);
