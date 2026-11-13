import React from 'react';
import { UploadCloud, Trash2, Loader2 } from 'lucide-react';
import { apartmentApi } from '../../api/apartmentApi.js';

interface PhotoUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  onError: (error: string | null) => void;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  images,
  onChange,
  onError,
}) => {
  const [uploading, setUploading] = React.useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      onError(null);
      const res = await apartmentApi.uploadMedia(Array.from(files));
      const uploadedUrls = res.data.map((item: any) => item.url);
      onChange([...images, ...uploadedUrls]);
    } catch (err: any) {
      onError(err.response?.data?.message || 'Lỗi tải ảnh lên Cloudinary');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    onChange(images.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-2">
      <label className="font-semibold text-slate-700 block">Hình ảnh căn hộ (Cloudinary)</label>
      <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50">
        <input
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
          id="cloudinary-upload-input"
        />
        <label htmlFor="cloudinary-upload-input" className="cursor-pointer block">
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-indigo-600">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs font-medium">Đang tải ảnh lên Cloudinary...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-slate-500">
              <UploadCloud className="w-7 h-7 text-indigo-500" />
              <span className="text-xs font-semibold text-slate-700">Bấm để chọn nhiều ảnh hoặc video</span>
              <span className="text-[11px] text-slate-400">Tự động nén và tải lên đám mây Cloudinary</span>
            </div>
          )}
        </label>
      </div>

      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto py-2">
          {images.map((url, idx) => (
            <div key={idx} className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-slate-200 group">
              <img src={url} alt={`img-${idx}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

