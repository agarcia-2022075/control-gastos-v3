import { Router, Request, Response } from 'express';
import userRoutes from '../modules/users/routes/user.routes.js';
import authRoutes from '../modules/auth/routes/auth.routes.js';
import adminRoutes from '../modules/admin/routes/admin.routes.js';
import dashboardRoutes from '../modules/dashboard/routes/dashboard.routes.js';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'API funcionando correctamente'
  });
});

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/users', userRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
