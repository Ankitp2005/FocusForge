import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';
import { HabitFreq } from '@prisma/client';

const router = Router();
router.use(authenticate);

const habitCreateSchema = z.object({
  title: z.string().min(1).max(100),
  frequency: z.nativeEnum(HabitFreq).default(HabitFreq.DAILY),
  targetDaysOfWeek: z.array(z.number().int().min(0).max(6)).optional().default([]),
  reminderTime: z.string().optional().nullable(),
});

const habitLogSchema = z.object({
  completedOn: z.string(), // YYYY-MM-DD
  note: z.string().optional().nullable(),
});

// ─── GET /api/v1/habits ──────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const habits = await prisma.habit.findMany({
      where: { userId: req.user!.id, deletedAt: null, isActive: true },
      include: {
        // Fetch logs for the last 30 days to show current status/streak data client-side
        logs: {
          where: {
            completedOn: {
              gte: new Date(new Date().setDate(new Date().getDate() - 30)),
            },
          },
          orderBy: { completedOn: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: { habits } });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/v1/habits ─────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const data = habitCreateSchema.parse(req.body);

    const habit = await prisma.habit.create({
      data: {
        userId: req.user!.id,
        title: data.title,
        frequency: data.frequency,
        targetDaysOfWeek: data.targetDaysOfWeek,
        reminderTime: data.reminderTime,
      },
    });

    res.status(201).json({ success: true, data: { habit } });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/v1/habits/:id/log ─────────────────────────────────────────────
router.post('/:id/log', async (req, res, next) => {
  try {
    const data = habitLogSchema.parse(req.body);
    const date = new Date(data.completedOn as string);
    
    // Normalize date to 00:00:00 for the completedOn unique constraint
    date.setUTCHours(0, 0, 0, 0);

    const habit = await prisma.habit.findFirst({
      where: { id: req.params.id, userId: req.user!.id, deletedAt: null },
    });

    if (!habit) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Habit not found' } });
    }

    // Use upsert to handle multiple calls for the same day gracefully
    const log = await prisma.habitLog.upsert({
      where: {
        habitId_completedOn: {
          habitId: habit.id,
          completedOn: date,
        },
      },
      update: {
        note: data.note,
      },
      create: {
        habitId: habit.id,
        completedOn: date,
        note: data.note,
      },
    });
    
    // Simple streak logic placeholder. Real implementation requires complex date math
    // based on frequency (daily vs weekdays only vs custom).
    await prisma.habit.update({
      where: { id: habit.id },
      data: {
        currentStreak: habit.currentStreak + 1,
        longestStreak: Math.max(habit.longestStreak, habit.currentStreak + 1),
      },
    });

    res.status(201).json({ success: true, data: { log } });
  } catch (error) {
    next(error);
  }
});

const habitUpdateSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  frequency: z.nativeEnum(HabitFreq).optional(),
  targetDaysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  reminderTime: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// ─── GET /api/v1/habits/:id ──────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const habit = await prisma.habit.findFirst({
      where: { id: req.params.id, userId: req.user!.id, deletedAt: null },
      include: {
        logs: {
          orderBy: { completedOn: 'desc' },
        },
      },
    });

    if (!habit) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Habit not found' } });
    }

    res.json({ success: true, data: { habit } });
  } catch (error) {
    next(error);
  }
});

// ─── PATCH /api/v1/habits/:id ────────────────────────────────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const data = habitUpdateSchema.parse(req.body);

    const habit = await prisma.habit.findFirst({
      where: { id: req.params.id, userId: req.user!.id, deletedAt: null },
    });

    if (!habit) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Habit not found' } });
    }

    const updated = await prisma.habit.update({
      where: { id: habit.id },
      data: {
        title: data.title !== undefined ? data.title : undefined,
        frequency: data.frequency !== undefined ? data.frequency : undefined,
        targetDaysOfWeek: data.targetDaysOfWeek !== undefined ? data.targetDaysOfWeek : undefined,
        reminderTime: data.reminderTime !== undefined ? data.reminderTime : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
    });

    res.json({ success: true, data: { habit: updated } });
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /api/v1/habits/:id ───────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const habit = await prisma.habit.findFirst({
      where: { id: req.params.id, userId: req.user!.id, deletedAt: null },
    });

    if (!habit) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Habit not found' } });
    }

    await prisma.habit.update({
      where: { id: habit.id },
      data: { deletedAt: new Date(), isActive: false },
    });

    res.json({ success: true, message: 'Habit deleted' });
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /api/v1/habits/:id/log ───────────────────────────────────────────
const habitUnlogSchema = z.object({
  completedOn: z.string(), // YYYY-MM-DD
});

router.delete('/:id/log', async (req, res, next) => {
  try {
    const data = habitUnlogSchema.parse(req.body);
    const date = new Date(data.completedOn as string);
    date.setUTCHours(0, 0, 0, 0);

    const habit = await prisma.habit.findFirst({
      where: { id: req.params.id, userId: req.user!.id, deletedAt: null },
    });

    if (!habit) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Habit not found' } });
    }

    await prisma.habitLog.delete({
      where: {
        habitId_completedOn: {
          habitId: habit.id,
          completedOn: date,
        },
      },
    });

    await prisma.habit.update({
      where: { id: habit.id },
      data: {
        currentStreak: Math.max(0, habit.currentStreak - 1),
      },
    });

    res.json({ success: true, message: 'Habit log deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
