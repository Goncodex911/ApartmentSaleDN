import React, { useRef } from 'react';

interface RoomCountPickerProps {
  label: string;
  value: number | '';
  options: number[]; // Tăng dần; số cuối hiển thị "N+"
  onChange: (value: number) => void;
  required?: boolean;
}

/** Story 20.6: chọn nhanh số phòng bằng 1 chạm; nút cuối "N+" mở ô nhập số ≥ N. Phím ← → chuyển lựa chọn. */
export const RoomCountPicker: React.FC<RoomCountPickerProps> = ({ label, value, options, onChange, required }) => {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const max = options[options.length - 1];
  const plus = value !== '' && value >= max;
  const isChecked = (option: number) => (option === max ? plus : value === option);
  const active = Math.max(0, options.findIndex(isChecked));

  const select = (index: number) => {
    const option = options[index];
    onChange(option === max && plus ? (value as number) : option); // Đang "N+" với số lớn hơn → giữ số đã nhập
    buttons.current[index]?.focus();
  };
  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    select((index + (e.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length);
  };

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((option, index) => (
          <button
            key={option}
            ref={(el) => {
              buttons.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isChecked(option)}
            tabIndex={index === active ? 0 : -1}
            onClick={() => select(index)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={`min-h-[44px] min-w-[44px] px-3 rounded-xl border text-sm font-medium transition-colors duration-100 ${
              isChecked(option) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-800 active:bg-slate-100'
            }`}
          >
            {option === max ? `${option}+` : option}
          </button>
        ))}
      </div>
      {plus && (
        <input
          type="number"
          inputMode="numeric"
          min={max}
          defaultValue={value}
          aria-label={`${label} (từ ${max} trở lên)`}
          // Chỉ nhận số ≥ N; đang gõ dở số nhỏ hơn thì giữ giá trị hợp lệ gần nhất
          onChange={(e) => {
            const count = Math.trunc(Number(e.target.value));
            if (count >= max) onChange(count);
          }}
          className="w-28 h-11 px-3 text-base text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      )}
    </div>
  );
};
