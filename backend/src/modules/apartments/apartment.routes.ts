import { Router } from 'express';
import { ApartmentController } from './apartment.controller.js';
import { authMiddleware } from '../../middlewares/auth.js';
import { requireRoles, optionalAuthMiddleware } from '../../middlewares/rbac.js';
import { uploadMiddleware } from '../../middlewares/upload.js';
import { searchRoutes } from '../search/search.routes.js';

const router = Router();

// 1. Upload ảnh & video lên Cloudinary (Chỉ Manager / Admin)
router.post(
  '/upload-media',
  authMiddleware,
  requireRoles('ADMIN', 'MANAGER'),
  uploadMiddleware.array('media', 10),
  ApartmentController.uploadMedia
);

// 2. Thao tác CRUD Căn hộ (Chỉ Manager / Admin)
router.post('/', authMiddleware, requireRoles('ADMIN', 'MANAGER'), ApartmentController.create);
router.put('/:id', authMiddleware, requireRoles('ADMIN', 'MANAGER'), ApartmentController.update);
router.patch('/:id/status', authMiddleware, requireRoles('ADMIN', 'MANAGER'), ApartmentController.updateStatus);
router.delete('/:id', authMiddleware, requireRoles('ADMIN', 'MANAGER'), ApartmentController.delete);

// 3. Quản lý Nguồn tham chiếu (Sub-listings - Story 2.3)
router.post('/:id/sub-listings', authMiddleware, requireRoles('ADMIN', 'MANAGER'), ApartmentController.addSubListing);
router.delete(
  '/:id/sub-listings/:subId',
  authMiddleware,
  requireRoles('ADMIN', 'MANAGER'),
  ApartmentController.removeSubListing
);

// 4. Tra cứu công khai hoặc theo quyền hạn CTV (kèm Data Masking)
router.use('/search', searchRoutes);
router.get('/', optionalAuthMiddleware, ApartmentController.getAll);
router.get('/:id', optionalAuthMiddleware, ApartmentController.getById);

export const apartmentRoutes = router;
