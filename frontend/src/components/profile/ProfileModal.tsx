import React, { useState } from 'react';
import { User } from '../../api/authApi.js';
import { userApi } from '../../api/userApi.js';
import { TelegramLinkSection } from './TelegramLinkSection.js';
import { X, UserCircle, Phone, MessageSquare, ExternalLink, Loader2, Check } from 'lucide-react';

// Trang cha chỉ render modal khi đang mở → mỗi lần mở là một lần mount mới, state tự lấy theo user hiện tại
interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onProfileUpdated: (updatedUser: User) => void;
}

const fieldClass = 'w-full min-h-[44px] px-3 py-2 border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500';

export const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onProfileUpdated }) => {
  const [name, setName] = useState(user.name || '');
  const [zaloPhone, setZaloPhone] = useState(user.zaloPhone || '');
  const [greetingMessage, setGreetingMessage] = useState(user.greetingMessage || '');
  // Story 10.4: in vào bài gửi khách (dòng 9️⃣ Điều kiện, 🔟 Liên hệ)
  const [paymentTerms, setPaymentTerms] = useState(user.paymentTerms ?? 'deposit 1 month pay 1 month');
  const [zaloGroupLink, setZaloGroupLink] = useState(user.zaloGroupLink || '');
  const [whatsappGroupLink, setWhatsappGroupLink] = useState(user.whatsappGroupLink || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    try {
      setLoading(true);
      const res = await userApi.updateProfile({
        name,
        zaloPhone: zaloPhone || undefined,
        greetingMessage: greetingMessage || undefined,
        paymentTerms, // Chuỗi rỗng = không in dòng điều kiện thanh toán
        zaloGroupLink,
        whatsappGroupLink,
      });

      onProfileUpdated(res.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">Hồ sơ cá nhân & Mã CTV</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
          {error && <div className="p-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs">{error}</div>}
          {success && (
            <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs flex items-center gap-2">
              <Check className="w-4 h-4" /> Đã cập nhật hồ sơ cá nhân thành công!
            </div>
          )}

          {/* Mã định danh CTV */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-emerald-700 font-medium block">Mã định danh CTV của bạn:</span>
              <span className="text-base font-extrabold text-emerald-900 tracking-wider">{user.ctvCode}</span>
            </div>
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-100/80 px-2 py-1 rounded-md">
              {user.role}
            </span>
          </div>

          {/* Tên hiển thị */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">Tên hiển thị</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* SĐT đăng nhập & SĐT Zalo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">SĐT Đăng nhập</label>
              <input
                type="text"
                disabled
                value={user.phone}
                className="w-full px-3 py-2 border rounded-xl border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-blue-500" /> SĐT Zalo
              </label>
              <input
                type="text"
                placeholder="0988..."
                value={zaloPhone}
                onChange={(e) => setZaloPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Link Zalo tự sinh */}
          {user.zaloLink && (
            <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-slate-400">Link Zalo rút gọn:</span>
              <a
                href={user.zaloLink}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 font-medium hover:underline flex items-center gap-1"
              >
                {user.zaloLink} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Lời chào khách hàng */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-500" /> Lời chào gửi khách mặc định
            </label>
            <textarea
              rows={3}
              value={greetingMessage}
              onChange={(e) => setGreetingMessage(e.target.value)}
              placeholder="VD: Em Hải chuyên viên căn hộ Sơn Trà xin chào anh/chị!"
              className="w-full px-3 py-2 border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
            />
            <span className="text-[11px] text-slate-400 block">Hiển thị trên trang xem phòng và là câu chào đầu tiên của trợ lý AI khi khách chat.</span>
          </div>

          {/* Story 10.4: thông tin in cuối bài gửi khách */}
          <fieldset className="space-y-3 p-3 rounded-xl border border-slate-200">
            <legend className="px-1 font-semibold text-slate-700">Bài gửi khách</legend>
            <label className="block space-y-1">
              <span className="font-medium text-slate-700">Điều kiện thanh toán</span>
              <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} maxLength={200} placeholder="deposit 1 month pay 1 month" className={fieldClass} />
            </label>
            <label className="block space-y-1">
              <span className="font-medium text-slate-700">Link nhóm Zalo</span>
              <input type="url" inputMode="url" value={zaloGroupLink} onChange={(e) => setZaloGroupLink(e.target.value)} placeholder="https://zalo.me/g/..." className={fieldClass} />
            </label>
            <label className="block space-y-1">
              <span className="font-medium text-slate-700">Link nhóm WhatsApp</span>
              <input type="url" inputMode="url" value={whatsappGroupLink} onChange={(e) => setWhatsappGroupLink(e.target.value)} placeholder="https://chat.whatsapp.com/..." className={fieldClass} />
            </label>
            <span className="text-[11px] text-slate-400 block">Để trống ô nào thì bài gửi khách không in dòng đó.</span>
          </fieldset>

          <TelegramLinkSection linked={Boolean(user.telegramChatId)} />

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition-colors"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Lưu hồ sơ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

