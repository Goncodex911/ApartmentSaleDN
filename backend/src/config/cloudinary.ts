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

export { cloudinary };
