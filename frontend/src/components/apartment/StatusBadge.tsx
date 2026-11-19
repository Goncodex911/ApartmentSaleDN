import React, { useState, useRef, useEffect } from 'react';
import { apartmentApi, LeaseInput } from '../../api/apartmentApi.js';
import { LeaseFormSheet } from './LeaseFormSheet.js';
import { ChevronDown, CheckCircle2, Clock, AlertCircle, Ban } from 'lucide-react';
import { STATUS_STYLE } from '../../utils/statusStyle.js';
import { fieldClass } from '../ui/Input.js';

interface StatusBadgeProps {
  apartmentId: string;
  status: 'AVAILABLE' | 'UPCOMING' | 'DEPOSITED' | 'RENTED';
  availableDate?: string;
  canEdit: boolean; // Chỉ Manager hoặc Admin mới đổi được trạng thái
  onStatusUpdated?: (newStatus: 'AVAILABLE' | 'UPCOMING' | 'DEPOSITED' | 'RENTED', newDate?: string) => void;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  apartmentId,
  status,
  availableDate,
  canEdit,
  onStatusUpdated,
}) => {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [leaseOpen, setLeaseOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    availableDate ? new Date(availableDate).toISOString().split('T')[0] : ''
  );
  const popoverRef = useRef<HTMLDivElement>(null);
  useEffect(() => setCurrentStatus(status), [status]); // Trạng thái đổi từ máy khác (Story 11.4)

  // Đóng popover khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const save = async (newStatus: 'AVAILABLE' | 'UPCOMING' | 'DEPOSITED' | 'RENTED', date?: string, lease?: LeaseInput) => {
    setLoading(true);
    try {
      await apartmentApi.updateStatus(apartmentId, {
        status: newStatus,
        availableDate: date ? new Date(date).toISOString() : undefined,
        lease,
      });
      setCurrentStatus(newStatus);
      setIsOpen(false);
      setShowDatePicker(false);
      setLeaseOpen(false);
      onStatusUpdated?.(newStatus, date);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (newStatus: 'AVAILABLE' | 'UPCOMING' | 'DEPOSITED' | 'RENTED', date?: string) => {
    if (newStatus === 'UPCOMING' && !date) {
      setShowDatePicker(true);
      return;
    }
    // Story 11.5: Đã cho thuê → nhập hợp đồng để hệ thống nhắc tái ký (có thể Bỏ qua)
    if (newStatus === 'RENTED') {
      setIsOpen(false);
      setLeaseOpen(true);
      return;
    }
    await save(newStatus, date).catch((err) => alert(err.response?.data?.message || 'Lỗi cập nhật trạng thái'));
  };

  // Story 12.1: màu lấy từ STATUS_STYLE (trước đây Sắp trống / Đã cọc bị ngược màu so với thẻ căn và bản đồ)
  const STATUS_LABEL = {
    AVAILABLE: 'Trống ở ngay',
    UPCOMING: availableDate ? `Sắp trống (${new Date(availableDate).toLocaleDateString('vi-VN')})` : 'Sắp trống',
    DEPOSITED: 'Đang giữ cọc',
    RENTED: 'Đã cho thuê',
  };
  const config = { label: STATUS_LABEL[currentStatus], badgeClass: STATUS_STYLE[currentStatus].soft, dotClass: STATUS_STYLE[currentStatus].dot };

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <button
        type="button"
        disabled={!canEdit || loading}
        onClick={() => canEdit && setIsOpen(!isOpen)}
        title={canEdit ? 'Nhấn để đổi nhanh trạng thái phòng (1-Click)' : undefined}
        className={`inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-full text-xs font-semibold border transition-shadow ${
          config.badgeClass
        } ${canEdit ? 'cursor-pointer hover:shadow-sm' : 'cursor-default'} ${loading ? 'opacity-60' : ''}`}
      >
        <span className={`w-2 h-2 rounded-full ${config.dotClass}`} aria-hidden />
        <span>{config.label}</span>
        {canEdit && <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />}
      </button>

      {/* Popover Đổi Trạng thái 1-Click (Story 2.2) */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 rounded-xl bg-white shadow-xl border border-slate-200 z-50 p-2 animate-in fade-in slide-in-from-top-1">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider px-2 py-1 mb-1">
            Đổi trạng thái phòng (1-Click)
          </div>

          <div className="space-y-1">
            <button
              onClick={() => handleUpdate('AVAILABLE')}
              className="w-full min-h-[44px] flex items-center justify-between px-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Trống ở ngay
              </span>
              {currentStatus === 'AVAILABLE' && <span className="text-emerald-600 font-bold">✓</span>}
            </button>

            <button
              onClick={() => setShowDatePicker(true)}
              className="w-full min-h-[44px] flex items-center justify-between px-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Sắp trống...
              </span>
              {currentStatus === 'UPCOMING' && <span className="text-amber-600 font-bold">✓</span>}
            </button>

            {showDatePicker && (
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 mt-1 space-y-2">
                <label className="text-[11px] font-medium text-slate-600 block">
                  Ngày dự kiến khách cũ chuyển đi:
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={fieldClass} // 16px trên điện thoại — iPhone không tự phóng to (Story 12.1)
                />
                <button
                  disabled={!selectedDate}
                  onClick={() => handleUpdate('UPCOMING', selectedDate)}
                  className="w-full h-11 text-sm font-semibold text-white bg-brand-accent hover:bg-brand-accent-dark disabled:opacity-60 rounded-lg transition-colors"
                >
                  Xác nhận Sắp trống
                </button>
              </div>
            )}

            <button
              onClick={() => handleUpdate('DEPOSITED')}
              className="w-full min-h-[44px] flex items-center justify-between px-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition-colors"
            >
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-sky-500" />
                Đang giữ cọc
              </span>
              {currentStatus === 'DEPOSITED' && <span className="text-sky-600 font-bold">✓</span>}
            </button>

            <button
              onClick={() => handleUpdate('RENTED')}
              className="w-full min-h-[44px] flex items-center justify-between px-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-500" />
                Đã cho thuê
              </span>
              {currentStatus === 'RENTED' && <span className="text-rose-600 font-bold">✓</span>}
            </button>
          </div>
        </div>
      )}
      {leaseOpen && <LeaseFormSheet onSubmit={(lease) => save('RENTED', undefined, lease)} onClose={() => setLeaseOpen(false)} />}
    </div>
  );
};

