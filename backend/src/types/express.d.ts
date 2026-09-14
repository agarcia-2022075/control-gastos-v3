import { UserRole } from '../modules/users/models/user.model.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: UserRole;
      };
    }
  }
}
