import React, { useId } from 'react';

/**
 * Ô nhập chuẩn (Story 12.1): cao 44px, bo rounded-xl, chữ 16px trên điện thoại (iPhone không tự phóng to),
 * viền focus màu accent. Dùng chung cho Input / Select / Textarea và cho `inputClass` của form cũ.
 */
export const fieldClass =
  'w-full h-11 px-3 text-base sm:text-sm text-slate-900 bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 transition-shadow focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 aria-[invalid=true]:border-rose-500 disabled:bg-slate-100 disabled:text-slate-500';

type FieldMeta = { label?: string; error?: string; hint?: string; wrapperClassName?: string };

/** Nhãn + lỗi (ngay dưới ô, có aria-describedby) + gợi ý — bọc quanh 1 ô nhập bất kỳ. */
function FieldFrame({ id, label, error, hint, wrapperClassName = '', children }: FieldMeta & { id: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1 ${wrapperClassName}`}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-slate-700">{label}</label>}
      {children}
      {error ? (
        <p id={`${id}-msg`} role="alert" className="text-xs text-rose-700">{error}</p>
      ) : (
        hint && <p id={`${id}-msg`} className="text-xs text-slate-600">{hint}</p>
      )}
    </div>
  );
}

const describe = (id: string, meta: FieldMeta) => ({
  'aria-invalid': meta.error ? true : undefined,
  'aria-describedby': meta.error || meta.hint ? `${id}-msg` : undefined,
});

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & FieldMeta>(
  ({ label, error, hint, wrapperClassName, className = '', id: givenId, ...rest }, ref) => {
    const autoId = useId(); // Luôn gọi hook (không gọi có điều kiện)
    const id = givenId || autoId;
    return (
      <FieldFrame id={id} label={label} error={error} hint={hint} wrapperClassName={wrapperClassName}>
        <input ref={ref} id={id} className={`${fieldClass} ${className}`} {...describe(id, { error, hint })} {...rest} />
      </FieldFrame>
    );
  }
);
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & FieldMeta>(
  ({ label, error, hint, wrapperClassName, className = '', id: givenId, children, ...rest }, ref) => {
    const autoId = useId(); // Luôn gọi hook (không gọi có điều kiện)
    const id = givenId || autoId;
    return (
      <FieldFrame id={id} label={label} error={error} hint={hint} wrapperClassName={wrapperClassName}>
        <select ref={ref} id={id} className={`${fieldClass} ${className}`} {...describe(id, { error, hint })} {...rest}>
          {children}
        </select>
      </FieldFrame>
    );
  }
);
Select.displayName = 'Select';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & FieldMeta>(
  ({ label, error, hint, wrapperClassName, className = '', id: givenId, ...rest }, ref) => {
    const autoId = useId(); // Luôn gọi hook (không gọi có điều kiện)
    const id = givenId || autoId;
    return (
      <FieldFrame id={id} label={label} error={error} hint={hint} wrapperClassName={wrapperClassName}>
        <textarea ref={ref} id={id} className={`${fieldClass} h-auto py-2.5 ${className}`} {...describe(id, { error, hint })} {...rest} />
      </FieldFrame>
    );
  }
);
Textarea.displayName = 'Textarea';
