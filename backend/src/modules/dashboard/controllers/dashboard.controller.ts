import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service.js';
import { AppError } from '../../../middlewares/error.middleware.js';

export class DashboardController {
  private service = new DashboardService();

  private handleError(res: Response, error: any, defaultMsg: string): void {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      console.error(defaultMsg, error);
      res.status(500).json({
        success: false,
        message: defaultMsg
      });
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado.'
        });
        return;
      }

      const stats = await this.service.getDashboardStats(userId);
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      this.handleError(res, error, 'Error al obtener estadísticas del dashboard.');
    }
  }

  async createIncome(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado.'
        });
        return;
      }

      const { title, merchant, category, amount, date, cardId } = req.body;
      const income = await this.service.createIncome(userId, {
        title,
        merchant,
        category,
        amount: parseFloat(amount),
        date,
        cardId: cardId !== undefined && cardId !== null ? parseInt(cardId, 10) : undefined
      });

      res.status(201).json({
        success: true,
        message: 'Ingreso registrado exitosamente.',
        data: income
      });
    } catch (error: any) {
      this.handleError(res, error, 'Error al registrar el ingreso.');
    }
  }

  async createExpense(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado.'
        });
        return;
      }

      const { title, merchant, category, amount, date, installments, cardId } = req.body;
      const expense = await this.service.createExpense(userId, {
        title,
        merchant,
        category,
        amount: parseFloat(amount),
        date,
        installments: installments !== undefined && installments !== null ? parseInt(installments, 10) : undefined,
        cardId: cardId !== undefined && cardId !== null ? parseInt(cardId, 10) : undefined
      });

      res.status(201).json({
        success: true,
        message: 'Gasto registrado exitosamente.',
        data: expense
      });
    } catch (error: any) {
      this.handleError(res, error, 'Error al registrar el gasto.');
    }
  }

  async createCreditPayment(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado.'
        });
        return;
      }

      const { creditCardId, sourceCardId, amount, date } = req.body;
      const payment = await this.service.createCreditPayment(userId, {
        creditCardId: parseInt(creditCardId, 10),
        sourceCardId: sourceCardId !== undefined && sourceCardId !== null && sourceCardId !== '' ? parseInt(sourceCardId, 10) : null,
        amount: parseFloat(amount),
        date
      });

      res.status(201).json({
        success: true,
        message: 'Pago de tarjeta de crédito registrado exitosamente.',
        data: payment
      });
    } catch (error: any) {
      this.handleError(res, error, 'Error al registrar el pago de la tarjeta.');
    }
  }

  async updateTransaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const idStr = String(req.params['id'] || req.params.id);
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado.'
        });
        return;
      }

      const { title, merchant, category, amount, date } = req.body;
      const updated = await this.service.updateTransaction(userId, parseInt(idStr, 10), {
        title,
        merchant,
        category,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        date
      });

      res.status(200).json({
        success: true,
        message: 'Transacción actualizada exitosamente.',
        data: updated
      });
    } catch (error: any) {
      this.handleError(res, error, 'Error al actualizar la transacción.');
    }
  }

  async deleteTransaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const idStr = String(req.params['id'] || req.params.id);
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado.'
        });
        return;
      }

      await this.service.deleteTransaction(parseInt(idStr, 10), userId);
      res.status(200).json({
        success: true,
        message: 'Transacción eliminada exitosamente.'
      });
    } catch (error: any) {
      this.handleError(res, error, 'Error al eliminar la transacción.');
    }
  }

  async updateSavingsGoal(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado.'
        });
        return;
      }

      const { targetAmount, currentAmount } = req.body;
      const updatedGoal = await this.service.updateSavingsGoal(userId, {
        targetAmount: targetAmount !== undefined ? parseFloat(targetAmount) : undefined,
        currentAmount: currentAmount !== undefined ? parseFloat(currentAmount) : undefined
      });

      res.status(200).json({
        success: true,
        message: 'Meta de ahorro actualizada exitosamente.',
        data: updatedGoal
      });
    } catch (error: any) {
      this.handleError(res, error, 'Error al actualizar la meta de ahorro.');
    }
  }

  async dismissAlert(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const idStr = String(req.params['id'] || req.params.id);
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado.'
        });
        return;
      }

      await this.service.dismissAlert(userId, parseInt(idStr, 10));
      res.status(200).json({
        success: true,
        message: 'Alerta resuelta exitosamente.'
      });
    } catch (error: any) {
      this.handleError(res, error, 'Error al resolver la alerta.');
    }
  }

  async getCards(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado.'
        });
        return;
      }

      const cards = await this.service.getCards(userId);
      res.status(200).json({
        success: true,
        data: cards
      });
    } catch (error: any) {
      this.handleError(res, error, 'Error al obtener tarjetas y cuentas.');
    }
  }

  async createCard(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado.'
        });
        return;
      }

      const { name, type, cardNumberMask, initialBalance, expiryDate, colorGradient, billingCutDay, paymentDueDay } = req.body;
      const card = await this.service.createCard(userId, {
        name,
        type,
        cardNumberMask,
        initialBalance: initialBalance !== undefined ? parseFloat(initialBalance) : undefined,
        expiryDate,
        colorGradient,
        billingCutDay: billingCutDay !== undefined && billingCutDay !== null && billingCutDay !== '' ? parseInt(billingCutDay, 10) : undefined,
        paymentDueDay: paymentDueDay !== undefined && paymentDueDay !== null && paymentDueDay !== '' ? parseInt(paymentDueDay, 10) : undefined
      });

      res.status(201).json({
        success: true,
        message: 'Tarjeta o cuenta creada exitosamente.',
        data: card
      });
    } catch (error: any) {
      this.handleError(res, error, 'Error al crear la tarjeta o cuenta.');
    }
  }

  async deleteCard(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const idStr = String(req.params['id'] || req.params.id);
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado.'
        });
        return;
      }

      await this.service.deleteCard(userId, parseInt(idStr, 10));
      res.status(200).json({
        success: true,
        message: 'Tarjeta o cuenta eliminada exitosamente.'
      });
    } catch (error: any) {
      this.handleError(res, error, 'Error al eliminar la tarjeta o cuenta.');
    }
  }

  // --- Hallazgo 8: Metas de Ahorro Múltiples ---
  async getSavingsGoals(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
        return;
      }
      const goals = await this.service.getSavingsGoals(userId);
      res.status(200).json({ success: true, data: goals });
    } catch (error: any) {
      this.handleError(res, error, 'Error al obtener metas de ahorro.');
    }
  }

  async createSavingsGoal(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
        return;
      }
      const { name, targetAmount, initialAmount, category, colorGradient, targetDate } = req.body;
      const goal = await this.service.createSavingsGoal(userId, {
        name,
        targetAmount: parseFloat(targetAmount),
        initialAmount: initialAmount !== undefined && initialAmount !== null && initialAmount !== '' ? parseFloat(initialAmount) : 0,
        category,
        colorGradient,
        targetDate
      });
      res.status(201).json({ success: true, message: 'Meta de ahorro creada exitosamente.', data: goal });
    } catch (error: any) {
      this.handleError(res, error, 'Error al crear la meta de ahorro.');
    }
  }

  async contributeSavingsGoal(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const idStr = String(req.params['id'] || req.params.id);
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
        return;
      }
      const { amount } = req.body;
      const updated = await this.service.contributeToSavingsGoal(userId, parseInt(idStr, 10), {
        amount: parseFloat(amount)
      });
      res.status(200).json({ success: true, message: 'Aporte registrado exitosamente.', data: updated });
    } catch (error: any) {
      this.handleError(res, error, 'Error al aportar a la meta de ahorro.');
    }
  }

  async withdrawSavingsGoal(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const idStr = String(req.params['id'] || req.params.id);
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
        return;
      }
      const { amount } = req.body;
      const updated = await this.service.withdrawFromSavingsGoal(userId, parseInt(idStr, 10), {
        amount: parseFloat(amount)
      });
      res.status(200).json({ success: true, message: 'Retiro registrado exitosamente.', data: updated });
    } catch (error: any) {
      this.handleError(res, error, 'Error al retirar fondos de la meta de ahorro.');
    }
  }

  async deleteSavingsGoal(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const idStr = String(req.params['id'] || req.params.id);
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
        return;
      }
      await this.service.deleteSavingsGoal(userId, parseInt(idStr, 10));
      res.status(200).json({ success: true, message: 'Meta de ahorro eliminada exitosamente.' });
    } catch (error: any) {
      this.handleError(res, error, 'Error al eliminar la meta de ahorro.');
    }
  }

  // --- Hallazgo 9: Gastos Fijos Recurrentes ---
  async getRecurringExpenses(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
        return;
      }
      const expenses = await this.service.getRecurringExpenses(userId);
      res.status(200).json({ success: true, data: expenses });
    } catch (error: any) {
      this.handleError(res, error, 'Error al obtener gastos fijos recurrentes.');
    }
  }

  async createRecurringExpense(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
        return;
      }
      const { title, category, amount, sourceCardId, paymentMethodName, billingDay } = req.body;
      const expense = await this.service.createRecurringExpense(userId, {
        title,
        category,
        amount: parseFloat(amount),
        sourceCardId: sourceCardId !== undefined && sourceCardId !== null && sourceCardId !== '' ? parseInt(sourceCardId, 10) : null,
        paymentMethodName,
        billingDay: parseInt(billingDay, 10)
      });
      res.status(201).json({ success: true, message: 'Gasto fijo registrado exitosamente.', data: expense });
    } catch (error: any) {
      this.handleError(res, error, 'Error al registrar el gasto fijo.');
    }
  }

  async applyRecurringExpenses(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
        return;
      }
      const { month } = req.body;
      const result = await this.service.applyRecurringExpenses(userId, month);
      res.status(200).json({ success: true, message: result.message, data: result });
    } catch (error: any) {
      this.handleError(res, error, 'Error al aplicar los gastos fijos del mes.');
    }
  }

  async deleteRecurringExpense(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const idStr = String(req.params['id'] || req.params.id);
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
        return;
      }
      await this.service.deleteRecurringExpense(userId, parseInt(idStr, 10));
      res.status(200).json({ success: true, message: 'Gasto fijo recurrente eliminado exitosamente.' });
    } catch (error: any) {
      this.handleError(res, error, 'Error al eliminar el gasto fijo.');
    }
  }

  // --- Hallazgo 10: Perfil Salarial y Prestaciones ---
  async getSalaryProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
        return;
      }
      const profile = await this.service.getUserSalaryProfile(userId);
      res.status(200).json({ success: true, data: profile });
    } catch (error: any) {
      this.handleError(res, error, 'Error al obtener el perfil salarial.');
    }
  }

  async updateSalaryProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
        return;
      }
      const { salary } = req.body;
      const updated = await this.service.updateUserSalaryProfile(userId, parseFloat(salary));
      res.status(200).json({ success: true, message: 'Salario base actualizado exitosamente.', data: updated });
    } catch (error: any) {
      this.handleError(res, error, 'Error al actualizar el salario base.');
    }
  }

  async getPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
        return;
      }
      const prefs = await this.service.getUserPreferences(userId);
      res.status(200).json({ success: true, data: prefs });
    } catch (error: any) {
      this.handleError(res, error, 'Error al obtener preferencias de usuario.');
    }
  }

  async updatePreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
        return;
      }
      const updated = await this.service.updateUserPreferences(userId, req.body);
      res.status(200).json({
        success: true,
        message: 'Preferencias de alertas actualizadas exitosamente.',
        data: updated
      });
    } catch (error: any) {
      this.handleError(res, error, 'Error al actualizar preferencias de alertas.');
    }
  }

  async getBackupData(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
        return;
      }
      const backup = await this.service.getCompleteUserDataBackup(userId);
      res.status(200).json({
        success: true,
        message: 'Respaldo de datos generado exitosamente.',
        data: backup
      });
    } catch (error: any) {
      this.handleError(res, error, 'Error al generar el respaldo de datos.');
    }
  }

  async restoreBackupData(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
        return;
      }
      const { backupData, mode } = req.body;
      if (!backupData) {
        res.status(400).json({ success: false, message: 'Se requiere el contenido del respaldo (backupData).' });
        return;
      }

      const result = await this.service.restoreBackup(userId, backupData, mode || 'REPLACE');
      res.status(200).json(result);
    } catch (error: any) {
      this.handleError(res, error, error.message || 'Error al restaurar el respaldo de datos.');
    }
  }

  // --- Endpoints de Categorías ---
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
        return;
      }
      const type = req.query.type as string | undefined;
      const categories = await this.service.getCategories(userId, type);
      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error: any) {
      this.handleError(res, error, 'Error al obtener categorías.');
    }
  }

  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
        return;
      }
      const category = await this.service.createCategory(userId, req.body);
      res.status(201).json({
        success: true,
        message: 'Categoría creada exitosamente.',
        data: category
      });
    } catch (error: any) {
      this.handleError(res, error, 'Error al crear la categoría.');
    }
  }

  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
        return;
      }
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'ID de categoría inválido.' });
        return;
      }
      const category = await this.service.updateCategory(userId, id, req.body);
      res.status(200).json({
        success: true,
        message: 'Categoría actualizada exitosamente.',
        data: category
      });
    } catch (error: any) {
      this.handleError(res, error, 'Error al actualizar la categoría.');
    }
  }

  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
        return;
      }
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'ID de categoría inválido.' });
        return;
      }
      const reassignToName = req.body?.reassignToName || req.query.reassignToName as string | undefined;
      const result = await this.service.deleteCategory(userId, id, reassignToName);
      res.status(200).json({
        success: true,
        message: result.reassignedCount > 0
          ? `Categoría eliminada y ${result.reassignedCount} transacciones reasignadas.`
          : 'Categoría eliminada exitosamente.',
        data: result
      });
    } catch (error: any) {
      this.handleError(res, error, 'Error al eliminar la categoría.');
    }
  }
}
