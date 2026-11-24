// Lớp giao diện dùng chung cho trang Cào tin Telegram — đồng bộ với các trang Quản trị khác (thẻ trắng bo 2xl, nhấn indigo)
const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2';
// Phản hồi ngay khi chạm (scale nhẹ), tắt khi người dùng giảm chuyển động
const press = 'transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100';

export const ui = {
  card: 'p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 space-y-4',
  cardTitle: 'flex items-center gap-2 text-base font-bold text-slate-900',
  label: 'block text-sm font-semibold text-slate-800',
  hint: 'text-xs text-slate-600',
  // Chữ 16px trên điện thoại để iOS không tự phóng to khi chạm vào ô nhập
  input: `w-full min-h-11 px-3 rounded-xl border border-slate-300 bg-white text-base sm:text-sm text-slate-900 placeholder:text-slate-400 ${focusRing}`,
  primaryBtn: `inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${press} ${focusRing}`,
  secondaryBtn: `inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${press} ${focusRing}`,
  dangerBtn: `inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl border border-rose-200 bg-white text-rose-700 text-sm font-semibold hover:bg-rose-50 disabled:opacity-50 cursor-pointer ${press} ${focusRing}`,
  segment: (active: boolean) =>
    `min-h-11 px-3 rounded-lg text-sm font-semibold cursor-pointer ${press} ${focusRing} ${
      active ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
    }`,
  alert: 'flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800',
};
