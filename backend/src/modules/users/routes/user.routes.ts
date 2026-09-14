import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authenticateJwt } from '../../../middlewares/auth.middleware.js';
import { authorizeRole } from '../../../middlewares/role.middleware.js';

const router = Router();

router.get('/', authenticateJwt, authorizeRole('ADMIN'), userController.getUsers);
router.patch('/:id/role', authenticateJwt, authorizeRole('ADMIN'), userController.updateRole);

export default router;
