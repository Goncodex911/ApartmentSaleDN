import React from 'react';
import { Sparkles, X, Cpu } from 'lucide-react';

export interface NaturalBadge {
  label: string;
  type: 'district' | 'landmark' | 'price' | 'roomType' | 'amenity';
}

export interface NaturalAnalysisData {
  rawQuery: string;
  engineUsed: 'GEMINI_AI' | 'HEURISTIC_NLP';
  extracted: any;
  badges: NaturalBadge[];
  summary: string;
}

interface NaturalSearchBannerProps {
  analysis: NaturalAnalysisData | null;
  onClear: () => void;
}

export const NaturalSearchBanner: React.FC<NaturalSearchBannerProps> = ({ analysis, onClear }) => {
  if (!analysis || !analysis.badges || analysis.badges.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200/80 rounded-2xl p-3 sm:p-3.5 shadow-sm space-y-2 animate-fadeIn">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-bold text-indigo-900">
          <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
          <span>AI đã phân tích ngữ nghĩa:</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-normal text-indigo-600 bg-indigo-100/80 px-2 py-0.5 rounded-full">
            <Cpu className="w-3 h-3" />
            {analysis.engineUsed === 'GEMINI_AI' ? 'Google Gemini 2.5' : 'NLP Siêu tốc'}
          </span>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 px-2 py-0.5 rounded-lg hover:bg-white/80 transition-colors"
          title="Bỏ tìm kiếm bằng câu tự nhiên"
        >
          <X className="w-3.5 h-3.5" />
          <span>Bỏ AI</span>
        </button>
      </div>

      {/* Dải badge thực thể nhận diện được */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {analysis.badges.map((b, idx) => {
          let colorClass = 'bg-slate-100 text-slate-800 border-slate-200';
          if (b.type === 'district') colorClass = 'bg-blue-100/90 text-blue-800 border-blue-300 font-bold';
          if (b.type === 'landmark') colorClass = 'bg-emerald-100/90 text-emerald-800 border-emerald-300 font-bold';
          if (b.type === 'price') colorClass = 'bg-amber-100/90 text-amber-900 border-amber-300 font-bold';
          if (b.type === 'roomType') colorClass = 'bg-purple-100/90 text-purple-800 border-purple-300 font-bold';
          if (b.type === 'amenity') colorClass = 'bg-teal-100/90 text-teal-800 border-teal-300 font-medium';

          return (
            <span
              key={idx}
              className={`px-2.5 py-1 text-xs rounded-xl border shadow-xs flex items-center gap-1 ${colorClass}`}
            >
              {b.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

