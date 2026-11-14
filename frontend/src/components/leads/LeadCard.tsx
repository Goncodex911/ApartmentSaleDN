import React from 'react';
import { Lead } from '../../api/leadApi.js';
import { summarizeRequirements, formatDateTime } from './leadStages.js';
import { Phone, Bot, CalendarClock } from 'lucide-react';

interface LeadCardProps {
  lead: Lead;
  onOpen: (lead: Lead) => void;
  onDragStart: (leadId: string) => void;
}

// Thẻ khách: chạm để mở chi tiết (điện thoại), kéo-thả sang cột khác (máy tính, HTML5 Drag & Drop)
export const LeadCard: React.FC<LeadCardProps> = ({ lead, onOpen, onDragStart }) => {
  const summary = summarizeRequirements(lead.requirements);
  const latestNote = lead.notes[0];

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', lead._id);
        onDragStart(lead._id);
      }}
      onClick={() => onOpen(lead)}
      className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer active:scale-[0.99] transition-all space-y-1.5"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm text-slate-800 truncate">{lead.name}</p>
        {lead.source === 'AI_CHAT' && (
          <span className="shrink-0 flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">
            <Bot className="w-3 h-3" /> AI
          </span>
        )}
      </div>

      {lead.phone && (
        <a
          href={`tel:${lead.phone}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-xs text-emerald-700 font-medium w-fit"
        >
          <Phone className="w-3.5 h-3.5" /> {lead.phone}
        </a>
      )}

      {summary && <p className="text-xs text-slate-600 line-clamp-2">{summary}</p>}

      {lead.stage === 'VIEWING' && lead.viewingAt && (
        <p className="flex items-center gap-1 text-xs font-semibold text-amber-700">
          <CalendarClock className="w-3.5 h-3.5" /> {formatDateTime(lead.viewingAt)}
        </p>
      )}
      {lead.stage === 'LOST' && lead.lostReason && <p className="text-xs text-slate-500 italic line-clamp-1">{lead.lostReason}</p>}

      {latestNote && <p className="text-[11px] text-slate-400 line-clamp-1">💬 {latestNote.content}</p>}
    </div>
  );
};
