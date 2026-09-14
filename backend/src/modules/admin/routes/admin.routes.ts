import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { authenticateJwt } from '../../../middlewares/auth.middleware.js';
import { authorizeRole } from '../../../middlewares/role.middleware.js';

const router = Router();

router.get('/test', authenticateJwt, authorizeRole('ADMIN'), adminController.getTest);

export default router;
