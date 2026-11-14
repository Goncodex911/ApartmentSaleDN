import { Response, NextFunction } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { AuthRequest } from '../../middlewares/auth.js';
import { PhotoService } from './photo.service.js';
import { ShareLinkService, SHARE_CODE_PATTERN } from './share-link.service.js';

const objectIdSchema = z.string().refine(isValidObjectId, 'Mã căn hộ không hợp lệ');
const createLinkSchema = z.object({ apartmentId: objectIdSchema });
const photoIndexSchema = z.coerce.number().int('Số thứ tự ảnh không hợp lệ').min(0, 'Số thứ tự ảnh không hợp lệ');

export class ShareController {
  // GET /api/v1/share/apartments/:id/photos/:index — 1 ảnh đã watermark SĐT CTV (Story 5.2)
  static async getPhoto(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const apartmentId = objectIdSchema.parse(req.params.id);
      const index = photoIndexSchema.parse(req.params.index);
      const image = await PhotoService.getWatermarkedPhoto(apartmentId, index, req.user!.id);
      res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store' }).send(image);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/share/apartments/:id/photos.zip — toàn bộ ảnh đã watermark (Story 5.2)
  static async downloadPhotosZip(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const apartmentId = objectIdSchema.parse(req.params.id);
      const zip = await PhotoService.getWatermarkedZip(apartmentId, req.user!.id);
      res
        .set({
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="can-ho-${apartmentId}.zip"`,
          'Cache-Control': 'private, no-store',
        })
        .send(zip);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/share/links — tìm/tạo link xem phòng của CTV (Story 5.3)
  static async createLink(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { apartmentId } = createLinkSchema.parse(req.body);
      const data = await ShareLinkService.getOrCreateLink(apartmentId, req.user!.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/share/public/:code — trang xem phòng công khai, không cần đăng nhập (Story 5.3)
  static async getPublicListing(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = String(req.params.code);
      if (!SHARE_CODE_PATTERN.test(code)) throw { status: 404, message: 'Link không còn hiệu lực' };
      const data = await ShareLinkService.getPublicListing(code, req.user?.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
