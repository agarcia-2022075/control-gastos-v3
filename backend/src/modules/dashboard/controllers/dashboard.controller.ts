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

      const { title, merchant, category, amount, date } = req.body;
      const income = await this.service.createIncome(userId, {
        title,
        merchant,
        category,
        amount: parseFloat(amount),
        date
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

      const { title, merchant, category, amount, date } = req.body;
      const expense = await this.service.createExpense(userId, {
        title,
        merchant,
        category,
        amount: parseFloat(amount),
        date
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
}
