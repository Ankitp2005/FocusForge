import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/database';
import { setupWebSocket } from './config/websocket';

// Routes
import taskRoutes from './routes/tasks';
import goalRoutes from './routes/goals';
import habitRoutes from './routes/habits';
import aiRoutes from './routes/ai';
import calendarRoutes from './routes/calendar';
import analyticsRoutes from './routes/analytics';
import userRoutes from './routes/user';
import subscriptionRoutes from './routes/subscriptions';
import webhookRoutes from './routes/webhooks';

// Middleware
import { errorHandler } from './middleware/errorHandler';
import { globalRateLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';

const app = express();
const httpServer = createServer(app);

// ─── WebSocket Server ──────────────────────────────────────────────────────
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: env.APP_URL,
    credentials: true,
  },
});
setupWebSocket(io);

// ─── Security Headers (SECURITY.md §4.4) ──────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", 'https://api.anthropic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: 'deny',
    },
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
  })
);

app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
  next();
});

// ─── CORS (SECURITY.md §4.3) ──────────────────────────────────────────────
app.use(
  cors({
    origin: env.NODE_ENV === 'production'
      ? [
          'https://focusforge.app',
          'https://www.focusforge.app',
          'https://focusforge-frontend-9hi2.onrender.com',
          'http://localhost',
          'https://localhost',
          'capacitor://localhost',
          ...(env.APP_URL ? [env.APP_URL] : []),
        ]
      : (origin, callback) => {
          // Allow any origin in development to support mobile live-reload testing
          callback(null, origin || '*');
        },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);

// ─── Core Middleware ───────────────────────────────────────────────────────
app.use(compression());
app.use(cookieParser());
// ─── Webhook Routes (before JSON parsing for Stripe signature) ─────────────
app.use('/api/v1/webhooks', webhookRoutes);

app.use(express.json({ limit: '10mb' })); // SECURITY.md §4.2: 10MB max
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(requestLogger);

app.use('/api', globalRateLimiter);

// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded', timestamp: new Date().toISOString() });
  }
});

// Webhooks are already mounted before JSON parsing

import { Router } from 'express';
import { authenticate } from './middleware/auth';
import { userRateLimiter } from './middleware/rateLimiter';

// Public Calendar routes
app.use('/api/v1/calendar', calendarRoutes);

// Protected API Routes
const protectedRouter = Router();
protectedRouter.use(authenticate);
protectedRouter.use(userRateLimiter);

protectedRouter.use('/tasks', taskRoutes);
protectedRouter.use('/goals', goalRoutes);
protectedRouter.use('/habits', habitRoutes);
protectedRouter.use('/ai', aiRoutes);
protectedRouter.use('/analytics', analyticsRoutes);
protectedRouter.use('/user', userRoutes);
protectedRouter.use('/subscriptions', subscriptionRoutes);

app.use('/api/v1', protectedRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

// ─── Error Handler ─────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────────────────────
const PORT = env.PORT;
httpServer.listen(PORT, () => {
  logger.info(`🚀 FocusForge API running on port ${PORT}`);
  logger.info(`📊 Environment: ${env.NODE_ENV}`);
});

export default app;
