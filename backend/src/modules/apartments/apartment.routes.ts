import { Router } from 'express';
import { ApartmentController } from './apartment.controller.js';
import { authMiddleware } from '../../middlewares/auth.js';
import { requireRoles, optionalAuthMiddleware } from '../../middlewares/rbac.js';

const router = Router();

// 1. Routes công khai hoặc CTV đọc (có tự động mask thông tin theo role)
router.get('/', optionalAuthMiddleware, ApartmentController.getAll);
router.get('/:id', optionalAuthMiddleware, ApartmentController.getById);

// 2. Routes chỉ dành riêng cho Quản lý / Admin (RBAC Protected)
router.post('/', authMiddleware, requireRoles('ADMIN', 'MANAGER'), ApartmentController.create);
router.delete('/:id', authMiddleware, requireRoles('ADMIN', 'MANAGER'), ApartmentController.delete);

export const apartmentRoutes = router;

