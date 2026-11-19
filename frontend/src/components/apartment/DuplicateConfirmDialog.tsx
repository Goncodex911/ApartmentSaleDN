import React from 'react';
import { AlertTriangle, ExternalLink, Building2, Check, X } from 'lucide-react';
import { formatVnd } from '../../utils/format.js';
import { MatchedApartment } from '../../api/apartmentApi.js';
import { Button } from '../ui/Button.js';

interface DuplicateConfirmDialogProps {
  matched: MatchedApartment;
  busy?: boolean;
  onConfirmCreate: () => void;
  onViewExisting: () => void;
  onCancel: () => void;
}

/**
 * Hộp thoại xác nhận khi Quản lý lưu căn nghi trùng (Story 13.10 — AC3).
 * Cho phép Quản lý chọn 1 trong 3 hành động:
 * 1. Vẫn tạo căn mới (nếu là phòng khác trong cùng tòa nhà)
 * 2. Xem căn đã có trong kho để đối chiếu
 * 3. Hủy bỏ để chỉnh sửa lại form
 */
export const DuplicateConfirmDialog: React.FC<DuplicateConfirmDialogProps> = ({
  matched,
  busy,
  onConfirmCreate,
  onViewExisting,
  onCancel,
}) => {
  const formattedDate = matched.createdAt
    ? new Date(matched.createdAt).toLocaleDateString('vi-VN')
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dup-dialog-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 bg-amber-50 border-b border-amber-100">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="dup-dialog-title" className="text-base font-bold text-slate-900 leading-tight">
              Căn hộ này có thể đã có trong kho!
            </h3>
            <p className="text-xs text-amber-800 font-medium mt-0.5">
              Hệ thống phát hiện thông tin tương tự trên Bảng hàng
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Đóng"
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thẻ căn nghi trùng */}
        <div className="p-4 overflow-y-auto space-y-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex gap-3">
            {matched.image ? (
              <img
                src={matched.image}
                alt={matched.title}
                className="w-20 h-20 rounded-lg object-cover shrink-0 bg-slate-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                <Building2 className="w-8 h-8" />
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-1">
              <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800">
                {matched.reason || 'Trùng Tên đường, Giá thuê và Loại căn'}
              </span>
              <h4 className="text-sm font-bold text-slate-900 truncate">
                {matched.title}
              </h4>
              <p className="text-sm font-semibold text-indigo-600">
                {formatVnd(matched.price)}
                <span className="text-xs font-normal text-slate-500">/tháng</span>
              </p>
              <p className="text-xs text-slate-600 truncate">
                📍 {matched.address || matched.area || 'Đà Nẵng'}
              </p>
              {(matched.createdBy || formattedDate) && (
                <p className="text-[11px] text-slate-400">
                  {matched.createdBy ? `Đăng bởi: ${matched.createdBy}` : ''}
                  {matched.createdBy && formattedDate ? ' · ' : ''}
                  {formattedDate ? `Ngày: ${formattedDate}` : ''}
                </p>
              )}
            </div>
          </div>

          <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/60 text-xs text-slate-700 leading-relaxed">
            <span className="font-semibold text-slate-900">Đây có phải là một phòng khác trong cùng tòa nhà?</span>
            <p className="mt-1 text-slate-600">
              Nếu là phòng khác (ví dụ: tầng khác hoặc mã phòng khác), bạn có thể bấm <strong>Vẫn tạo căn mới</strong>.
              Nếu cùng phòng, vui lòng hủy bỏ để tránh làm rác bảng hàng.
            </p>
          </div>
        </div>

        {/* 3 Nút Hành Động Rõ Ràng (AC3) */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-2 justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={busy}
            className="sm:order-1"
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onViewExisting}
            disabled={busy}
            className="sm:order-2 inline-flex items-center gap-1.5"
          >
            <ExternalLink className="w-4 h-4" />
            Xem căn đã có
          </Button>
          <Button
            type="button"
            onClick={onConfirmCreate}
            loading={busy}
            className="sm:order-3 bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Vẫn tạo căn mới
          </Button>
        </div>
      </div>
    </div>
  );
};
