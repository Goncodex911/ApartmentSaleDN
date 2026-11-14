import React, { useState } from 'react';
import { Lead, LeadStage, leadApi } from '../../api/leadApi.js';
import { LEAD_STAGES, STAGES_NEED_INPUT, summarizeRequirements, formatDateTime } from './leadStages.js';
import { X, Phone, MessageCircle, Loader2, Trash2, Send } from 'lucide-react';

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
  const canConfirm = targetStage === 'VIEWING' ? !!viewingAt : !!lostReason.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4">
      <div className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl p-4 space-y-4 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 truncate">{lead.name}</h2>
            {summary && <p className="text-xs text-slate-500 mt-0.5">{summary}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {lead.phone && (
          <div className="grid grid-cols-2 gap-2">
            <a href={`tel:${lead.phone}`} className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs">
              <Phone className="w-4 h-4" /> Gọi {lead.phone}
            </a>
            <a href={`https://zalo.me/${lead.phone}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs">
              <MessageCircle className="w-4 h-4" /> Chat Zalo
            </a>
          </div>
        )}

        {error && <p className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs">{error}</p>}

        {/* Chuyển giai đoạn 1 chạm */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase text-slate-400">Giai đoạn</p>
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
                <input type="datetime-local" value={viewingAt} onChange={(e) => setViewingAt(e.target.value)} className="w-full px-3 py-2 border rounded-lg border-slate-200" />
              ) : (
                <input autoFocus placeholder="Lý do khách hủy / không hợp *" value={lostReason} onChange={(e) => setLostReason(e.target.value)} className="w-full px-3 py-2 border rounded-lg border-slate-200" />
              )}
              <div className="flex gap-2">
                <button type="button" disabled={!canConfirm || busy} onClick={() => changeStage(targetStage)} className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50">
                  Xác nhận
                </button>
                <button type="button" onClick={() => setTargetStage(null)} className="px-3 py-2 rounded-lg border border-slate-200 text-xs">
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Ghi chú nhanh */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase text-slate-400">Ghi chú</p>
          <div className="flex gap-2">
            <input
              placeholder="VD: Khách muốn xem tối thứ 7..."
              value={note}
              maxLength={1000}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && note.trim() && addNote()}
              className="flex-1 px-3 py-2 border rounded-xl border-slate-200"
            />
            <button type="button" disabled={!note.trim() || busy} onClick={addNote} className="px-3 rounded-xl bg-indigo-600 text-white disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <ul className="space-y-1.5 max-h-56 overflow-y-auto">
            {lead.notes.map((item) => (
              <li key={item._id} className={`p-2 rounded-lg text-xs ${item.isSystem ? 'bg-slate-50 text-slate-500 italic' : 'bg-indigo-50/60 text-slate-700'}`}>
                <span className="block text-[10px] text-slate-400">{formatDateTime(item.createdAt)}</span>
                {item.content}
              </li>
            ))}
            {lead.notes.length === 0 && <li className="text-xs text-slate-400">Chưa có ghi chú.</li>}
          </ul>
        </div>

        <button type="button" onClick={deleteLead} disabled={busy} className="flex items-center gap-1 text-xs text-rose-600 hover:underline">
          <Trash2 className="w-3.5 h-3.5" /> Xóa khách
        </button>
      </div>
    </div>
  );
};
