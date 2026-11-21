import { Router } from 'express';
import { ApartmentController } from './apartment.controller.js';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.js';
import { rateLimit } from '../../middlewares/rate-limit.js';
import { requireRoles } from '../../middlewares/rbac.js';
import { uploadMiddleware } from '../../middlewares/upload.js';
import { searchRoutes } from '../search/search.routes.js';

const router = Router();

// 1. Upload ảnh & video lên Cloudinary — CTV được tải ảnh cho tin đăng chờ duyệt (Story 8.6), giới hạn 6 lần × 10 file / giờ
const ctvUploadLimit = rateLimit({
  windowMs: 60 * 60_000,
  max: 6,
  message: 'Bạn tải ảnh quá nhiều, vui lòng thử lại sau 1 giờ',
  key: (req) => (req as AuthRequest).user!.id,
});
router.post(
  '/upload-media',
  authMiddleware,
  requireRoles('ADMIN', 'MANAGER', 'COLLABORATOR'),
  (req: AuthRequest, res, next) => (req.user!.role === 'COLLABORATOR' ? ctvUploadLimit(req, res, next) : next()),
  uploadMiddleware.array('media', 10),
  ApartmentController.uploadMedia
);

// 1b. Story 10.2: chữ ký tải thẳng lên Cloudinary — cùng quyền & giới hạn CTV như /upload-media
router.post(
  '/upload-signature',
  authMiddleware,
  requireRoles('ADMIN', 'MANAGER', 'COLLABORATOR'),
  (req: AuthRequest, res, next) => (req.user!.role === 'COLLABORATOR' ? ctvUploadLimit(req, res, next) : next()),
  ApartmentController.uploadSignature
);

// 2. Kiểm tra căn hộ nghi trùng (Story 13.10 — CTV & Quản lý)
router.post(
  '/check-duplicate',
  authMiddleware,
  requireRoles('ADMIN', 'MANAGER', 'COLLABORATOR'),
  ApartmentController.checkDuplicate
);

// 2b. Map QA & Căn chỉnh vị trí bản đồ (Story 17.6 — Chỉ Quản lý / Admin)
router.get('/admin/map-qa/pending', authMiddleware, requireRoles('ADMIN', 'MANAGER'), ApartmentController.getMapQAPending);
router.patch('/:id/calibrate-location', authMiddleware, requireRoles('ADMIN', 'MANAGER'), ApartmentController.calibrateLocation);

// 3. Thao tác CRUD Căn hộ (Chỉ Manager / Admin)
router.post('/', authMiddleware, requireRoles('ADMIN', 'MANAGER'), ApartmentController.create);
router.put('/:id', authMiddleware, requireRoles('ADMIN', 'MANAGER'), ApartmentController.update);
router.patch('/:id/status', authMiddleware, requireRoles('ADMIN', 'MANAGER'), ApartmentController.updateStatus);
router.patch('/:id/lease/renew', authMiddleware, requireRoles('ADMIN', 'MANAGER'), ApartmentController.renewLease);
router.delete('/:id', authMiddleware, requireRoles('ADMIN', 'MANAGER'), ApartmentController.delete);

// 3. Quản lý Nguồn tham chiếu (Sub-listings - Story 2.3)
router.post('/:id/sub-listings', authMiddleware, requireRoles('ADMIN', 'MANAGER'), ApartmentController.addSubListing);
router.delete(
  '/:id/sub-listings/:subId',
  authMiddleware,
  requireRoles('ADMIN', 'MANAGER'),
  ApartmentController.removeSubListing
);

// 4. Tra cứu kho — bắt buộc đăng nhập (Story 14.4); dữ liệu che theo vai trò (Data Masking)
router.use('/search', searchRoutes);
router.get('/', authMiddleware, ApartmentController.getAll);
router.get('/:id', authMiddleware, ApartmentController.getById);

export const apartmentRoutes = router;
