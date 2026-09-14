import { userRepository, UserRepository } from '../repositories/user.repository.js';
import { UserResponse, UserRole } from '../models/user.model.js';
import { AppError } from '../../../middlewares/error.middleware.js';

export class UserService {
  constructor(private userRepo: UserRepository = userRepository) {}

  async getAllUsers(): Promise<UserResponse[]> {
    return await this.userRepo.findAll();
  }

  async getUserById(id: number): Promise<UserResponse | null> {
    return await this.userRepo.findById(id);
  }

  async updateUserRole(id: number, newRole: UserRole): Promise<UserResponse> {
    if (!newRole || (newRole !== 'USER' && newRole !== 'ADMIN')) {
      throw new AppError(400, 'Rol no válido. Los roles permitidos son USER y ADMIN');
    }

    const targetUser = await this.userRepo.findById(id);
    if (!targetUser) {
      throw new AppError(404, 'Usuario no encontrado');
    }

    // Protection against demoting the sole ADMIN in the system
    if (targetUser.role === 'ADMIN' && newRole === 'USER') {
      const adminCount = await this.userRepo.countAdmins();
      if (adminCount <= 1) {
        throw new AppError(400, 'No se puede modificar el rol del único administrador del sistema');
      }
    }

    const updatedUser = await this.userRepo.updateRole(id, newRole);
    if (!updatedUser) {
      throw new AppError(500, 'Error al actualizar el rol del usuario');
    }

    return updatedUser;
  }
}

export const userService = new UserService();
