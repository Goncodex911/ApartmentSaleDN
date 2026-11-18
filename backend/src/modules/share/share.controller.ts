import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { asyncHandler } from '../../utils/async-handler.js';
import { ShareLinkService, SHARE_CODE_PATTERN } from './share-link.service.js';

const objectIdSchema = z.string().refine(isValidObjectId, 'Mã căn hộ không hợp lệ');
const createLinkSchema = z.object({ apartmentId: objectIdSchema });

export class ShareController {
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
