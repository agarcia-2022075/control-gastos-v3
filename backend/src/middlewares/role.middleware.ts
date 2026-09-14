import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../modules/users/models/user.model.js';
import { userRepository } from '../modules/users/repositories/user.repository.js';
import { AppError } from './error.middleware.js';

export const authorizeRole = (..._allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new AppError(401, 'Token de autenticación requerido'));
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
