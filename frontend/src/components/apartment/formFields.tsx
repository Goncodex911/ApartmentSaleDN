import React from 'react';
import { fieldClass } from '../ui/Input.js';

// Chuẩn điện thoại (Story 8.1): chữ 16px, ô cao 44px — Story 12.1 gom về `fieldClass` của bộ thành phần dùng chung
export const inputClass = fieldClass;

/** Nhãn + ô nhập; `required` thêm dấu * cho nhãn. */
export const Field: React.FC<{ label: string; required?: boolean; className?: string; children: React.ReactNode }> = ({
  label,
  required,
  className = '',
  children,
}) => (
  <label className={`block space-y-1 ${className}`}>
    <span className="text-sm font-medium text-slate-700">
      {label}
      {required && <span className="text-rose-600"> *</span>}
    </span>
    {children}
  </label>
);

/** Nhóm trường có tiêu đề. */
export const FormSection: React.FC<{ title: string; children: React.ReactNode; tone?: 'default' | 'private' }> = ({ title, children, tone = 'default' }) => (
  <section className={`space-y-3 ${tone === 'private' ? 'p-3 -mx-1 rounded-xl bg-amber-50' : ''}`}>
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    {children}
  </section>
);

/** Chip bật/tắt (thay ô tick nhỏ): vùng bấm 44px. */
export const ToggleChip: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; children: React.ReactNode }> = ({
  checked,
  onChange,
  children,
}) => (
  <button
    type="button"
    aria-pressed={checked}
    onClick={() => onChange(!checked)}
    className={`min-h-[44px] px-4 rounded-full border text-sm cursor-pointer transition-colors ${
      checked ? 'border-brand-accent bg-brand-accent text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
    }`}
  >
    {children}
  </button>
);

/** Chuỗi trong ô nhập → số; ô trống → `empty` (undefined khi tạo mới, null khi sửa để xóa giá trị cũ). */
export const numberOr = (value: string, empty: null | undefined) => (value.trim() === '' ? empty : Number(value));
export const textOr = (value: string, empty: null | undefined) => value.trim() || empty;
