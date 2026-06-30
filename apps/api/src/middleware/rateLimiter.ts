import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis';
import { Plan } from '@prisma/client';
import { logAudit } from '../services/audit';

// Global limit (1000 requests per 15 minutes per IP)
export const globalRateLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error - rate-limit-redis has type mismatches with ioredis, but works at runtime
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: true, // SECURITY.md: returns X-RateLimit-* headers
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later.',
    },
  },
  handler: (req: any, res: any, next: any, options: any) => {
    logAudit(req, {
      action: 'security.rate_limit_exceeded',
      resourceType: 'ip',
      resourceId: req.ip || 'unknown',
      success: false,
      errorCode: 'RATE_LIMITED',
      metadata: { limit: options.max, windowMs: options.windowMs }
    });
    res.status(options.statusCode).json(options.message);
  }
});

// Auth specific limits (10 requests per minute)
export const authRateLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: true,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts, please try again later.',
    },
  },
  handler: (req: any, res: any, next: any, options: any) => {
    logAudit(req, {
      action: 'security.rate_limit_exceeded',
      resourceType: 'auth_ip',
      resourceId: req.ip || 'unknown',
      success: false,
      errorCode: 'AUTH_RATE_LIMITED',
      metadata: { limit: options.max, windowMs: options.windowMs }
    });
    res.status(options.statusCode).json(options.message);
  }
});

// Per-User limits (Free: 60/min, Pro/Teams: 300/min, Enterprise: 1000/min)
export const userRateLimiter = rateLimit({
  store: new RedisStore({
    // @ts-expect-error
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: 60 * 1000,
  keyGenerator: (req: any) => {
    return req.user ? `rate_limit_user:${req.user.id}` : `rate_limit_ip:${req.ip}`;
  },
  max: (req: any) => {
    if (!req.user) return 60;
    const plan = req.user.plan;
    if (plan === Plan.ENTERPRISE) return 1000;
    if (plan === Plan.PRO || plan === Plan.TEAMS) return 300;
    return 60;
  },
  standardHeaders: true,
  legacyHeaders: true,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests for your plan tier.',
    },
  },
  handler: (req: any, res: any, next: any, options: any) => {
    logAudit(req, {
      action: 'security.rate_limit_exceeded',
      resourceType: 'user_rate_limit',
      resourceId: req.user?.id || req.ip || 'unknown',
      success: false,
      errorCode: 'USER_RATE_LIMITED',
      metadata: { limit: typeof options.max === 'function' ? options.max(req) : options.max }
    });
    res.status(options.statusCode).json(options.message);
  }
});

// Daily AI Endpoint limits (Free: 20/day, Pro/Teams: 200/day, Enterprise: Unlimited)
export const aiRateLimiter = async (req: any, res: any, next: any) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const plan = req.user.plan;
    if (plan === Plan.ENTERPRISE) {
      return next();
    }

    // Limit determination
    const limit = plan === Plan.PRO || plan === Plan.TEAMS ? 200 : 20;
    const today = new Date().toISOString().split('T')[0];
    const redisKey = `ai_quota:${req.user.id}:${today}`;

    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, 86400); // 24 hour TTL
    }

    if (count > limit) {
      logAudit(req, {
        action: 'security.rate_limit_exceeded',
        resourceType: 'user_ai_quota',
        resourceId: req.user.id,
        success: false,
        errorCode: 'AI_QUOTA_EXCEEDED',
        metadata: { limit, count },
      });

      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `Daily AI request limit of ${limit} reached for your plan. Upgrade to unlock more capacity.`,
        },
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};
