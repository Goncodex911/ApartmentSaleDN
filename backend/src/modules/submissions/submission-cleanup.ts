import { ListingSubmission, SUBMISSION_MEDIA_FOLDER } from './submission.model.js';
import { Apartment } from '../apartments/apartment.model.js';
import { deleteCloudinaryMedia } from '../../config/cloudinary.js';

const RETENTION_DAYS = 30;

/**
 * Link Cloudinary → { loại, public_id }; chỉ nhận file trong thư mục ảnh tin CTV (không bao giờ xóa ảnh căn trong kho).
 * VD ".../image/upload/v1700000000/apartment_sale/submissions/abc.jpg" → { type: "image", id: "apartment_sale/submissions/abc" }
 */
export function parseSubmissionMedia(url: string): { type: 'image' | 'video'; id: string } | null {
  const match = url.match(/\/(image|video)\/upload\/(?:v\d+\/)?(.+?)\.[a-z0-9]+$/i);
  if (!match || !match[2].startsWith(`${SUBMISSION_MEDIA_FOLDER}/`)) return null;
  return { type: match[1].toLowerCase() as 'image' | 'video', id: match[2] };
}

/**
 * Dọn ảnh / video của tin bị từ chối hoặc đã rút quá 30 ngày (Story 8.6) để tiết kiệm dung lượng Cloudinary.
 * Giữ lại file vẫn được căn trong kho hoặc tin khác (chờ duyệt / đã duyệt) dùng. Chỉ đánh dấu, không xóa bản ghi tin.
 */
export async function cleanupSubmissionMedia(now = new Date()) {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const stale = await ListingSubmission.find({
    status: { $in: ['REJECTED', 'WITHDRAWN'] },
    updatedAt: { $lt: cutoff },
    mediaCleanedAt: { $exists: false },
  })
    .select('data.images data.videos')
    .limit(100)
    .lean();

  for (const submission of stale) {
    const urls = [...(submission.data.images || []), ...(submission.data.videos || [])];
    const [apartments, others] = await Promise.all([
      Apartment.find({ $or: [{ images: { $in: urls } }, { videos: { $in: urls } }] }).select('images videos').lean(),
      // Story 19.10: kiểm tra cả video (trước đây chỉ ảnh → video tin khác đang dùng có thể bị xóa khỏi Cloudinary)
      ListingSubmission.find({
        _id: { $ne: submission._id },
        status: { $in: ['PENDING', 'APPROVED'] },
        $or: [{ 'data.images': { $in: urls } }, { 'data.videos': { $in: urls } }],
      })
        .select('data.images data.videos')
        .lean(),
    ]);
    const inUse = new Set([
      ...apartments.flatMap((a) => [...a.images, ...(a.videos || [])]),
      ...others.flatMap((s) => [...(s.data.images || []), ...(s.data.videos || [])]),
    ]);
    const media = urls.filter((url) => !inUse.has(url)).map(parseSubmissionMedia).filter((item) => item !== null);

    await deleteCloudinaryMedia(media.filter((m) => m.type === 'image').map((m) => m.id), 'image');
    await deleteCloudinaryMedia(media.filter((m) => m.type === 'video').map((m) => m.id), 'video');
    await ListingSubmission.updateOne({ _id: submission._id }, { $set: { mediaCleanedAt: now } }, { timestamps: false });
  }
  return stale.length;
}
