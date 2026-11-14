import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { asyncHandler } from '../../utils/async-handler.js';
import { PhotoService } from './photo.service.js';
import { ShareLinkService, SHARE_CODE_PATTERN } from './share-link.service.js';

const objectIdSchema = z.string().refine(isValidObjectId, 'Mã căn hộ không hợp lệ');
const createLinkSchema = z.object({ apartmentId: objectIdSchema });
const photoIndexSchema = z.coerce.number().int('Số thứ tự ảnh không hợp lệ').min(0, 'Số thứ tự ảnh không hợp lệ');
const NO_STORE = { 'Cache-Control': 'private, no-store' };

export class ShareController {
  // GET /api/v1/share/apartments/:id/photos/:index — 1 ảnh đã watermark SĐT CTV (Story 5.2)
  static getPhoto = asyncHandler(async (req, res) => {
    const apartmentId = objectIdSchema.parse(req.params.id);
    const index = photoIndexSchema.parse(req.params.index);
    const image = await PhotoService.getWatermarkedPhoto(apartmentId, index, req.user!.id);
    res.set({ 'Content-Type': 'image/jpeg', ...NO_STORE }).send(image);
  });

  // GET /api/v1/share/apartments/:id/photos.zip — toàn bộ ảnh đã watermark (Story 5.2)
  static downloadPhotosZip = asyncHandler(async (req, res) => {
    const apartmentId = objectIdSchema.parse(req.params.id);
    const zip = await PhotoService.getWatermarkedZip(apartmentId, req.user!.id);
    res
      .set({ 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="can-ho-${apartmentId}.zip"`, ...NO_STORE })
      .send(zip);
  });

  // POST /api/v1/share/links — tìm/tạo link xem phòng của CTV (Story 5.3)
  static createLink = asyncHandler(async (req, res) => {
    const { apartmentId } = createLinkSchema.parse(req.body);
    res.status(200).json({ success: true, data: await ShareLinkService.getOrCreateLink(apartmentId, req.user!.id) });
  });

  // GET /api/v1/share/public/:code — trang xem phòng công khai, không cần đăng nhập (Story 5.3)
  static getPublicListing = asyncHandler(async (req, res) => {
    const code = String(req.params.code);
    if (!SHARE_CODE_PATTERN.test(code)) throw { status: 404, message: 'Link không còn hiệu lực' };
    res.status(200).json({ success: true, data: await ShareLinkService.getPublicListing(code, req.user?.id) });
  });
}
