import { Router } from 'express';
import { UserController } from './user.controller.js';
import { authMiddleware } from '../../middlewares/auth.js';
import { requireRoles } from '../../middlewares/rbac.js';

const router = Router();

// Routes riêng tư (yêu cầu đăng nhập)
router.get('/profile', authMiddleware, UserController.getProfile);
router.put('/profile', authMiddleware, UserController.updateProfile);
router.post('/telegram-link', authMiddleware, UserController.createTelegramLink);
router.delete('/telegram-link', authMiddleware, UserController.unlinkTelegram);
// Story 16.4: tự xem / đăng xuất thiết bị khác của mình (đặt trước /:id để "me" không bị hiểu là id)
router.get('/me/sessions', authMiddleware, UserController.listMySessions);
router.delete('/me/sessions/:sessionId', authMiddleware, UserController.revokeMySession);

// Quản trị tài khoản (chỉ ADMIN): duyệt Quản lý tự đăng ký, khóa/mở khóa tài khoản
router.get('/collaborators', authMiddleware, requireRoles('ADMIN', 'MANAGER'), UserController.listCollaborators);
router.get('/', authMiddleware, requireRoles('ADMIN'), UserController.listUsers);
router.patch('/:id/status', authMiddleware, requireRoles('ADMIN'), UserController.updateStatus);
router.patch('/:id/role', authMiddleware, requireRoles('ADMIN'), UserController.updateRole); // Story 13.2
router.post('/:id/reset-password', authMiddleware, requireRoles('ADMIN'), UserController.resetPassword);
// Story 16.6: Admin tạo / sửa tài khoản, ghi chú nội bộ
router.post('/', authMiddleware, requireRoles('ADMIN'), UserController.create);
router.patch('/:id', authMiddleware, requireRoles('ADMIN'), UserController.adminUpdate);
router.get('/:id/notes', authMiddleware, requireRoles('ADMIN'), UserController.listNotes);
router.post('/:id/notes', authMiddleware, requireRoles('ADMIN'), UserController.addNote);
router.delete('/:id/notes/:noteId', authMiddleware, requireRoles('ADMIN'), UserController.deleteNote);
router.get('/:id/sessions', authMiddleware, requireRoles('ADMIN'), UserController.listSessions); // Story 16.4
router.delete('/:id/sessions/:sessionId', authMiddleware, requireRoles('ADMIN'), UserController.revokeSession);
router.delete('/:id/sessions', authMiddleware, requireRoles('ADMIN'), UserController.revokeAllSessions);
router.get('/:id/overview', authMiddleware, requireRoles('ADMIN'), UserController.overview); // Story 16.3
router.patch('/:id/can-report', authMiddleware, requireRoles('ADMIN'), UserController.updateCanReport); // Story 13.6

// Route công khai (dành cho khách hàng xem landing page qua ctvCode)
router.get('/ctv/:ctvCode', UserController.getPublicCtv);

export const userRoutes = router;

