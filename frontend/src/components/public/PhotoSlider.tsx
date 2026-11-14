import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface PhotoSliderProps {
  images: string[];
  title: string;
}

// Slide ảnh vuốt ngang bằng CSS scroll-snap (native, không cần thư viện)
export const PhotoSlider: React.FC<PhotoSliderProps> = ({ images, title }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-[4/3] bg-slate-200 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
        <ImageOff className="w-8 h-8" /> Chưa có ảnh
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
            alt={`${title} - ảnh ${index + 1}`}
            loading={index === 0 ? 'eager' : 'lazy'}
            className="w-full h-full object-cover shrink-0 snap-center"
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
