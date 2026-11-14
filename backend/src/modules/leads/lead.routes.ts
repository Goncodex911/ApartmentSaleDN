import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import { LeadController } from './lead.controller.js';

// Phễu khách hàng (Story 6.1): mọi route yêu cầu đăng nhập, mỗi người chỉ thấy khách của mình
const router = Router();
router.use(authMiddleware);

router.get('/', LeadController.list);
router.get('/:id', LeadController.getById);
router.post('/', LeadController.create);
router.patch('/:id', LeadController.update);
router.patch('/:id/stage', LeadController.changeStage);
router.post('/:id/notes', LeadController.addNote);
router.delete('/:id', LeadController.delete);

export const leadRoutes = router;
