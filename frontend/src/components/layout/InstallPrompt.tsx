import React, { useState } from 'react';
import { Share, SquarePlus, X } from 'lucide-react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt.js';
import { copyText } from '../../utils/clipboard.js';

/**
 * Thanh hướng dẫn cài app (Story 9.2) — nằm ngay trên menu đáy, dưới mọi hộp thoại (z-20).
 * Chỉ gắn trong AppShell → không hiện ở trang đăng nhập và trang khách xem /p/...
 */
export const InstallPrompt: React.FC = () => {
  const { platform, install, dismiss } = useInstallPrompt();
  const [copied, setCopied] = useState(false);
  if (!platform) return null;

  const copyLink = async () => setCopied(await copyText(window.location.origin));

  return (
    <aside
      aria-label="Cài ứng dụng"
      className="fixed inset-x-3 z-20 bottom-[calc(var(--host-badge)+56px+8px+env(safe-area-inset-bottom))] md:bottom-[calc(var(--host-badge)+8px+env(safe-area-inset-bottom))] md:left-auto md:w-96 p-3 pr-12 bg-white rounded-2xl border border-slate-200 shadow-lg"
    >
      <button type="button" onClick={dismiss} aria-label="Đóng" className="absolute top-1 right-1 w-11 h-11 flex items-center justify-center text-slate-600 hover:text-slate-700">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <img src="/icons/favicon-64.png" alt="" className="w-10 h-10 rounded-xl shrink-0" />
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-semibold text-slate-900">Cài ApartmentDN để mở nhanh như app</p>
          {platform === 'android' && (
            <button type="button" onClick={install} className="min-h-[44px] px-4 rounded-xl bg-[#0f2a45] text-white text-sm font-semibold">
              Cài đặt
            </button>
          )}
          {platform === 'ios-safari' && (
            <ol className="space-y-1.5 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <span className="text-slate-600">1.</span> Chạm <Share className="w-4 h-4 text-indigo-600" aria-hidden /> <b className="font-medium text-slate-800">Chia sẻ</b> ở thanh dưới Safari
              </li>
              <li className="flex items-center gap-2">
                <span className="text-slate-600">2.</span> Chọn <SquarePlus className="w-4 h-4 text-indigo-600" aria-hidden /> <b className="font-medium text-slate-800">Thêm vào MH chính</b>
              </li>
            </ol>
          )}
          {platform === 'ios-other' && (
            <>
              <p className="text-sm text-slate-600">iPhone chỉ cài được app từ Safari. Copy link rồi mở bằng Safari.</p>
              <button type="button" onClick={copyLink} className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-700">
                {copied ? 'Đã copy link' : 'Copy link'}
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
