import React from 'react';
import { LayoutGrid, List, Map as MapIcon, Plus, Route } from 'lucide-react';
import { Button } from '../ui/Button.js';

// Story 12.2: 3 kiểu xem trong 1 nhóm nút, nhớ lâu dài (localStorage); người mới mặc định Thẻ ảnh
export type ListingView = 'cards' | 'list' | 'map';
const VIEWS = [
  { key: 'cards', icon: LayoutGrid, label: 'Thẻ ảnh' },
  { key: 'list', icon: List, label: 'Danh sách gọn' },
  { key: 'map', icon: MapIcon, label: 'Bản đồ' },
] as const;
const VIEW_KEY = 'apartments.view';

export const readListingView = (): ListingView => {
  try {
    const saved = localStorage.getItem(VIEW_KEY);
    return saved === 'list' || saved === 'map' ? saved : 'cards';
  } catch {
    return 'cards';
  }
};
export const saveListingView = (view: ListingView) => {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    /* Trình duyệt chặn lưu trữ → chỉ nhớ trong lần mở này */
  }
};

interface ListingsHeaderProps {
  total: number;
  view: ListingView;
  onViewChange: (view: ListingView) => void;
  tourActive: boolean;
  onToggleTour: () => void;
  role: 'manager' | 'ctv' | null;
  onAdd: () => void; // Quản lý: Thêm căn
  onQuickPaste: () => void;
  onSubmit: () => void; // CTV: Đăng tin
}

/** Đầu trang Bảng hàng: tiêu đề + số căn, nút Lộ trình (Story 11.3), nhóm kiểu xem (Story 12.2), Thêm căn / Đăng tin. */
export const ListingsHeader: React.FC<ListingsHeaderProps> = ({ total, view, onViewChange, tourActive, onToggleTour, role, onAdd, onQuickPaste, onSubmit }) => (
  <div className="flex items-center justify-between gap-2">
    <div className="min-w-0">
      <h1 className="text-xl font-bold text-slate-900">Bảng hàng</h1>
      <p className="text-sm text-slate-600">{total} căn hộ</p>
    </div>
    <button
      type="button"
      aria-pressed={tourActive}
      aria-label="Chọn căn dẫn khách"
      title="Lộ trình dẫn khách"
      onClick={onToggleTour}
      className={`ml-auto w-11 h-11 shrink-0 flex items-center justify-center rounded-xl border transition-colors ${tourActive ? 'border-brand-accent bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-600'}`}
    >
      <Route className="w-5 h-5" aria-hidden />
    </button>
    <div role="group" aria-label="Kiểu xem" className="flex shrink-0 rounded-xl bg-slate-200/70">
      {VIEWS.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          type="button"
          aria-pressed={view === key}
          aria-label={label}
          title={label}
          onClick={() => onViewChange(key)}
          className={`w-11 h-11 flex items-center justify-center rounded-xl transition-colors ${view === key ? 'bg-white text-brand-accent shadow-sm ring-1 ring-slate-200' : 'text-slate-600'}`}
        >
          <Icon className="w-5 h-5" aria-hidden />
        </button>
      ))}
    </div>
    {/* Điện thoại đã có nút Đăng tin ở menu đáy (Story 9.3) */}
    {role === 'ctv' && <Button onClick={onSubmit} className="hidden md:inline-flex">Đăng tin</Button>}
    {role === 'manager' && (
      <div className="flex items-center gap-1">
        <Button variant="ghost" onClick={onQuickPaste} className="hidden md:inline-flex">Nhập nhanh</Button>
        {/* Điện thoại: chỉ icon + để hàng đầu đủ chỗ cho nút Lộ trình và 3 kiểu xem */}
        <Button icon={Plus} aria-label="Thêm căn" onClick={onAdd} className="shrink-0 w-11 px-0 sm:w-auto sm:px-4">
          <span className="hidden sm:inline">Thêm căn</span>
        </Button>
      </div>
    )}
  </div>
);
