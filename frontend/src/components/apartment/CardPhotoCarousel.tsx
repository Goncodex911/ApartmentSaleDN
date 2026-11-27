import React, { useState } from 'react';
import { Camera, ImageOff, Video } from 'lucide-react';
import { cardSizeUrl } from '../../utils/cloudinaryImage.js';
import { imageCors } from '../../utils/offlineCache.js';

const MAX_SLIDES = 5;

/**
 * Vuốt ảnh ngay trên thẻ căn (Story 12.2) — CSS scroll-snap, không thư viện. Trình duyệt tự không phát "click"
 * sau khi vuốt cuộn → vuốt không mở chi tiết, chạm mới mở. Chỉ ảnh đầu tải ngay, ảnh sau tải khi vuốt tới.
 * Khung 4:3 có kích thước cố định từ đầu → không giật bố cục khi ảnh về.
 */
export const CardPhotoCarousel: React.FC<{ photos: string[]; videoCount: number; title: string; onPhotoTap?: (index: number) => void }> = ({
  photos,
  videoCount,
  title,
  onPhotoTap,
}) => {
  const [index, setIndex] = useState(0);
  // Chỉ gắn link cho ảnh đã / sắp xem (Chrome vẫn tải sớm ảnh lazy trong vùng đệm cuộn ngang) → tiết kiệm 4G
  const [reach, setReach] = useState(0);
  const slides = photos.slice(0, MAX_SLIDES);
  const prefetchNext = (at: number) => setReach((current) => Math.max(current, at + 1)); // Chạm vào ảnh → tải sẵn ảnh kế tiếp

  return (
    <div className="relative aspect-[4/3] bg-slate-100">
      {slides.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center gap-1 text-slate-500 text-sm">
          <ImageOff className="w-7 h-7" aria-hidden /> Chưa có ảnh
        </div>
      ) : (
        <div
          className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-none overscroll-x-contain"
          onPointerDown={() => prefetchNext(index)}
          onScroll={(e) => {
            const at = Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth);
            setIndex(at);
            prefetchNext(at);
          }}
        >
          {slides.map((src, i) => (
            <img
              key={src}
              src={i <= reach ? cardSizeUrl(src) : undefined}
              alt={i === 0 ? title : ''}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
              crossOrigin={imageCors(src)}
              // Story 20.8: chạm ảnh → xem toàn màn hình (không mở chi tiết); vuốt cuộn không phát click nên không mở nhầm
              onClick={
                onPhotoTap &&
                ((e) => {
                  e.stopPropagation();
                  onPhotoTap(i);
                })
              }
              className="w-full h-full shrink-0 snap-center object-cover"
            />
          ))}
        </div>
      )}

      {/* Số ảnh / video: CTV biết bài có đủ tư liệu gửi khách không */}
      {(photos.length > 0 || videoCount > 0) && (
        <span className="absolute left-2 bottom-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs font-semibold backdrop-blur-sm">
          <Camera className="w-3.5 h-3.5" aria-hidden /> {photos.length}
          {videoCount > 0 && (
            <>
              <span aria-hidden>·</span> <Video className="w-3.5 h-3.5" aria-hidden /> {videoCount}
            </>
          )}
          <span className="sr-only"> ảnh{videoCount > 0 ? `, ${videoCount} video` : ''}</span>
        </span>
      )}

      {slides.length > 1 && (
        <div className="absolute bottom-2.5 inset-x-0 flex justify-center gap-1.5 pointer-events-none" aria-hidden>
          {slides.map((src, i) => (
            <span key={src} className={`h-1.5 rounded-full bg-white shadow transition-all duration-200 motion-reduce:transition-none ${i === index ? 'w-4 opacity-100' : 'w-1.5 opacity-60'}`} />
          ))}
        </div>
      )}
    </div>
  );
};
