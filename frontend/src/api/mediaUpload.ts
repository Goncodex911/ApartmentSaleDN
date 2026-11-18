import { apiClient } from './client.js';

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  folder: string;
  timestamp: number;
  signature: string;
}

// Giới hạn gói Cloudinary miễn phí — kiểm tra trước khi tải để báo lỗi ngay, không tốn 4G
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Kiểm tra file trước khi tải; trả về câu báo lỗi hoặc null. */
export function checkMediaFile(file: File): string | null {
  const isVideo = file.type.startsWith('video/');
  if (!isVideo && !file.type.startsWith('image/')) return `"${file.name}" không phải ảnh hoặc video`;
  if (isVideo && file.size > MAX_VIDEO_BYTES) return `Video "${file.name}" quá 100MB`;
  if (!isVideo && file.size > MAX_IMAGE_BYTES) return `Ảnh "${file.name}" quá 10MB`;
  return null;
}

/** Xin chữ ký tải lên (server ký, cố định thư mục theo vai trò). Dùng chung cho cả lượt chọn file. */
export const getUploadSignature = async (): Promise<UploadSignature> => (await apiClient.post('/apartments/upload-signature')).data.data;

/**
 * Story 10.2: tải 1 file THẲNG lên Cloudinary (không qua Netlify / Render) — XMLHttpRequest để có tiến độ %.
 * Trả về link https và loại file ("image" | "video").
 */
export function uploadToCloudinary(file: File, sig: UploadSignature, onProgress: (percent: number) => void) {
  return new Promise<{ url: string; type: 'image' | 'video' }>((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sig.apiKey);
    form.append('folder', sig.folder);
    form.append('timestamp', String(sig.timestamp));
    form.append('signature', sig.signature);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      const body = JSON.parse(xhr.responseText || '{}');
      if (xhr.status >= 200 && xhr.status < 300) resolve({ url: body.secure_url, type: body.resource_type === 'video' ? 'video' : 'image' });
      else reject(new Error(body.error?.message || `Tải "${file.name}" thất bại`));
    };
    xhr.onerror = () => reject(new Error(`Mất kết nối khi tải "${file.name}"`));
    xhr.send(form);
  });
}
