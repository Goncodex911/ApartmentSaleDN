import React, { useState, useEffect } from 'react';
import { Check, Copy, ExternalLink, RefreshCw, Sparkles, X } from 'lucide-react';
import { Apartment } from '../../api/apartmentApi.js';
import { User } from '../../api/authApi.js';
import { generateZaloPost, ZaloPostTone } from '../../utils/zaloPostGenerator.js';
import { copyText } from '../../utils/clipboard.js';
import { zaloOpenUrl } from '../../utils/shareChannel.js';

interface ZaloPostStudioModalProps {
  apartment: Apartment;
  ctv: User | null;
  link: string; // Link chia sẻ thật của CTV (Story 19.1)
  onClose: () => void;
}

export const ZaloPostStudioModal: React.FC<ZaloPostStudioModalProps> = ({
  apartment,
  ctv,
  link,
  onClose,
}) => {
  const [tone, setTone] = useState<ZaloPostTone>('deal');
  const [content, setContent] = useState('');
  const [copied, setCopied] = useState(false);

  // Sinh nội dung theo tone
  const refreshContent = (nextTone = tone) => {
    setContent(generateZaloPost(apartment, ctv, link, nextTone));
  };

  useEffect(() => {
    refreshContent(tone);
  }, [tone]);

  const handleCopy = async () => {
    await copyText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mở ngay trong cú bấm (không setTimeout) → trình duyệt điện thoại không chặn popup
  const handleOpenZalo = () => window.open(zaloOpenUrl(), '_blank', 'noopener');

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0068ff] flex items-center justify-center text-white font-bold text-xs shadow-sm">
              Zalo
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Zalo Smart Post Studio</h3>
              <p className="text-[11px] text-slate-500">Bộ sinh bài viết & Spin Text chống spam</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tone Selector Tabs */}
        <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0 bg-white">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTone('deal')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                tone === 'deal' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🔥 Hot Deal
            </button>
            <button
              type="button"
              onClick={() => setTone('professional')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                tone === 'professional' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 Chuyên nghiệp
            </button>
            <button
              type="button"
              onClick={() => setTone('short')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                tone === 'short' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚡ Ngắn gọn
            </button>
          </div>

          <button
            type="button"
            onClick={() => refreshContent()}
            title="Đổi biến thể câu từ ngẫu nhiên"
            className="h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Spin lại</span>
          </button>
        </div>

        {/* Textarea Editor */}
        <div className="flex-1 p-4 min-h-0 overflow-y-auto space-y-2">
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-[#0068ff]/30 focus:border-[#0068ff] resize-none"
              placeholder="Nội dung bài viết..."
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-500 px-1">
            <span>{content.length} ký tự</span>
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              Đã tối ưu hóa chống quét trùng lặp
            </span>
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
            {copied ? 'Đã sao chép bài!' : 'Sao chép nội dung'}
          </button>

          <button
            type="button"
            onClick={() => {
              handleCopy();
              handleOpenZalo();
            }}
            className="flex-1 h-11 px-4 rounded-xl bg-[#0068ff] text-white text-xs font-semibold hover:bg-blue-600 active:bg-blue-700 transition-colors inline-flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
          >
            <ExternalLink className="w-4 h-4" />
            Copy & Mở Zalo
          </button>
        </div>
      </div>
    </div>
  );
};
