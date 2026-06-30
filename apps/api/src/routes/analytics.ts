import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';
import { startOfDay, endOfDay, subDays } from 'date-fns';

const router = Router();

// ─── GET /api/v1/analytics/summary ───────────────────────────────────────────
router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const [totalTasks, completedToday, criticalRemaining] = await Promise.all([
      prisma.task.count({ where: { userId, deletedAt: null } }),
      prisma.task.count({ where: { userId, status: 'COMPLETED', updatedAt: { gte: todayStart, lte: todayEnd } } }),
      prisma.task.count({ where: { userId, status: { in: ['PENDING', 'IN_PROGRESS'] }, priority: 'CRITICAL', deletedAt: null } }),
    ]);

    // Simple productivity score (0-100)
    // Formula: (completedToday / 5) * 100, capped at 100, minus points for remaining CRITICAL
    let productivityScore = Math.min(100, (completedToday / 5) * 100);
    productivityScore = Math.max(0, productivityScore - (criticalRemaining * 10));

    res.json({
      success: true,
      data: {
        totalTasks,
        completedToday,
        criticalRemaining,
        productivityScore: Math.round(productivityScore),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/v1/analytics/completion-trends ─────────────────────────────────
router.get('/completion-trends', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const sevenDaysAgo = subDays(startOfDay(now), 6);

    // Fetch completed tasks in the last 7 days
    const completedTasks = await prisma.task.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        updatedAt: { gte: sevenDaysAgo },
      },
      select: { updatedAt: true },
    });

    // Group by day
    const trendsMap: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = subDays(now, i);
      const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
      trendsMap[dateStr] = 0;
    }

    completedTasks.forEach((task) => {
      const dateStr = task.updatedAt.toISOString().split('T')[0];
      if (trendsMap[dateStr] !== undefined) {
        trendsMap[dateStr]++;
      }
    });

    // Format for chart: array sorted chronologically
    const trends = Object.keys(trendsMap)
      .sort() // Sort string keys chronologically
      .map(date => ({
        date,
        completed: trendsMap[date],
      }));

    res.json({
      success: true,
      data: { trends },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
