import React from 'react';
import { Apartment } from '../../api/apartmentApi.js';
import { PROPERTY_TYPES, PropertyType } from '../../utils/danang.js';
import { Field, FormSection, inputClass } from './formFields.js';
import { RoomCountPicker } from './RoomCountPicker.js';

export type Furnishing = Apartment['attributes']['furnishing'];

interface ApartmentRoomFieldsProps {
  propertyType: PropertyType | '';
  onPropertyTypeChange: (next: PropertyType) => void;
  bedrooms: number | '';
  onBedroomsChange: (next: number) => void;
  bathrooms: number | '';
  onBathroomsChange: (next: number) => void;
  area: string;
  onAreaChange: (next: string) => void;
  furnishing: Furnishing | '';
  onFurnishingChange: (next: Furnishing) => void;
}

/** Nhóm thông tin loại căn, số phòng, diện tích và nội thất trong form căn hộ. */
export const ApartmentRoomFields: React.FC<ApartmentRoomFieldsProps> = ({
  propertyType,
  onPropertyTypeChange,
  bedrooms,
  onBedroomsChange,
  bathrooms,
  onBathroomsChange,
  area,
  onAreaChange,
  furnishing,
  onFurnishingChange,
}) => (
  <FormSection title="Căn hộ">
    <Field label="Loại căn" required>
      <select
        value={propertyType}
        onChange={(e) => onPropertyTypeChange(e.target.value as PropertyType)}
        className={inputClass}
      >
        <option value="" disabled>Chọn loại căn</option>
        {PROPERTY_TYPES.map((type) => (
          <option key={type.id} value={type.id}>{type.vi}</option>
        ))}
      </select>
    </Field>
    {/* Studio mặc định 0 phòng ngủ nên ẩn bộ chọn phòng ngủ */}
    {propertyType !== 'STUDIO' && (
      <RoomCountPicker
        label="Phòng ngủ"
        value={bedrooms}
        options={[1, 2, 3, 4, 5]}
        onChange={onBedroomsChange}
        required
      />
    )}
    <RoomCountPicker
      label="Phòng tắm"
      value={bathrooms}
      options={[1, 2, 3, 4]}
      onChange={onBathroomsChange}
    />
    <div className="grid grid-cols-2 gap-3 items-end">
      <Field label="Diện tích (m²)">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={area}
          onChange={(e) => onAreaChange(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Nội thất" required>
        <select
          value={furnishing}
          onChange={(e) => onFurnishingChange(e.target.value as Furnishing)}
          className={inputClass}
        >
          <option value="" disabled>Chọn</option>
          <option value="FULL">Full nội thất</option>
          <option value="BASIC">Cơ bản</option>
          <option value="EMPTY">Nhà trống</option>
        </select>
      </Field>
    </div>
  </FormSection>
);
