import React, { useState } from 'react';
import { Lead, LeadAmenity, LeadRequirements, leadApi } from '../../api/leadApi.js';
import { ToggleChip } from '../apartment/formFields.js';
import { OTHER_ZONE, PROPERTY_TYPES, ZONES } from '../../utils/danang.js';
import { ChevronDown } from 'lucide-react';
import { BottomSheet } from '../layout/BottomSheet.js';
import { Button } from '../ui/Button.js';
import { fieldClass, Textarea } from '../ui/Input.js';

interface LeadFormModalProps {
  onClose: () => void;
  onCreated: (lead: Lead) => void;
}

const inputClass = fieldClass; // Ô nhập chuẩn dùng chung (Story 12.1)
const LEAD_ZONES = ZONES.filter((zone) => zone !== OTHER_ZONE);
const ROOMS = [
  { value: 0, label: 'Studio' },
  { value: 1, label: '1PN' },
  { value: 2, label: '2PN' },
  { value: 3, label: '3PN+' },
];
export const LEAD_AMENITY_OPTIONS: { key: LeadAmenity; label: string }[] = [
  { key: 'pool', label: 'Hồ bơi' },
  { key: 'allowPets', label: 'Nuôi thú cưng' },
  { key: 'privateWasher', label: 'Máy giặt riêng' },
  { key: 'elevator', label: 'Thang máy' },
];
const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((value) => value !== item) : [...list, item]);

const Group: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <fieldset className="space-y-1.5">
    <legend className="text-xs font-semibold text-slate-600">{label}</legend>
    <div className="flex flex-wrap gap-2">{children}</div>
  </fieldset>
);

/**
 * Thêm khách & nhu cầu tìm phòng (Story 6.1, nâng cấp Story 11.1): mặc định chỉ 5 nhóm chính
 * (tên, SĐT, khu vực, ngân sách, số phòng); tiện ích bắt buộc, loại hình, ngày dọn vào nằm trong "Thêm tiêu chí".
 */
export const LeadFormModal: React.FC<LeadFormModalProps> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [zones, setZones] = useState<string[]>([]);
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState<'VND' | 'USD'>('VND');
  const [bedrooms, setBedrooms] = useState<number | undefined>();
  const [amenities, setAmenities] = useState<LeadAmenity[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [moveInDate, setMoveInDate] = useState('');
  const [note, setNote] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const amount = Number(budget.replace(',', '.'));
      // VNĐ nhập theo triệu (7.5 → 7.500.000), USD nhập đúng số tiền
      const maxBudget = amount > 0 ? Math.round(currency === 'VND' ? amount * 1_000_000 : amount) : undefined;
      const requirements: Partial<LeadRequirements> = {
        districts: [],
        zones,
        maxBudget,
        budgetCurrency: maxBudget ? currency : undefined,
        bedrooms,
        amenities,
        propertyTypes,
        moveInDate: moveInDate || undefined,
      };
      onCreated(await leadApi.create({ name: name.trim(), phone: phone.trim() || undefined, requirements, note: note.trim() || undefined }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thêm được khách, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  return (
    // Story 12.3: bảng trượt dùng chung; nút Lưu ghim đáy nằm ngoài <form> nên gắn qua thuộc tính form="lead-form"
    <BottomSheet
      title="Thêm khách hàng"
      onClose={onClose}
      snapPoints={[0.9]}
      showClose
      footer={<Button type="submit" form="lead-form" size="lg" className="w-full" loading={saving} disabled={!name.trim()}>Lưu khách</Button>}
    >
      <form id="lead-form" onSubmit={handleSubmit} className="text-sm">
        <div className="space-y-3">
          {error && <p role="alert" className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs">{error}</p>}
          <input required autoFocus placeholder="Tên khách *" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          <input type="tel" inputMode="tel" placeholder="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />

          <Group label="Khu vực mong muốn">
            {LEAD_ZONES.map((zone) => (
              <ToggleChip key={zone} checked={zones.includes(zone)} onChange={() => setZones((list) => toggle(list, zone))}>{zone}</ToggleChip>
            ))}
          </Group>

          <fieldset className="space-y-1.5">
            <legend className="text-xs font-semibold text-slate-600">Ngân sách tối đa / tháng</legend>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step={currency === 'VND' ? '0.1' : '10'}
                inputMode="decimal"
                placeholder={currency === 'VND' ? 'VD: 7.5 (triệu)' : 'VD: 500'}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className={inputClass}
              />
              <div role="group" aria-label="Đơn vị tiền" className="flex shrink-0 rounded-xl bg-slate-100">
                {(['VND', 'USD'] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    aria-pressed={currency === unit}
                    onClick={() => setCurrency(unit)}
                    className={`h-11 px-3 rounded-xl text-sm font-semibold transition-colors ${currency === unit ? 'bg-white text-indigo-800 shadow-sm ring-1 ring-slate-200' : 'text-slate-600'}`}
                  >
                    {unit === 'VND' ? 'Triệu đ' : 'USD'}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>

          <Group label="Số phòng ngủ">
            {ROOMS.map((room) => (
              <ToggleChip key={room.value} checked={bedrooms === room.value} onChange={(on) => setBedrooms(on ? room.value : undefined)}>{room.label}</ToggleChip>
            ))}
          </Group>

          <button type="button" aria-expanded={showMore} onClick={() => setShowMore((open) => !open)} className="h-11 flex items-center gap-1 text-sm font-semibold text-indigo-800">
            Thêm tiêu chí <ChevronDown className={`w-4 h-4 transition-transform motion-reduce:transition-none ${showMore ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {showMore && (
            <div className="space-y-3">
              <Group label="Tiện ích bắt buộc">
                {LEAD_AMENITY_OPTIONS.map((item) => (
                  <ToggleChip key={item.key} checked={amenities.includes(item.key)} onChange={() => setAmenities((list) => toggle(list, item.key))}>{item.label}</ToggleChip>
                ))}
              </Group>
              <Group label="Loại hình">
                {PROPERTY_TYPES.map((type) => (
                  <ToggleChip key={type.id} checked={propertyTypes.includes(type.id)} onChange={() => setPropertyTypes((list) => toggle(list, type.id))}>{type.vi}</ToggleChip>
                ))}
              </Group>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">Ngày dự kiến dọn vào</span>
                <input type="date" value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} className={inputClass} />
              </label>
              <Textarea rows={2} aria-label="Ghi chú đầu tiên" placeholder="Ghi chú đầu tiên" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          )}
        </div>
      </form>
    </BottomSheet>
  );
};
