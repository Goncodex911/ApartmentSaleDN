import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

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
export function signDirectUpload(folder: string) {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env;
  if (!cloudName || !apiKey || !apiSecret) throw { status: 503, message: 'Chưa cấu hình Cloudinary trên máy chủ' };
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, apiSecret);
  return { cloudName, apiKey, folder, timestamp, signature };
}

export { cloudinary };
