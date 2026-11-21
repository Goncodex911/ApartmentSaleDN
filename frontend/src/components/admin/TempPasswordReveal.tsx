import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { copyText } from '../../utils/clipboard.js';

/** Mật khẩu tạm hiện đúng 1 lần (reset 13.2 / tạo tài khoản 16.6) — sao chép để gửi riêng cho thành viên. */
export const TempPasswordReveal: React.FC<{ name: string; password: string }> = ({ name, password }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3" role="status">
      <p className="text-sm text-amber-900">
        Mật khẩu tạm — chỉ hiện 1 lần, sẽ không xem lại được. Gửi riêng cho {name} (Zalo / gặp trực tiếp), không đăng vào nhóm. Lần đăng nhập tới, app sẽ yêu cầu đặt mật khẩu mới.
      </p>
      <p className="font-mono text-2xl font-bold tracking-wider text-slate-900 select-all break-all">{password}</p>
      <Button variant="secondary" icon={copied ? Check : Copy} onClick={async () => setCopied(await copyText(password))} className="w-full">
        {copied ? 'Đã sao chép' : 'Sao chép mật khẩu'}
      </Button>
    </div>
  );
};
