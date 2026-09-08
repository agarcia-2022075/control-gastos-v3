import { UserResponse, UserRole } from '../../users/models/user.model.js';

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleLoginRequest {
  credential?: string;
  email?: string;
  name?: string;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
