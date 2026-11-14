import React, { useState } from 'react';
import { shareApi } from '../../api/shareApi.js';
import { Download, Loader2, Share2 } from 'lucide-react';

interface DownloadPhotosButtonProps {
  apartmentId: string;
  photoCount: number; // Số ảnh được phép gửi khách (đã trừ ảnh có SĐT nguồn cũ)
}

// Điện thoại có bảng chia sẻ file → lưu thẳng vào Thư viện ảnh; máy tính → tải ZIP
const prefersShareSheet = () => {
  try {
    const probe = new File([''], 'probe.jpg', { type: 'image/jpeg' });
    return window.matchMedia('(pointer: coarse)').matches && Boolean(navigator.canShare?.({ files: [probe] }));
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

export const DownloadPhotosButton: React.FC<DownloadPhotosButtonProps> = ({ apartmentId, photoCount }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [preparedCount, setPreparedCount] = useState(0);
  const [files, setFiles] = useState<File[]>([]);

  const handlePrepare = async () => {
    setStatus('loading');
    setPreparedCount(0);
    try {
      if (!prefersShareSheet()) {
        saveBlob(await shareApi.downloadPhotosZip(apartmentId), `can-ho-${apartmentId}.zip`);
        setStatus('idle');
        return;
      }

      // Tải từng ảnh đã watermark; ảnh lỗi thì bỏ qua
      const results = await Promise.allSettled(
        Array.from({ length: photoCount }, async (_, index) => {
          const blob = await shareApi.getWatermarkedPhoto(apartmentId, index);
          setPreparedCount((count) => count + 1);
          return new File([blob], `anh-${index + 1}.jpg`, { type: 'image/jpeg' });
        })
      );
      const readyFiles = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
      if (readyFiles.length === 0) throw new Error('Không tải được ảnh nào');
      setFiles(readyFiles);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  // Lần chạm thứ 2: iOS chỉ mở bảng chia sẻ khi gọi trực tiếp trong sự kiện chạm
  const handleShare = async () => {
    try {
      await navigator.share({ files });
    } catch {
      // Người dùng đóng bảng chia sẻ — giữ nguyên ảnh để chia sẻ lại
    }
  };

  if (photoCount === 0) return null;

  if (status === 'ready') {
    return (
      <button type="button" onClick={handleShare} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
        <Share2 className="w-4 h-4" /> Lưu / Gửi {files.length} ảnh
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handlePrepare}
      disabled={status === 'loading'}
      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-60"
    >
      {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {status === 'loading'
        ? `Đang chuẩn bị ảnh ${preparedCount}/${photoCount}...`
        : status === 'error'
          ? 'Lỗi tải ảnh — thử lại'
          : `Tải toàn bộ ảnh (${photoCount})`}
    </button>
  );
};
