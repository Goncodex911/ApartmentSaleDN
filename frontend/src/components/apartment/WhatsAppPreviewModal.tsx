import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Send, X } from 'lucide-react';
import { Apartment } from '../../api/apartmentApi.js';
import { User } from '../../api/authApi.js';
import { buildWhatsAppExpatPost, createWhatsAppShareUrl } from '../../utils/whatsappFormatter.js';
import { copyText } from '../../utils/clipboard.js';
import { getWalkingDistanceToBeach } from '../../utils/distance.js';

interface WhatsAppPreviewModalProps {
  apartment: Apartment;
  ctv: User | null;
  onClose: () => void;
}

export const WhatsAppPreviewModal: React.FC<WhatsAppPreviewModalProps> = ({
  apartment,
  ctv,
  onClose,
}) => {
  const [content, setContent] = useState(() => buildWhatsAppExpatPost(apartment, ctv));
  const [copied, setCopied] = useState(false);
  const beach = getWalkingDistanceToBeach(apartment.location?.coordinates);

  const handleCopy = async () => {
    await copyText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    const url = createWhatsAppShareUrl(apartment, ctv);
    window.open(url, '_blank');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-[#075e54] text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#25d366] flex items-center justify-center text-white font-bold text-sm shadow-sm">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">WhatsApp Expat Listing</h3>
              <p className="text-[11px] text-emerald-100">Bài chào phòng Tiếng Anh chuẩn Quốc Tế</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlight Banner */}
        {beach && beach.meters <= 2000 && (
          <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-800">
            <span>🌊 <strong>Khoảng cách biển:</strong> ~{beach.meters}m đến bãi tắm Mỹ Khê</span>
            <span className="font-semibold text-emerald-700">~{beach.walkMins} phút đi bộ</span>
          </div>
        )}

        {/* WhatsApp Chat Preview Area */}
        <div className="flex-1 p-4 min-h-0 overflow-y-auto bg-[#efeae2] space-y-2">
          {/* Chat Bubble */}
          <div className="relative max-w-full bg-[#d9fdd3] text-slate-900 rounded-xl rounded-tl-none p-3.5 shadow-sm text-xs leading-relaxed font-sans whitespace-pre-wrap border border-emerald-100">
            {content}
            <div className="text-[10px] text-slate-500 text-right mt-1 font-mono">
              Just now · WhatsApp Markdown
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className={`flex-1 h-11 px-4 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
              copied
                ? 'bg-emerald-700 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Đã sao chép!' : 'Sao chép văn bản'}
          </button>

          <button
            type="button"
            onClick={handleSend}
            className="flex-1 h-11 px-4 rounded-xl bg-[#25d366] text-white text-xs font-bold hover:bg-[#20ba5a] active:bg-[#1da851] transition-colors inline-flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
          >
            <ExternalLink className="w-4 h-4" />
            Mở WhatsApp Gửi Khách
          </button>
        </div>
      </div>
    </div>
  );
};
