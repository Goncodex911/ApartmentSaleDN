import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import { optionalAuthMiddleware } from '../../middlewares/rbac.js';
import { ShareController } from './share.controller.js';

const router = Router();

// Story 5.2: Tải ảnh đã watermark SĐT của CTV đăng nhập (mọi role)
router.get('/apartments/:id/photos.zip', authMiddleware, ShareController.downloadPhotosZip);
router.get('/apartments/:id/photos/:index', authMiddleware, ShareController.getPhoto);

// Story 5.3: Link xem phòng công khai
router.post('/links', authMiddleware, ShareController.createLink);
router.get('/public/:code', optionalAuthMiddleware, ShareController.getPublicListing);

export const shareRoutes = router;
