import dotenv from 'dotenv';
import path from 'path';

// Load .env from workspace root if running inside backend or root
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || (nodeEnv === 'production' ? '' : 'control_gastos_dev_secret_key_minimum_32_chars_2026');

if (nodeEnv === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'secret' || process.env.JWT_SECRET.length < 32)) {
  throw new Error('FATAL: JWT_SECRET debe estar definido y tener al menos 32 caracteres en entornos de producción.');
}

export const env = {
  NODE_ENV: nodeEnv,
  PORT: parseInt(process.env.PORT || '3000', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:4200',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_NAME: process.env.DB_NAME || 'control_gastos',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'admin',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@controlgastos.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || ''
};
