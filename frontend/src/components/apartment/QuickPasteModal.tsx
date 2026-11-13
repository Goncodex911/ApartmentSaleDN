import React, { useState } from 'react';
import { X, Sparkles, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { ingestionApi } from '../../api/ingestionApi.js';

interface QuickPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const QuickPasteModal: React.FC<QuickPasteModalProps> = ({ isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;

  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText || rawText.trim().length < 10) {
      setError('Vui lòng dán nội dung tin nhắn đầy đủ (tối thiểu 10 ký tự)');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const res = await ingestionApi.quickPaste({
        rawText,
        sourceName: 'Nhập nhanh Portal',
      });

      setResult(res.data);
      if (res.data?.isRentalListing) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi phân tích tin nhắn');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRawText('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Nhập nhanh Bài đăng bằng AI
              </h2>
              <p className="text-[11px] text-slate-500">
                Dán tin nhắn từ Zalo, Telegram, Facebook để AI tự bóc tách và lọc trùng lặp
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
          {error && <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-xl">{error}</div>}

          {/* Kết quả sau phân tích */}
          {result && (
            <div className={`p-4 rounded-xl border ${
              !result.isRentalListing
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : result.isDuplicate
                ? 'bg-sky-50 border-sky-200 text-sky-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <div className="flex items-start gap-2.5">
                {!result.isRentalListing ? (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : result.isDuplicate ? (
                  <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-bold">
                    {!result.isRentalListing
                      ? 'Phát hiện tin rác / Không phải tin cho thuê'
                      : result.isDuplicate
                      ? 'Đã phát hiện trùng lặp & Gộp vào Căn Master'
                      : 'Đã thêm Căn hộ mới vào Bảng hàng'}
                  </p>
                  <p className="text-xs opacity-90">{result.message || result.rejectReason}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 block">Nội dung tin nhắn bài đăng</label>
            <textarea
              rows={6}
              required
              placeholder="VD: Chính chủ cho thuê căn 1N1K Doãn Kế Thiện 35m2 full đồ, thang máy, giá 6tr5/tháng, cọc 1... Liên hệ 0987654321"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full p-3 border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs bg-slate-50/30"
            />
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Xóa trắng
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium">
                Đóng
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Đang phân tích AI...' : 'Phân tích & Lưu vào kho'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

