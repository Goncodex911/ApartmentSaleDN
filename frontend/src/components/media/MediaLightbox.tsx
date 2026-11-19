import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Play, X } from 'lucide-react';
import { useLightboxGestures } from '../../hooks/useLightboxGestures.js';
import { downloadSizeUrl, thumbSizeUrl } from '../../utils/cloudinaryImage.js';
import { isVideoUrl, videoPoster } from '../../utils/media.js';

interface MediaLightboxProps {
  items: string[]; // Ảnh trước, video sau (nhận diện video theo link — Story 10.2)
  startIndex: number;
  title: string;
  onClose: () => void;
}

// Cloudinary tự tải về (không mở tab ảnh) khi có fl_attachment
const attachmentUrl = (url: string) => downloadSizeUrl(url).replace('/image/upload/', '/image/upload/fl_attachment/');

/**
 * Trình xem ảnh / video toàn màn hình (Story 12.4) — tải riêng khi mở (React.lazy).
 * Nền đen che hết thanh trên, menu đáy, thanh liên hệ; đóng bằng X, Esc, nút Back (history) hoặc vuốt dọc xuống.
 */
const MediaLightbox: React.FC<MediaLightboxProps> = ({ items, startIndex, title, onClose }) => {
  const [index, setIndex] = useState(startIndex);
  const [playing, setPlaying] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const indexRef = useRef(index);
  indexRef.current = index;

  const onCloseRef = useRef(onClose); // Nơi dùng truyền hàm viết thẳng → giữ trong ref để effect chỉ chạy 1 lần
  onCloseRef.current = onClose;

  // Nút Back của Android / cử chỉ quay lại đóng trình xem thay vì rời trang
  const close = () => (window.history.state?.lightbox ? window.history.back() : onCloseRef.current());
  useEffect(() => {
    window.history.pushState({ ...window.history.state, lightbox: true }, '');
    const onPop = () => onCloseRef.current();
    window.addEventListener('popstate', onPop);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // Khoá cuộn trang bên dưới
    return () => {
      window.removeEventListener('popstate', onPop);
      document.body.style.overflow = overflow;
    };
  }, []);

  const { handlers, goTo } = useLightboxGestures({
    count: items.length,
    index,
    setIndex,
    onClose: close,
    trackRef,
    stageRef,
    zoomTarget: () => slideRefs.current[indexRef.current],
  });

  // Vị trí dải ảnh đặt thẳng lên DOM (không qua style React) → lò xo không bị React ghi đè giữa chừng
  useLayoutEffect(() => {
    if (trackRef.current) trackRef.current.style.transform = `translate3d(${-startIndex * window.innerWidth}px, 0, 0)`;
  }, [startIndex]);

  useEffect(() => {
    setPlaying(null); // Vuốt sang ảnh khác → video đang phát dừng
    document.getElementById(`lb-thumb-${index}`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') goTo(indexRef.current + 1);
      if (e.key === 'ArrowLeft') goTo(indexRef.current - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index]); // goTo / close đọc index mới qua ref + render hiện tại

  const current = items[index];

  return createPortal(
    <div ref={stageRef} role="dialog" aria-modal="true" aria-label={`Ảnh ${title}`} className="fixed inset-0 z-[80] bg-black/95 select-none" style={{ top: 0 }}>
      {/* Thanh trên trong suốt: lớp bóng giúp chữ trắng đọc được trên ảnh sáng */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 px-2 pt-[env(safe-area-inset-top)] h-[calc(56px+env(safe-area-inset-top))] bg-gradient-to-b from-black/70 to-transparent text-white">
        <button type="button" onClick={close} aria-label="Đóng" className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10">
          <X className="w-6 h-6" />
        </button>
        <p className="text-sm font-semibold tabular-nums" aria-live="polite">{index + 1}/{items.length}</p>
        {isVideoUrl(current) ? (
          <span className="w-11" aria-hidden />
        ) : (
          <a href={attachmentUrl(current)} download aria-label="Tải ảnh này" className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10">
            <Download className="w-5 h-5" />
          </a>
        )}
      </div>

      <div className="absolute inset-0 overflow-hidden touch-none" {...handlers}>
        <div ref={trackRef} className="flex h-full will-change-transform">
          {items.map((url, i) => (
            <div key={url} className="w-screen h-full shrink-0 flex items-center justify-center overflow-hidden">
              {isVideoUrl(url) ? (
                playing === url ? (
                  <video src={url} controls autoPlay playsInline className="max-w-full max-h-full" />
                ) : (
                  <button type="button" onClick={() => setPlaying(url)} aria-label="Phát video" className="relative max-w-full max-h-full">
                    <img src={videoPoster(url)} alt="" className="max-w-full max-h-[80vh] object-contain" draggable={false} />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-16 h-16 flex items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg"><Play className="w-7 h-7 ml-1" /></span>
                    </span>
                  </button>
                )
              ) : (
                <img
                  ref={(el) => (slideRefs.current[i] = el)}
                  src={downloadSizeUrl(url)}
                  alt={`${title} - ảnh ${i + 1}`}
                  loading={Math.abs(i - startIndex) <= 1 ? 'eager' : 'lazy'}
                  draggable={false}
                  className="max-w-full max-h-full object-contain will-change-transform"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {items.length > 1 && (
        <div className="absolute inset-x-0 bottom-0 z-10 pb-[calc(8px+env(safe-area-inset-bottom))] pt-6 bg-gradient-to-t from-black/70 to-transparent">
          <div className="flex gap-2 px-3 overflow-x-auto scrollbar-none">
            {items.map((url, i) => (
              <button
                key={url}
                id={`lb-thumb-${i}`}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Xem ảnh ${i + 1}`}
                aria-current={i === index}
                className={`relative w-14 h-11 shrink-0 rounded-lg overflow-hidden ring-2 transition-opacity ${i === index ? 'ring-white opacity-100' : 'ring-transparent opacity-60'}`}
              >
                <img src={isVideoUrl(url) ? videoPoster(url) : thumbSizeUrl(url)} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} />
                {isVideoUrl(url) && <Play className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow" aria-hidden />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default MediaLightbox;
