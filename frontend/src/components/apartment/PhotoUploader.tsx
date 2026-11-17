import React from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { apartmentApi } from '../../api/apartmentApi.js';

interface PhotoUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  onError: (error: string | null) => void;
}

// Tải ảnh/video căn hộ. Nút xóa luôn hiện (điện thoại không có rê chuột — Story 8.1)
export const PhotoUploader: React.FC<PhotoUploaderProps> = ({ images, onChange, onError }) => {
  const [uploading, setUploading] = React.useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      setUploading(true);
      onError(null);
      const res = await apartmentApi.uploadMedia(Array.from(files));
      onChange([...images, ...res.data.map((item: any) => item.url)]);
    } catch (err: any) {
      onError(err.response?.data?.message || 'Không tải được ảnh lên, vui lòng thử lại');
    } finally {
      setUploading(false);
      e.target.value = ''; // Cho phép chọn lại cùng file sau khi lỗi
    }
  };

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-900">Ảnh & video {images.length > 0 && <span className="font-normal text-slate-500">({images.length})</span>}</h3>
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        <label className={`w-24 h-24 shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 text-xs ${uploading ? 'opacity-60' : 'cursor-pointer hover:border-indigo-400'}`}>
          <input type="file" multiple accept="image/*,video/*" onChange={handleFileUpload} disabled={uploading} className="sr-only" />
          {uploading ? <Loader2 className="w-6 h-6 animate-spin text-indigo-600" /> : <ImagePlus className="w-6 h-6" />}
          {uploading ? 'Đang tải...' : 'Thêm ảnh'}
        </label>
        {images.map((url, idx) => (
          <div key={url} className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-slate-100">
            <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, i) => i !== idx))}
              aria-label={`Xóa ảnh ${idx + 1}`}
              className="absolute top-0 right-0 w-11 h-11 flex items-start justify-end p-1.5"
            >
              <span className="w-7 h-7 flex items-center justify-center rounded-full bg-black/60 text-white">
                <X className="w-4 h-4" />
              </span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
