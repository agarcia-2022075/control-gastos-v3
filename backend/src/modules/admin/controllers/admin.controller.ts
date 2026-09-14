import { Request, Response, NextFunction } from 'express';

export class AdminController {
  getTest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({
        success: true,
        message: 'Acceso administrativo autorizado'
      });
    } catch (error) {
      next(error);
    }
  };
}

export const adminController = new AdminController();
