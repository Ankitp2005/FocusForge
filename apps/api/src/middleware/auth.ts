import { Request, Response, NextFunction } from 'express';
import { getAuth, clerkClient } from '@clerk/express';

import { env } from '../config/env';
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

// 1. We verify the token manually via req.auth from clerkMiddleware
// 2. We sync the Clerk user to our Prisma database.
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = getAuth(req);
    if (!auth || !auth.userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }
    const clerkId = auth.userId;

    let user = await prisma.user.findUnique({
      where: { clerkId, deletedAt: null },
    });

    // Lazily create user on first request
    if (!user) {
      let name = 'New User';
      let email = `${clerkId}@clerk.local`;

      try {
        const clerkUser = await clerkClient.users.getUser(clerkId);
        if (clerkUser) {
          email = clerkUser.emailAddresses[0]?.emailAddress || email;
          name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'New User';
        }
      } catch (clerkErr) {
        logger.error('Failed to fetch user from Clerk API', clerkErr);
      }

      user = await prisma.user.create({
        data: {
          clerkId,
          email,
          name,
          preferences: { create: {} },
        },
      });
    } else if (user.email.endsWith('@clerk.local') || user.name === 'New User') {
      // Sync real details for existing placeholder user
      try {
        const clerkUser = await clerkClient.users.getUser(clerkId);
        if (clerkUser) {
          const email = clerkUser.emailAddresses[0]?.emailAddress || user.email;
          const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || user.name;
          user = await prisma.user.update({
            where: { id: user.id },
            data: { email, name },
          });
        }
      } catch (clerkErr) {
        logger.error('Failed to sync user from Clerk API', clerkErr);
      }
    }

    req.user = user;
    next();
    } catch (error: any) {
      require('fs').writeFileSync('C:/Users/Ankit pandey/.gemini/antigravity-ide/brain/0fdc7169-b038-4a33-8f8f-9279759d898a/scratch/auth_error.txt', error.stack || error.message);
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
