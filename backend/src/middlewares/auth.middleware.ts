import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { JwtPayload } from '../modules/auth/models/auth.model.js';
import { AppError } from './error.middleware.js';

export const authenticateJwt = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'Token de autenticación requerido'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = (jwt.verify(token, env.JWT_SECRET) as unknown) as JwtPayload;

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError(401, 'El token ha expirado'));
    }
    return next(new AppError(401, 'Token inválido'));
  }
};
