import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.js';
import { requireRoles } from '../../middlewares/rbac.js';
import { rateLimit } from '../../middlewares/rate-limit.js';
import { ListingReportController } from './listing-report.controller.js';

const router = Router();
// Chống báo lỗi bừa: tối đa 10 lần / giờ / tài khoản
const reportLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: 'Bạn báo lỗi quá nhiều, thử lại sau', key: (req) => (req as AuthRequest).user!.id });
const managers = requireRoles('ADMIN', 'MANAGER');

router.use(authMiddleware);
router.get('/', managers, ListingReportController.queue);
router.post('/:apartmentId', reportLimit, ListingReportController.create);
router.get('/:apartmentId', managers, ListingReportController.listForApartment);
router.post('/:apartmentId/resolve', managers, ListingReportController.resolve);

export const listingReportRoutes = router;
