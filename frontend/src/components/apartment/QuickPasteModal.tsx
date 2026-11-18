import React, { useState } from 'react';
import { X, Sparkles, Loader2, CheckCircle2, AlertCircle, Info, ClipboardPaste } from 'lucide-react';
import { ingestionApi } from '../../api/ingestionApi.js';

interface QuickPasteModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const RESULT_STYLE = {
  rejected: { box: 'bg-amber-50 text-amber-900', icon: AlertCircle, iconClass: 'text-amber-600', title: 'Không phải tin cho thuê / tin rác' },
  duplicate: { box: 'bg-sky-50 text-sky-900', icon: Info, iconClass: 'text-sky-600', title: 'Tin trùng — đã gộp vào căn có sẵn' },
  created: { box: 'bg-emerald-50 text-emerald-900', icon: CheckCircle2, iconClass: 'text-emerald-600', title: 'Đã thêm căn mới vào Bảng hàng' },
};

/**
 * Nhập nhanh tin bằng AI (Story 10.5): điện thoại toàn màn hình như form Thêm căn — ô dán tin chiếm phần lớn màn hình,
 * chữ 16px (iPhone không tự phóng to), nút Phân tích ghim đáy; máy tính là hộp giữa màn hình.
 * Trang cha chỉ render khi đang mở → mỗi lần mở là form mới.
 */
export const QuickPasteModal: React.FC<QuickPasteModalProps> = ({ onClose, onSuccess }) => {
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rawText.trim().length < 10) {
      setError('Vui lòng dán nội dung tin đầy đủ (tối thiểu 10 ký tự)');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      const res = await ingestionApi.quickPaste({ rawText, sourceName: 'Nhập nhanh Portal' });
      setResult(res.data);
      if (res.data?.isRentalListing) onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi phân tích tin');
    } finally {
      setLoading(false);
    }
  };

  // Dán từ clipboard bằng 1 chạm (iPhone hỏi quyền "Dán" một lần); bị chặn → hướng dẫn nhấn giữ để dán
  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawText(text);
        setResult(null);
        setError(null);
      }
    } catch {
      setError('Trình duyệt chặn đọc clipboard — hãy nhấn giữ vào ô bên dưới rồi chọn Dán');
    }
  };

  const reset = () => {
    setRawText('');
    setResult(null);
    setError(null);
  };

  const style = result && RESULT_STYLE[!result.isRentalListing ? 'rejected' : result.isDuplicate ? 'duplicate' : 'created'];

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4 bg-black/50">
      <form
        onSubmit={handleSubmit}
        className="h-[100dvh] sm:h-auto sm:max-h-[90vh] w-full sm:max-w-xl flex flex-col bg-white sm:rounded-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-2 h-14 border-b border-slate-100 shrink-0">
          <button type="button" onClick={onClose} aria-label="Đóng" className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-slate-800">
            <X className="w-5 h-5" />
          </button>
          <Sparkles className="w-5 h-5 text-indigo-600" aria-hidden />
          <h2 className="text-base font-semibold text-slate-900">Nhập tin bằng AI</h2>
        </div>

        <div className="flex-1 min-h-0 flex flex-col gap-3 p-4 overflow-y-auto">
          <p className="text-sm text-slate-500">Dán tin từ Zalo, Telegram, Facebook — AI tự tách thông tin và lọc tin trùng.</p>
          {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 text-sm text-rose-700">{error}</p>}
          {style && (
            <div role="status" className={`flex items-start gap-2.5 p-3 rounded-xl ${style.box}`}>
              <style.icon className={`w-5 h-5 shrink-0 mt-0.5 ${style.iconClass}`} aria-hidden />
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">{style.title}</p>
                {(result.message || result.rejectReason) && <p className="text-sm opacity-90">{result.message || result.rejectReason}</p>}
              </div>
            </div>
          )}
          <label className="flex-1 flex flex-col gap-1.5 min-h-[40vh] sm:min-h-0">
            <span className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Nội dung tin</span>
              <button type="button" onClick={pasteFromClipboard} className="min-h-[44px] -my-2 px-3 flex items-center gap-1.5 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-50">
                <ClipboardPaste className="w-4 h-4" aria-hidden /> Dán
              </button>
            </span>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="VD: Cho thuê căn 1PN Khuê Mỹ 45m2 full đồ, thang máy, giá 17tr/tháng, thuê tối thiểu 6 tháng. LH 0905..."
              className="flex-1 sm:h-56 w-full p-3 text-base sm:text-sm leading-relaxed bg-slate-50 border border-slate-200 rounded-xl resize-none focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
        </div>

        {/* Nút ghim đáy, chừa chỗ huy hiệu Netlify */}
        <div className="shrink-0 flex gap-2 p-3 pb-badge-safe sm:pb-3 border-t border-slate-100">
          <button type="button" onClick={reset} disabled={!rawText && !result} className="h-11 px-4 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40">
            Xóa
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-transform duration-100 motion-reduce:transform-none disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            {loading ? 'AI đang phân tích...' : 'Phân tích & lưu vào kho'}
          </button>
        </div>
      </form>
    </div>
  );
};
