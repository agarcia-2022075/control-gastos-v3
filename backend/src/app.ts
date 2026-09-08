import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import router from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app: Express = express();

// Disable ETags to prevent 304 Not Modified responses on API requests
app.set('etag', false);

// Security Headers with Helmet
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false // Enabled in production with dedicated reverse proxy/CSP config
}));

// CORS Configuration
const allowedOrigins = [
  env.CORS_ORIGIN,
  'http://localhost:4200',
  'http://127.0.0.1:4200'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || env.CORS_ORIGIN === '*') {
      callback(null, true);
    } else {
      callback(new Error('Acceso no permitido por la política CORS'));
    }
  },
  credentials: true
}));

// Parse JSON with reasonable size limit to prevent memory exhaustion
app.use(express.json({ limit: '1mb' }));

// Global Rate Limiter: 500 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP. Por favor intente más tarde.'
  }
});
app.use('/api', globalLimiter);

// Prevent browser caching of API responses
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  next();
});

app.use('/api', router);

app.use(errorHandler);

export default app;
