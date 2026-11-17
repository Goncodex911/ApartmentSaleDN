import { Router } from 'express';
import { SubmissionController } from './submission.controller.js';
import { authMiddleware } from '../../middlewares/auth.js';
import { requireRoles } from '../../middlewares/rbac.js';

// /api/v1/submissions — CTV đăng tin, Quản lý duyệt (Story 8.6)
const router = Router();
const ctvOnly = [authMiddleware, requireRoles('COLLABORATOR')];
const managerOnly = [authMiddleware, requireRoles('ADMIN', 'MANAGER')];
const anyRole = [authMiddleware, requireRoles('ADMIN', 'MANAGER', 'COLLABORATOR')];

router.post('/', ...ctvOnly, SubmissionController.create);
router.get('/mine', ...ctvOnly, SubmissionController.listMine);
router.post('/:id/withdraw', ...ctvOnly, SubmissionController.withdraw);

router.get('/pending-count', ...managerOnly, SubmissionController.pendingCount);
router.get('/', ...managerOnly, SubmissionController.list);
router.get('/:id/duplicates', ...managerOnly, SubmissionController.duplicates);
router.post('/:id/approve', ...managerOnly, SubmissionController.approve);
router.post('/:id/reject', ...managerOnly, SubmissionController.reject);

// Xem / sửa: CTV chỉ tin của mình (service lọc), Quản lý mọi tin
router.get('/:id', ...anyRole, SubmissionController.getById);
router.patch('/:id', ...anyRole, SubmissionController.update);

export const submissionRoutes = router;
