import React from 'react';
import { PoiGroup } from '../../api/apartmentApi.js';
import { POI_GROUPS } from './poiStyle.js';

/** Story 15.4: dải chip bật / tắt nhóm tiện ích trên bản đồ — cuộn ngang, chạm ≥ 44px, aria-pressed. */
export const PoiChips: React.FC<{ active: PoiGroup[]; onToggle: (group: PoiGroup) => void }> = ({ active, onToggle }) => (
  <div role="group" aria-label="Tiện ích trên bản đồ" className="absolute left-2 right-[60px] top-2 z-[900] flex gap-1.5 overflow-x-auto no-scrollbar">
    {POI_GROUPS.map(({ id, label, icon: Icon, bg }) => {
      const on = active.includes(id);
      return (
        <button
          key={id}
          type="button"
          aria-pressed={on}
          onClick={() => onToggle(id)}
          className={`shrink-0 min-h-[44px] inline-flex items-center gap-1.5 px-3 rounded-full text-sm font-semibold shadow-md transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${
            on ? `${bg} text-white` : 'bg-white text-slate-800 border border-slate-200 active:bg-slate-100'
          }`}
        >
          <Icon className="w-4 h-4" aria-hidden />
          {label}
        </button>
      );
    })}
  </div>
);
