import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { authenticateJwt } from '../../../middlewares/auth.middleware.js';

const router = Router();
const controller = new DashboardController();

// Accessible by ANY authenticated user (both USER and ADMIN)
router.get('/stats', authenticateJwt, (req, res) => controller.getStats(req, res));
router.post('/incomes', authenticateJwt, (req, res) => controller.createIncome(req, res));
router.post('/expenses', authenticateJwt, (req, res) => controller.createExpense(req, res));
router.patch('/savings-goal', authenticateJwt, (req, res) => controller.updateSavingsGoal(req, res));
router.patch('/alerts/:id/dismiss', authenticateJwt, (req, res) => controller.dismissAlert(req, res));
router.patch('/transactions/:id', authenticateJwt, (req, res) => controller.updateTransaction(req, res));
router.put('/transactions/:id', authenticateJwt, (req, res) => controller.updateTransaction(req, res));
router.delete('/transactions/:id', authenticateJwt, (req, res) => controller.deleteTransaction(req, res));

export default router;
