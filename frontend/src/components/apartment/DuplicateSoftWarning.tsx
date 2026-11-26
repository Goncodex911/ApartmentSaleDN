import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { MatchedApartment } from '../../api/apartmentApi.js';
import { formatVnd } from '../../utils/format.js';

/** Story 13.10 / CE-03.3: cảnh báo mềm cho CTV khi kho có căn tương tự (không chặn gửi) — ghi rõ đường và lý do. */
export const DuplicateSoftWarning: React.FC<{ matched: MatchedApartment }> = ({ matched }) => (
  <div role="status" className="shrink-0 mx-3 sm:mx-4 mb-2 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs sm:text-sm flex items-start gap-2.5">
    <AlertTriangle aria-hidden className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
    <div className="flex-1 leading-relaxed">
      <span className="font-semibold text-amber-950">Có thể trùng:</span>{' '}
      <span className="font-medium text-amber-950">{matched.title}</span> · {formatVnd(matched.price)}/tháng
      {matched.street ? ` · đường ${matched.street}` : matched.area ? ` · ${matched.area}` : ''}
      {matched.reason && <span className="block text-amber-800">{matched.reason}</span>}
      <span className="block">Kiểm tra lại số nhà / số phòng trước khi gửi để tránh gửi trùng.</span>
    </div>
  </div>
);
