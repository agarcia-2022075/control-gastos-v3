import { Request, Response, NextFunction } from 'express';
import { userService, UserService } from '../services/user.service.js';

export class UserController {
  constructor(private userSvc: UserService = userService) {}

  getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const users = await this.userSvc.getAllUsers();
      res.status(200).json({
        success: true,
        data: users
      });
    } catch (error) {
      next(error);
    }
  };

  updateRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = parseInt(String(req.params.id), 10);
      if (isNaN(userId)) {
        res.status(400).json({ success: false, message: 'ID de usuario inválido' });
        return;
      }
      const { role } = req.body;
      const updatedUser = await this.userSvc.updateUserRole(userId, role);
      res.status(200).json({
        success: true,
        message: 'Rol de usuario actualizado correctamente',
        data: updatedUser
      });
    } catch (error) {
      next(error);
    }
  };
}

export const userController = new UserController();
