import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import { randomCode } from '../utils/random-code.js';

// .env đã được nạp từ config/env.ts trước mọi module; đọc cấu hình lúc upload để luôn lấy giá trị mới nhất
function initCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * Tải file từ Buffer lên Cloudinary bằng native Node.js Stream
 * Áp dụng triết lý Ponytail: Dùng Readable.from() native của Node.js, không cài thêm thư viện phụ
 */
export function uploadBufferToCloudinary(
  buffer: Buffer,
  folder = 'apartment_sale/apartments',
  resourceType: 'image' | 'video' | 'auto' = 'auto'
): Promise<UploadApiResponse> {
  initCloudinary();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Upload lên Cloudinary thất bại'));
        }
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}

/** Xóa file trên Cloudinary theo public_id (dọn ảnh tin CTV bị từ chối / rút — Story 8.6). */
export async function deleteCloudinaryMedia(publicIds: string[], resourceType: 'image' | 'video') {
  if (publicIds.length === 0) return;
  initCloudinary();
  await cloudinary.api.delete_resources(publicIds, { resource_type: resourceType });
}

/**
 * Chữ ký để điện thoại tải ảnh / video THẲNG lên Cloudinary (Story 10.2) — không đi qua Netlify proxy (ngắt sau ~26 giây)
 * và Render (giới hạn 25MB). Chữ ký cố định thư mục, Cloudinary chỉ chấp nhận trong ~1 giờ. KHÔNG bao giờ trả api_secret.
 */
// Chỉ cho tải ảnh & video (ký kèm vào chữ ký) — không có thì chữ ký còn hạn dùng tải được mọi loại file (HTML, PDF...)
const ALLOWED_FORMATS = 'jpg,jpeg,png,webp,gif,heic,heif,mp4,mov,m4v,webm,3gp';

/**
 * Story 14.5: mỗi chữ ký chỉ tải được ĐÚNG 1 file — ký kèm public_id ngẫu nhiên + overwrite=false
 * (dùng lại chữ ký không tạo thêm file) → giới hạn số lượt tải của CTV có tác dụng thật.
 */
export function signDirectUploads(folder: string, count: number) {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env;
  if (!cloudName || !apiKey || !apiSecret) throw { status: 503, message: 'Chưa cấu hình Cloudinary trên máy chủ' };
  const timestamp = Math.round(Date.now() / 1000);
  return Array.from({ length: count }, () => {
    const publicId = randomCode(20);
    const params = { allowed_formats: ALLOWED_FORMATS, folder, overwrite: false, public_id: publicId, timestamp };
    return { cloudName, apiKey, folder, timestamp, publicId, signature: cloudinary.utils.api_sign_request(params, apiSecret), allowedFormats: ALLOWED_FORMATS };
  });
}

export { cloudinary };
