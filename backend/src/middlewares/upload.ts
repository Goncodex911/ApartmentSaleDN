import multer from 'multer';

// Sử dụng memoryStorage để lưu file tạm vào RAM dạng Buffer, sau đó stream thẳng lên Cloudinary
const storage = multer.memoryStorage();

// Bộ lọc định dạng file: Chỉ chấp nhận ảnh và video
const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error('Chỉ chấp nhận file định dạng hình ảnh hoặc video'), { status: 400 }));
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // Tối đa 25MB cho mỗi file
    files: 10,                  // Tối đa 10 files một lần upload
  },
});

