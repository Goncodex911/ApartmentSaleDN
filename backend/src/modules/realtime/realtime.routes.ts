import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import { RealtimeController } from './realtime.controller.js';

const router = Router();

router.get('/stream', authMiddleware, RealtimeController.stream);

export const realtimeRoutes = router;
