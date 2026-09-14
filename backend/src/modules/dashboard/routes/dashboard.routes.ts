import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { authenticateJwt } from '../../../middlewares/auth.middleware.js';

const router = Router();
const controller = new DashboardController();

// Accessible by ANY authenticated user (both USER and ADMIN)
router.get('/stats', authenticateJwt, (req, res) => controller.getStats(req, res));
router.post('/incomes', authenticateJwt, (req, res) => controller.createIncome(req, res));
router.post('/expenses', authenticateJwt, (req, res) => controller.createExpense(req, res));
router.post('/credit-payments', authenticateJwt, (req, res) => controller.createCreditPayment(req, res));
router.patch('/savings-goal', authenticateJwt, (req, res) => controller.updateSavingsGoal(req, res));
router.get('/cards', authenticateJwt, (req, res) => controller.getCards(req, res));
router.post('/cards', authenticateJwt, (req, res) => controller.createCard(req, res));
router.delete('/cards/:id', authenticateJwt, (req, res) => controller.deleteCard(req, res));
router.patch('/alerts/:id/dismiss', authenticateJwt, (req, res) => controller.dismissAlert(req, res));
router.patch('/transactions/:id', authenticateJwt, (req, res) => controller.updateTransaction(req, res));
router.put('/transactions/:id', authenticateJwt, (req, res) => controller.updateTransaction(req, res));
router.delete('/transactions/:id', authenticateJwt, (req, res) => controller.deleteTransaction(req, res));

// Hallazgo 8: Metas de Ahorro
router.get('/savings-goals', authenticateJwt, (req, res) => controller.getSavingsGoals(req, res));
router.post('/savings-goals', authenticateJwt, (req, res) => controller.createSavingsGoal(req, res));
router.post('/savings-goals/:id/contribute', authenticateJwt, (req, res) => controller.contributeSavingsGoal(req, res));
router.post('/savings-goals/:id/withdraw', authenticateJwt, (req, res) => controller.withdrawSavingsGoal(req, res));
router.delete('/savings-goals/:id', authenticateJwt, (req, res) => controller.deleteSavingsGoal(req, res));

// Hallazgo 9: Gastos Fijos Recurrentes
router.get('/recurring-expenses', authenticateJwt, (req, res) => controller.getRecurringExpenses(req, res));
router.post('/recurring-expenses', authenticateJwt, (req, res) => controller.createRecurringExpense(req, res));
router.post('/recurring-expenses/apply-month', authenticateJwt, (req, res) => controller.applyRecurringExpenses(req, res));
router.delete('/recurring-expenses/:id', authenticateJwt, (req, res) => controller.deleteRecurringExpense(req, res));

// Hallazgo 10: Perfil Salarial y Prestaciones de Ley
router.get('/salary-profile', authenticateJwt, (req, res) => controller.getSalaryProfile(req, res));
router.put('/salary-profile', authenticateJwt, (req, res) => controller.updateSalaryProfile(req, res));

// Preferencias de Notificaciones y Alertas Financieras
router.get('/preferences', authenticateJwt, (req, res) => controller.getPreferences(req, res));
router.put('/preferences', authenticateJwt, (req, res) => controller.updatePreferences(req, res));

// Copia de Seguridad y Respaldo Completo
router.get('/backup', authenticateJwt, (req, res) => controller.getBackupData(req, res));
router.post('/restore', authenticateJwt, (req, res) => controller.restoreBackupData(req, res));
router.post('/backup/restore', authenticateJwt, (req, res) => controller.restoreBackupData(req, res));

// Gestión de Categorías Personalizadas
router.get('/categories', authenticateJwt, (req, res) => controller.getCategories(req, res));
router.post('/categories', authenticateJwt, (req, res) => controller.createCategory(req, res));
router.put('/categories/:id', authenticateJwt, (req, res) => controller.updateCategory(req, res));
router.delete('/categories/:id', authenticateJwt, (req, res) => controller.deleteCategory(req, res));

export default router;
