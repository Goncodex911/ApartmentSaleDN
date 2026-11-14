import React, { useState } from 'react';
import { Lead, leadApi } from '../../api/leadApi.js';
import { X, Loader2, UserPlus } from 'lucide-react';

interface LeadFormModalProps {
  onClose: () => void;
  onCreated: (lead: Lead) => void;
}

const inputClass = 'w-full px-3 py-2 border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500';

// Thêm khách thủ công (Story 6.1 - AC4)
export const LeadFormModal: React.FC<LeadFormModalProps> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [districts, setDistricts] = useState('');
  const [budgetMillions, setBudgetMillions] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const budget = Number(budgetMillions.replace(',', '.'));
      const lead = await leadApi.create({
        name: name.trim(),
        phone: phone.trim() || undefined,
        requirements: {
          districts: districts.split(',').map((d) => d.trim()).filter(Boolean),
          maxBudget: budget > 0 ? Math.round(budget * 1_000_000) : undefined,
        },
        note: note.trim() || undefined,
      });
      onCreated(lead);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thêm được khách, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4">
      <form onSubmit={handleSubmit} className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-600" /> Thêm khách hàng
          </h2>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <p className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs">{error}</p>}

        <input required autoFocus placeholder="Tên khách *" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        <input type="tel" placeholder="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        <input placeholder="Khu vực mong muốn (VD: Cầu Giấy, Ba Đình)" value={districts} onChange={(e) => setDistricts(e.target.value)} className={inputClass} />
        <input
          type="number"
          min="0"
          step="0.1"
          inputMode="decimal"
          placeholder="Ngân sách tối đa (triệu/tháng)"
          value={budgetMillions}
          onChange={(e) => setBudgetMillions(e.target.value)}
          className={inputClass}
        />
        <textarea rows={2} placeholder="Ghi chú đầu tiên" value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />

        <button type="submit" disabled={saving || !name.trim()} className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Lưu khách
        </button>
      </form>
    </div>
  );
};
