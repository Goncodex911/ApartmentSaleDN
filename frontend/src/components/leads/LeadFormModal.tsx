import React, { useState } from 'react';
import { Lead, LeadAmenity, LeadRequirements, leadApi } from '../../api/leadApi.js';
import { ToggleChip } from '../apartment/formFields.js';
import { OTHER_ZONE, PROPERTY_TYPES, ZONES } from '../../utils/danang.js';
import { X, Loader2, UserPlus, ChevronDown } from 'lucide-react';

interface LeadFormModalProps {
  onClose: () => void;
  onCreated: (lead: Lead) => void;
}

const inputClass = 'w-full h-11 px-3 border rounded-xl border-slate-200 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 pb-badge-safe sm:p-4">
      <form onSubmit={handleSubmit} className="w-full sm:max-w-md max-h-[90dvh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl text-sm">
        <div className="flex items-center justify-between px-4 pt-3">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-600" aria-hidden /> Thêm khách hàng
          </h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="w-11 h-11 -mr-2 flex items-center justify-center text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-3 space-y-3">
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
              <div role="group" aria-label="Đơn vị tiền" className="flex shrink-0 p-1 rounded-xl bg-slate-100">
                {(['VND', 'USD'] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    aria-pressed={currency === unit}
                    onClick={() => setCurrency(unit)}
                    className={`h-9 px-3 rounded-lg text-xs font-semibold transition-colors ${currency === unit ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
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

          <button type="button" aria-expanded={showMore} onClick={() => setShowMore((open) => !open)} className="h-11 flex items-center gap-1 text-sm font-semibold text-indigo-700">
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
              <textarea rows={2} placeholder="Ghi chú đầu tiên" value={note} onChange={(e) => setNote(e.target.value)} className={`${inputClass} h-auto py-2`} />
            </div>
          )}
        </div>

        <div className="px-4 pt-2 pb-4 border-t border-slate-100">
          <button type="submit" disabled={saving || !name.trim()} className="w-full h-12 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform duration-100 motion-reduce:transform-none">
            {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />} Lưu khách
          </button>
        </div>
      </form>
    </div>
  );
};
