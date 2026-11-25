import React from 'react';
import { ChevronDown, Forward } from 'lucide-react';
import { TelegramLinkSection } from '../../profile/TelegramLinkSection.js';
import { ui } from './telegramUi.js';

/**
 * Story 18.6: đường dự phòng khi không kết nối được Telegram cá nhân — chuyển tiếp bài cho Bot của hệ thống.
 * Thu gọn mặc định (không chiếm chỗ của luồng chính), mở sẵn khi tài khoản Telegram bị hạn chế.
 */
export const ForwardToBotHint: React.FC<{ botLinked: boolean; open?: boolean }> = ({ botLinked, open }) => (
  <details className={`${ui.card} group`} open={open}>
    <summary className="flex items-center justify-between gap-2 min-h-11 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
      <span className={ui.cardTitle}>
        <Forward className="w-5 h-5 text-indigo-600" aria-hidden /> Không kết nối được? Chuyển tiếp bài cho Bot
      </span>
      <ChevronDown className="w-5 h-5 text-slate-500 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
    </summary>
    <div className="space-y-3 pt-1">
      <ol className="space-y-1.5 text-sm text-slate-700 list-decimal pl-5">
        <li>Liên kết Telegram với tài khoản app (nút bên dưới → bấm <strong>Start</strong> trong Telegram).</li>
        <li>Trong nhóm BĐS, nhấn giữ bài đăng (hoặc chọn cả album) → <strong>Chuyển tiếp</strong> → chọn chat với Bot.</li>
        <li>Bot trả lời "Đã nạp vào Bảng hàng" kèm tiêu đề căn, hoặc lý do bài bị loại.</li>
      </ol>
      <p className={ui.hint}>Không cần đăng nhập Telegram cá nhân vào hệ thống. Tối đa 30 bài mỗi giờ.</p>
      <TelegramLinkSection linked={botLinked} />
    </div>
  </details>
);
