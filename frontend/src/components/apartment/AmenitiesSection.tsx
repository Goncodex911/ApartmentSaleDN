import React from 'react';
import { AMENITIES, AmenityKey } from '../../utils/amenities.js';
import { FormSection, ToggleChip } from './formFields.js';

// Nhóm chip tiện ích của form (Story 8.5): chọn nhiều, nhóm khách hỏi nhiều lên đầu, các mục còn lại sau dòng "Khác"
export const AmenitiesSection: React.FC<{ value: AmenityKey[]; onChange: (next: AmenityKey[]) => void }> = ({ value, onChange }) => {
  const toggle = (key: AmenityKey) => onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  const chips = (top: boolean) =>
    AMENITIES.filter((item) => Boolean(item.top) === top).map((item) => (
      <ToggleChip key={item.key} checked={value.includes(item.key)} onChange={() => toggle(item.key)}>
        {item.label}
      </ToggleChip>
    ));

  return (
    <FormSection title="Tiện ích">
      <div className="flex flex-wrap gap-2">{chips(true)}</div>
      <p className="text-xs font-medium text-slate-500">Khác</p>
      <div className="flex flex-wrap gap-2">{chips(false)}</div>
    </FormSection>
  );
};
