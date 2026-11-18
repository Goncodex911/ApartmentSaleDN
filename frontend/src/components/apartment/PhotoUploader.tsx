import React, { useState } from 'react';
import { ImagePlus, Play, X } from 'lucide-react';
import { checkMediaFile, getUploadSignature, uploadToCloudinary } from '../../api/mediaUpload.js';
import { videoPoster } from '../../utils/media.js';

export interface MediaValue {
  images: string[];
  videos: string[];
}

interface PhotoUploaderProps {
  value: MediaValue;
  onChange: (next: MediaValue) => void;
  onError: (error: string | null) => void;
}

type Pending = { id: string; name: string; percent: number };
const PARALLEL = 2; // Tải 2 file cùng lúc — đủ nhanh mà không nghẽn 4G

/**
 * Ảnh & video căn hộ (Story 8.1 + 10.2): tải THẲNG lên Cloudinary, mỗi file 1 ô tiến độ %;
 * ảnh vào `images`, video vào `videos`. Nút xóa luôn hiện (điện thoại không có rê chuột).
 */
export const PhotoUploader: React.FC<PhotoUploaderProps> = ({ value, onChange, onError }) => {
  const [pending, setPending] = useState<Pending[]>([]);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // Cho phép chọn lại cùng file
    if (!files.length) return;
    const invalid = files.map(checkMediaFile).filter(Boolean);
    const valid = files.filter((file) => !checkMediaFile(file));
    onError(invalid.length ? invalid.join('. ') : null);
    if (!valid.length) return;

    const jobs = valid.map((file, i) => ({ file, id: `${Date.now()}-${i}` }));
    setPending((list) => [...list, ...jobs.map(({ id, file }) => ({ id, name: file.name, percent: 0 }))]);
    const done = (id: string) => setPending((list) => list.filter((p) => p.id !== id));

    try {
      const sig = await getUploadSignature();
      const uploaded: MediaValue = { images: [], videos: [] };
      const failed: string[] = [];
      // Hàng đợi đơn giản: PARALLEL "luồng" lần lượt lấy file kế tiếp
      const queue = [...jobs];
      await Promise.all(
        Array.from({ length: PARALLEL }, async () => {
          for (let job = queue.shift(); job; job = queue.shift()) {
            const { id, file } = job;
            try {
              const result = await uploadToCloudinary(file, sig, (percent) =>
                setPending((list) => list.map((p) => (p.id === id ? { ...p, percent } : p)))
              );
              uploaded[result.type === 'video' ? 'videos' : 'images'].push(result.url);
            } catch (err) {
              failed.push((err as Error).message); // 1 file lỗi không làm hỏng các file khác
            } finally {
              done(id);
            }
          }
        })
      );
      onChange({ images: [...value.images, ...uploaded.images], videos: [...value.videos, ...uploaded.videos] });
      if (failed.length) onError(failed.join('. '));
    } catch (err: any) {
      jobs.forEach(({ id }) => done(id));
      onError(err.response?.data?.message || 'Không tải được ảnh / video lên, vui lòng thử lại');
    }
  };

  const remove = (kind: keyof MediaValue, url: string) => onChange({ ...value, [kind]: value[kind].filter((u) => u !== url) });
  const tiles = [
    ...value.images.map((url) => ({ url, kind: 'images' as const })),
    ...value.videos.map((url) => ({ url, kind: 'videos' as const })),
  ];
  const total = tiles.length;

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-900">
        Ảnh & video {total > 0 && <span className="font-normal text-slate-500">({value.images.length} ảnh{value.videos.length ? ` · ${value.videos.length} video` : ''})</span>}
      </h3>
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        <label className="w-24 h-24 shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 text-xs cursor-pointer hover:border-indigo-400">
          <input type="file" multiple accept="image/*,video/*" onChange={handleFiles} className="sr-only" />
          <ImagePlus className="w-6 h-6" />
          Thêm ảnh / video
        </label>
        {pending.map((p) => (
          <div key={p.id} className="relative w-24 h-24 shrink-0 rounded-xl bg-slate-100 flex flex-col items-center justify-center gap-1 px-2" aria-label={`Đang tải ${p.name}`}>
            <span className="text-sm font-semibold text-indigo-700">{p.percent}%</span>
            <span className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <span className="block h-full bg-indigo-600 transition-[width]" style={{ width: `${p.percent}%` }} />
            </span>
            <span className="w-full text-[10px] text-slate-500 truncate text-center">{p.name}</span>
          </div>
        ))}
        {tiles.map(({ url, kind }, idx) => (
          <div key={url} className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-slate-800">
            {kind === 'images' ? (
              <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
            ) : (
              <>
                {videoPoster(url) && <img src={videoPoster(url)} alt="" className="w-full h-full object-cover opacity-80" />}
                <Play className="absolute inset-0 m-auto w-8 h-8 text-white drop-shadow" aria-label="Video" />
              </>
            )}
            <button
              type="button"
              onClick={() => remove(kind, url)}
              aria-label={`Xóa ${kind === 'images' ? 'ảnh' : 'video'} ${idx + 1}`}
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
