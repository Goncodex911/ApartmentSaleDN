import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface PhotoSliderProps {
  images: string[];
  title: string;
  emptyLabel?: string; // Story 7.3: chữ theo ngôn ngữ trang
  photoLabel?: string;
  onOpen?: (index: number) => void; // Story 12.4: chạm ảnh → xem toàn màn hình
}

// Slide ảnh vuốt ngang bằng CSS scroll-snap (native, không cần thư viện)
export const PhotoSlider: React.FC<PhotoSliderProps> = ({ images, title, emptyLabel = 'Chưa có ảnh', photoLabel = 'ảnh', onOpen }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-[4/3] bg-slate-200 flex flex-col items-center justify-center text-slate-600 text-sm gap-2">
        <ImageOff className="w-8 h-8" /> {emptyLabel}
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] bg-slate-200">
      <div
        className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-none"
        onScroll={(e) => setActiveIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {images.map((src, index) => (
          <img
            key={index}
            src={src}
            alt={`${title} - ${photoLabel} ${index + 1}`}
            loading={index === 0 ? 'eager' : 'lazy'}
            onClick={() => onOpen?.(index)} // Vuốt cuộn không sinh click → chỉ chạm mới mở
            className={`w-full h-full object-cover shrink-0 snap-center ${onOpen ? 'cursor-zoom-in' : ''}`}
          />
        ))}
      </div>
      {images.length > 1 && (
        <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-semibold px-2 py-0.5 rounded-md">
          {activeIndex + 1}/{images.length}
        </span>
      )}
    </div>
  );
};
