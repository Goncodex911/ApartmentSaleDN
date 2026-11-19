import React, { useState } from 'react';
import { Lead, LeadStage, leadApi } from '../../api/leadApi.js';
import { LEAD_STAGES, STAGES_NEED_INPUT, summarizeRequirements, formatDateTime } from './leadStages.js';
import { LeadMatchesSection } from './LeadMatchesSection.js';
import { DepositApartmentPicker, DepositChoice } from './DepositApartmentPicker.js';
import { Phone, MessageCircle, Trash2, Send } from 'lucide-react';
import { BottomSheet } from '../layout/BottomSheet.js';
import { Button } from '../ui/Button.js';
import { Input } from '../ui/Input.js';

interface LeadDetailModalProps {
  lead: Lead;
  pendingStage?: LeadStage; // Kéo-thả vào cột cần nhập thêm thông tin (Hẹn xem / Hủy)
  onClose: () => void;
  onUpdated: (lead: Lead) => void;
  onDeleted: (leadId: string) => void;
}

// Chi tiết khách: chuyển giai đoạn 1 chạm + ghi chú nhanh (Story 6.1 - AC2, AC3)
export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ lead, pendingStage, onClose, onUpdated, onDeleted }) => {
  const [targetStage, setTargetStage] = useState<LeadStage | null>(pendingStage ?? null);
  const [viewingAt, setViewingAt] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [deposit, setDeposit] = useState<DepositChoice>();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setBusy(false);
    }
  };

  const changeStage = (stage: LeadStage) =>
    run(async () => {
      const updated = await leadApi.changeStage(lead._id, {
        stage,
        viewingAt: stage === 'VIEWING' && viewingAt ? new Date(viewingAt).toISOString() : undefined,
        lostReason: stage === 'LOST' ? lostReason.trim() : undefined,
        depositedApartmentId: stage === 'DEPOSITED' && deposit ? deposit : undefined,
      });
      setTargetStage(null);
      onUpdated(updated);
    });

  const handleStageClick = (stage: LeadStage) => {
    if (stage === lead.stage) return;
    if (STAGES_NEED_INPUT.includes(stage)) setTargetStage(stage);
    else changeStage(stage);
  };

  const addNote = () =>
    run(async () => {
      onUpdated(await leadApi.addNote(lead._id, note.trim()));
      setNote('');
    });

  const deleteLead = () => {
    if (!window.confirm(`Xóa khách "${lead.name}"? Không thể hoàn tác.`)) return;
    run(async () => {
      await leadApi.remove(lead._id);
      onDeleted(lead._id);
    });
  };

  const summary = summarizeRequirements(lead.requirements);
  const canConfirm = targetStage === 'VIEWING' ? !!viewingAt : targetStage === 'DEPOSITED' ? deposit !== undefined : !!lostReason.trim();

  return (
    // Story 12.3: bảng trượt dùng chung — mở 50%, kéo lên 90% để xem hết ghi chú / căn phù hợp
    <BottomSheet title={lead.name} onClose={onClose} snapPoints={[0.5, 0.9]} showClose wide expanded={!!targetStage}>
      <div className="space-y-4 text-sm">
        {summary && <p className="text-sm text-slate-600">{summary}</p>}

        {lead.phone && (
          <div className="grid grid-cols-2 gap-2">
            <a href={`tel:${lead.phone}`} className="h-11 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 text-white font-semibold text-sm">
              <Phone className="w-4 h-4" aria-hidden /> Gọi {lead.phone}
            </a>
            <a href={`https://zalo.me/${lead.phone}`} target="_blank" rel="noopener noreferrer" className="h-11 flex items-center justify-center gap-1.5 rounded-xl bg-blue-700 text-white font-semibold text-sm">
              <MessageCircle className="w-4 h-4" aria-hidden /> Chat Zalo
            </a>
          </div>
        )}

        {error && <p className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs">{error}</p>}

        {lead.stage !== 'DEPOSITED' && lead.stage !== 'LOST' && <LeadMatchesSection leadId={lead._id} />}

        {/* Chuyển giai đoạn 1 chạm */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase text-slate-600">Giai đoạn</p>
          <div className="flex flex-wrap gap-1.5">
            {LEAD_STAGES.map((stage) => (
              <button
                key={stage.key}
                type="button"
                disabled={busy}
                onClick={() => handleStageClick(stage.key)}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${
                  lead.stage === stage.key || targetStage === stage.key ? stage.accent : 'border-slate-200 text-slate-500'
                }`}
              >
                {stage.label}
              </button>
            ))}
          </div>

          {targetStage && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              {targetStage === 'VIEWING' ? (
                <Input type="datetime-local" aria-label="Giờ hẹn xem phòng" value={viewingAt} onChange={(e) => setViewingAt(e.target.value)} />
              ) : targetStage === 'DEPOSITED' ? (
                <DepositApartmentPicker leadId={lead._id} value={deposit} onChange={setDeposit} />
              ) : (
                <Input autoFocus aria-label="Lý do khách hủy" placeholder="Lý do khách hủy / không hợp *" value={lostReason} onChange={(e) => setLostReason(e.target.value)} />
              )}
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" disabled={!canConfirm} loading={busy} onClick={() => changeStage(targetStage)}>Xác nhận</Button>
                <Button size="sm" variant="outline" onClick={() => setTargetStage(null)}>Hủy</Button>
              </div>
            </div>
          )}
        </div>

        {/* Ghi chú nhanh */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase text-slate-600">Ghi chú</p>
          <div className="flex gap-2">
            <Input
              wrapperClassName="flex-1"
              aria-label="Ghi chú nhanh"
              placeholder="VD: Khách muốn xem tối thứ 7..."
              value={note}
              maxLength={1000}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && note.trim() && addNote()}
            />
            <Button aria-label="Thêm ghi chú" icon={Send} loading={busy} disabled={!note.trim()} onClick={addNote} className="w-11 px-0" />
          </div>
          <ul className="space-y-1.5 max-h-56 overflow-y-auto">
            {lead.notes.map((item) => (
              <li key={item._id} className={`p-2 rounded-lg text-xs ${item.isSystem ? 'bg-slate-50 text-slate-500 italic' : 'bg-indigo-50/60 text-slate-700'}`}>
                <span className="block text-[10px] text-slate-600">{formatDateTime(item.createdAt)}</span>
                {item.content}
              </li>
            ))}
            {lead.notes.length === 0 && <li className="text-xs text-slate-600">Chưa có ghi chú.</li>}
          </ul>
        </div>

        <button type="button" onClick={deleteLead} disabled={busy} className="h-11 flex items-center gap-1.5 text-sm text-rose-700 hover:underline">
          <Trash2 className="w-4 h-4" aria-hidden /> Xóa khách
        </button>
      </div>
    </BottomSheet>
  );
};
