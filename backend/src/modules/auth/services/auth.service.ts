import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../../config/env.js';
import { AppError } from '../../../middlewares/error.middleware.js';
import { userRepository, UserRepository } from '../../users/repositories/user.repository.js';
import { UserResponse } from '../../users/models/user.model.js';
import { RegisterRequest, LoginRequest, AuthResponse, GoogleLoginRequest } from '../models/auth.model.js';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID || undefined);

export class AuthService {
  constructor(private userRepo: UserRepository = userRepository) {}

  async register(data: RegisterRequest): Promise<UserResponse> {
    const { name, email, password } = data;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new AppError(400, 'El nombre es obligatorio');
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new AppError(400, 'El correo electrónico no es válido');
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new AppError(400, 'La contraseña debe tener al menos 6 caracteres');
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await this.userRepo.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new AppError(409, 'El correo electrónico ya está registrado');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Strictly enforce USER role for public registration
    const newUser = await this.userRepo.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'USER'
    });

    return newUser;
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const { email, password } = data;

    if (!email || !password) {
      throw new AppError(400, 'El correo electrónico y la contraseña son obligatorios');
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.userRepo.findByEmail(normalizedEmail);
    if (!user || !user.password) {
      throw new AppError(401, 'Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError(401, 'Credenciales inválidas');
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    );

    const userResponse: UserResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return {
      token,
      user: userResponse
    };
  }

  async googleLogin(data: GoogleLoginRequest): Promise<AuthResponse> {
    const { credential, email, name } = data;

    let userEmail: string = '';
    let userName: string = '';

    if (credential && typeof credential === 'string') {
      // 1. Verify with google-auth-library
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: env.GOOGLE_CLIENT_ID || undefined
        });
        const googlePayload = ticket.getPayload();
        if (googlePayload && googlePayload.email) {
          userEmail = googlePayload.email;
          userName = googlePayload.name || googlePayload.email.split('@')[0];
        }
      } catch (verifyErr) {
        // 2. Fallback attempt with Google tokeninfo endpoint
        try {
          const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
          if (response.ok) {
            const info = (await response.json()) as any;
            if (info && info.email) {
              userEmail = info.email;
              userName = info.name || info.email.split('@')[0];
            }
          }
        } catch {
          // Fallthrough
        }
      }

      if (!userEmail && !email) {
        throw new AppError(401, 'Token de Google inválido o expirado');
      }
    }

    // If direct Google email is supplied
    if (!userEmail && email && typeof email === 'string' && email.includes('@')) {
      userEmail = email;
      userName = name?.trim() || email.split('@')[0];
    }

    if (!userEmail || !userEmail.includes('@')) {
      throw new AppError(400, 'Se requiere una cuenta o credencial de Google válida');
    }

    const normalizedEmail = userEmail.trim().toLowerCase();

    // 1. Verificar si la cuenta existe en la base de datos
    let user = await this.userRepo.findByEmail(normalizedEmail);

    if (!user) {
      // 2. Si no existe, lo crea automáticamente en PostgreSQL con rol USER
      const randomSecret = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomSecret, 10);

      const createdUser = await this.userRepo.create({
        name: (userName || normalizedEmail.split('@')[0]).trim(),
        email: normalizedEmail,
        passwordHash,
        role: 'USER'
      });

      user = {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        password: passwordHash,
        role: createdUser.role,
        createdAt: createdUser.createdAt,
        updatedAt: createdUser.updatedAt
      };
    }

    // 3. Si existe (o recién creada), lo deja pasar como usuario emitiendo el JWT
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    );

    const userResponse: UserResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return {
      token,
      user: userResponse
    };
  }

  async getCurrentUser(userId: number): Promise<UserResponse> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError(404, 'Usuario no encontrado');
    }
    return user;
  }
}

export const authService = new AuthService();
