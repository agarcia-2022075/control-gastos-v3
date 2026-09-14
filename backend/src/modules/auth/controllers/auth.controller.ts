import { Request, Response, NextFunction } from 'express';
import { authService, AuthService } from '../services/auth.service.js';

export class AuthController {
  constructor(private authSvc: AuthService = authService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const newUser = await this.authSvc.register(req.body);
      res.status(201).json({
        success: true,
        message: 'Usuario registrado correctamente',
        data: newUser
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authResult = await this.authSvc.login(req.body);
      res.status(200).json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: authResult
      });
    } catch (error) {
      next(error);
    }
  };

  googleLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authResult = await this.authSvc.googleLogin(req.body);
      res.status(200).json({
        success: true,
        message: 'Inicio de sesión con Google exitoso',
        data: authResult
      });
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Token de autenticación requerido' });
        return;
      }
      const user = await this.authSvc.getCurrentUser(req.user.id);
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
