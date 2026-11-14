import React, { useState, useRef, useEffect } from 'react';
import { apartmentApi } from '../../api/apartmentApi.js';
import { ChevronDown, CheckCircle2, Clock, AlertCircle, Ban } from 'lucide-react';

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
  const [selectedDate, setSelectedDate] = useState(
    availableDate ? new Date(availableDate).toISOString().split('T')[0] : ''
  );
  const popoverRef = useRef<HTMLDivElement>(null);

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

  const handleUpdate = async (newStatus: 'AVAILABLE' | 'UPCOMING' | 'DEPOSITED' | 'RENTED', date?: string) => {
    if (newStatus === 'UPCOMING' && !date) {
      setShowDatePicker(true);
      return;
    }

    try {
      setLoading(true);
      await apartmentApi.updateStatus(apartmentId, {
        status: newStatus,
        availableDate: date ? new Date(date).toISOString() : undefined,
      });
      setCurrentStatus(newStatus);
      setIsOpen(false);
      setShowDatePicker(false);
      onStatusUpdated?.(newStatus, date);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi cập nhật trạng thái');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (st: string) => {
    switch (st) {
      case 'AVAILABLE':
        return {
          label: 'Trống ở ngay',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dotClass: 'bg-emerald-500',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case 'UPCOMING':
        return {
          label: availableDate
            ? `Sắp trống (${new Date(availableDate).toLocaleDateString('vi-VN')})`
            : 'Sắp trống',
          badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
          dotClass: 'bg-sky-500',
          icon: <Clock className="w-3.5 h-3.5 text-sky-600" />,
        };
      case 'DEPOSITED':
        return {
          label: 'Đang giữ cọc',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
          dotClass: 'bg-amber-500',
          icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600" />,
        };
      case 'RENTED':
        return {
          label: 'Đã cho thuê',
          badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
          dotClass: 'bg-slate-400',
          icon: <Ban className="w-3.5 h-3.5 text-slate-500" />,
        };
      default:
        return {
          label: st,
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
          dotClass: 'bg-slate-400',
          icon: null,
        };
    }
  };

  const config = getStatusConfig(currentStatus);

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <button
        type="button"
        disabled={!canEdit || loading}
        onClick={() => canEdit && setIsOpen(!isOpen)}
        title={canEdit ? 'Nhấn để đổi nhanh trạng thái phòng (1-Click)' : undefined}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
          config.badgeClass
        } ${canEdit ? 'cursor-pointer hover:shadow-sm hover:scale-[1.02]' : 'cursor-default'} ${
          loading ? 'opacity-60' : ''
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${config.dotClass} animate-pulse`} />
        <span>{config.label}</span>
        {canEdit && <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />}
      </button>

      {/* Popover Đổi Trạng thái 1-Click (Story 2.2) */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 rounded-xl bg-white shadow-xl border border-slate-200 z-50 p-2 animate-in fade-in slide-in-from-top-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">
            Đổi trạng thái phòng (1-Click)
          </div>

          <div className="space-y-1">
            <button
              onClick={() => handleUpdate('AVAILABLE')}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Trống ở ngay
              </span>
              {currentStatus === 'AVAILABLE' && <span className="text-emerald-600 font-bold">✓</span>}
            </button>

            <button
              onClick={() => setShowDatePicker(true)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-500" />
                Sắp trống...
              </span>
              {currentStatus === 'UPCOMING' && <span className="text-sky-600 font-bold">✓</span>}
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
                  className="w-full px-2 py-1 text-xs border rounded-md border-slate-300 bg-white"
                />
                <button
                  disabled={!selectedDate}
                  onClick={() => handleUpdate('UPCOMING', selectedDate)}
                  className="w-full py-1 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-md transition-colors"
                >
                  Xác nhận Sắp trống
                </button>
              </div>
            )}

            <button
              onClick={() => handleUpdate('DEPOSITED')}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
            >
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Đang giữ cọc
              </span>
              {currentStatus === 'DEPOSITED' && <span className="text-amber-600 font-bold">✓</span>}
            </button>

            <button
              onClick={() => handleUpdate('RENTED')}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition-colors"
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
    </div>
  );
};

