import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { prisma } from '../config/database';
import { Plan, User as PrismaUser } from '@prisma/client';
import { logger } from '../config/logger';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId?: string;
      };
    }
  }
}

declare global {
  namespace Express {
    interface User extends PrismaUser {}
  }
}

// 1. We extract and verify the bearer token via Supabase Auth
// 2. We sync the authenticated Supabase user to our Prisma database.
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { data: { user: sbUser }, error: sbError } = await supabase.auth.getUser(token);

    if (sbError || !sbUser) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: sbError?.message || 'Invalid or expired token' },
      });
    }

    const supabaseId = sbUser.id;
    let user = await prisma.user.findUnique({
      where: { supabaseId, deletedAt: null },
    });

    // Lazily create user on first request
    if (!user) {
      const email = sbUser.email || `${supabaseId}@supabase.local`;
      const name = sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || email.split('@')[0] || 'Operator';
      const avatarUrl = sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || null;

      user = await prisma.user.create({
        data: {
          supabaseId,
          email,
          name,
          avatarUrl,
          preferences: { create: {} },
        },
      });
    } else {
      // Keep name/avatar updated if they changed on OAuth side
      const name = sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || user.name;
      const avatarUrl = sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || user.avatarUrl;
      
      if (user.name !== name || user.avatarUrl !== avatarUrl) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { name, avatarUrl },
        });
      }
    }

    req.user = user;
    next();
  } catch (error: any) {
    logger.error('Failed to sync user session:', error);
    return res.status(401).json({
      success: false,
      error: { 
        code: 'UNAUTHORIZED', 
        message: 'Failed to sync user session',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      },
    });
  }
};

export const requirePlan = (requiredPlan: Plan[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    if (!requiredPlan.includes(req.user.plan)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Higher plan required' },
      });
    }

    next();
  };
};
