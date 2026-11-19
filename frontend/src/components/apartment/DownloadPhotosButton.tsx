import React, { useState } from 'react';
import { Download, Loader2, Share2 } from 'lucide-react';
import { downloadSizeUrl } from '../../utils/cloudinaryImage.js';
import { createZip } from '../../utils/zip.js';
import { isTouchDevice } from '../../utils/device.js';
import { tapFeedback } from '../../utils/haptics.js';

interface DownloadPhotosButtonProps {
  photos: string[]; // Ảnh được phép gửi khách (đã trừ ảnh có SĐT nguồn cũ và video)
  fileName: string; // Tên file zip trên máy tính
  compact?: boolean; // Story 12.6: nút gọn trên thanh hành động (rộng theo chữ, cao 48px)
}

const PARALLEL = 4;

// Điện thoại có bảng chia sẻ file → lưu thẳng vào Thư viện ảnh; máy tính → tải ZIP
const prefersShareSheet = () => {
  try {
    const probe = new File([''], 'probe.jpg', { type: 'image/jpeg' });
    return isTouchDevice() && Boolean(navigator.canShare?.({ files: [probe] }));
  } catch {
    return false;
  }
};

const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Tải ảnh gửi khách (Story 10.3): tải THẲNG từ Cloudinary (cỡ 1600px), KHÔNG còn in SĐT lên ảnh và không qua server
 * → nhanh hơn nhiều. Ảnh lỗi thì bỏ qua, các ảnh khác vẫn tải.
 */
export const DownloadPhotosButton: React.FC<DownloadPhotosButtonProps> = ({ photos, fileName, compact }) => {
  const size = compact ? 'h-12 px-3 shrink-0' : 'w-full h-11 px-3';
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [preparedCount, setPreparedCount] = useState(0);
  const [files, setFiles] = useState<File[]>([]);

  const handlePrepare = async () => {
    setStatus('loading');
    setPreparedCount(0);
    const results: File[] = [];
    const queue = photos.map((url, index) => ({ url, index }));
    await Promise.all(
      Array.from({ length: PARALLEL }, async () => {
        for (let job = queue.shift(); job; job = queue.shift()) {
          try {
            const res = await fetch(downloadSizeUrl(job.url));
            if (!res.ok) continue;
            results[job.index] = new File([await res.blob()], `anh-${job.index + 1}.jpg`, { type: 'image/jpeg' });
            setPreparedCount((count) => count + 1);
          } catch {
            // Ảnh lỗi → bỏ qua
          }
        }
      })
    );
    const readyFiles = results.filter(Boolean); // Giữ đúng thứ tự ảnh
    if (!readyFiles.length) return setStatus('error');

    if (prefersShareSheet()) {
      setFiles(readyFiles);
      setStatus('ready'); // iOS chỉ mở bảng chia sẻ trong 1 lần chạm riêng → hiện nút "Lưu N ảnh"
      return;
    }
    const entries = await Promise.all(readyFiles.map(async (file) => ({ name: file.name, data: new Uint8Array(await file.arrayBuffer()) })));
    saveBlob(createZip(entries), `${fileName}.zip`);
    setStatus('idle');
  };

  const handleShare = async () => {
    try {
      await navigator.share({ files });
      tapFeedback();
    } catch {
      // Người dùng đóng bảng chia sẻ — giữ nguyên ảnh để chia sẻ lại
    }
  };

  if (photos.length === 0) return null;

  if (status === 'ready') {
    return (
      <button type="button" onClick={handleShare} className={`${size} flex items-center justify-center gap-1.5 text-sm font-medium rounded-xl bg-emerald-700 text-white hover:bg-emerald-800`}>
        <Share2 className="w-4 h-4" /> Lưu {files.length} ảnh
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handlePrepare}
      disabled={status === 'loading'}
      className={`${size} flex items-center justify-center gap-1.5 text-sm font-medium rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:opacity-60`}
    >
      {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {status === 'loading' ? `${preparedCount}/${photos.length}` : status === 'error' ? 'Thử lại' : 'Tải ảnh'}
    </button>
  );
};
