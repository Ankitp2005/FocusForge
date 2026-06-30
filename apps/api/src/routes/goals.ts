import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';
import { GoalStatus } from '@prisma/client';

const router = Router();
router.use(authenticate);

const goalCreateSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  targetDate: z.string().datetime().optional().nullable(),
});

const milestoneSchema = z.object({
  title: z.string().min(1),
  dueDate: z.string().datetime().optional().nullable(),
  order: z.number().int().default(0),
});

const milestonesCreateSchema = z.object({
  milestones: z.array(milestoneSchema).min(1),
});

// ─── GET /api/v1/goals ───────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.user!.id, deletedAt: null },
      include: { milestones: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: { goals } });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/v1/goals ──────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const data = goalCreateSchema.parse(req.body);

    const goal = await prisma.goal.create({
      data: {
        userId: req.user!.id,
        title: data.title,
        description: data.description,
        category: data.category,
        targetDate: data.targetDate ? new Date(data.targetDate as string) : null,
      },
      include: { milestones: true },
    });

    res.status(201).json({ success: true, data: { goal } });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/v1/goals/:id/milestones ───────────────────────────────────────
router.post('/:id/milestones', async (req, res, next) => {
  try {
    const data = milestonesCreateSchema.parse(req.body);
    
    const goal = await prisma.goal.findFirst({
      where: { id: req.params.id, userId: req.user!.id, deletedAt: null },
    });

    if (!goal) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Goal not found' } });
    }

    await prisma.goalMilestone.createMany({
      data: data.milestones.map((m) => ({
        goalId: goal.id,
        title: m.title,
        dueDate: m.dueDate ? new Date(m.dueDate as string) : null,
        order: m.order,
      })),
    });

    const updatedGoal = await prisma.goal.findUnique({
      where: { id: goal.id },
      include: { milestones: { orderBy: { order: 'asc' } } },
    });

    res.status(201).json({ success: true, data: { goal: updatedGoal } });
  } catch (error) {
    next(error);
  }
});

const goalUpdateSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  targetDate: z.string().datetime().optional().nullable(),
  status: z.nativeEnum(GoalStatus).optional(),
});

// ─── GET /api/v1/goals/:id ───────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const goal = await prisma.goal.findFirst({
      where: { id: req.params.id, userId: req.user!.id, deletedAt: null },
      include: { milestones: { orderBy: { order: 'asc' } } },
    });

    if (!goal) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Goal not found' } });
    }

    res.json({ success: true, data: { goal } });
  } catch (error) {
    next(error);
  }
});

// ─── PATCH /api/v1/goals/:id ─────────────────────────────────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const data = goalUpdateSchema.parse(req.body);

    const goal = await prisma.goal.findFirst({
      where: { id: req.params.id, userId: req.user!.id, deletedAt: null },
    });

    if (!goal) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Goal not found' } });
    }

    const updated = await prisma.goal.update({
      where: { id: goal.id },
      data: {
        title: data.title !== undefined ? data.title : undefined,
        description: data.description !== undefined ? data.description : undefined,
        category: data.category !== undefined ? data.category : undefined,
        status: data.status !== undefined ? data.status : undefined,
        targetDate: data.targetDate !== undefined ? (data.targetDate ? new Date(data.targetDate) : null) : undefined,
      },
      include: { milestones: { orderBy: { order: 'asc' } } },
    });

    res.json({ success: true, data: { goal: updated } });
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /api/v1/goals/:id ────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const goal = await prisma.goal.findFirst({
      where: { id: req.params.id, userId: req.user!.id, deletedAt: null },
    });

    if (!goal) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Goal not found' } });
    }

    await prisma.goal.update({
      where: { id: goal.id },
      data: { deletedAt: new Date() },
    });

    res.json({ success: true, message: 'Goal deleted' });
  } catch (error) {
    next(error);
  }
});

// ─── PATCH /api/v1/goals/:goalId/milestones/:id ──────────────────────────────
const milestoneUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  isCompleted: z.boolean().optional(),
  completedAt: z.string().datetime().optional().nullable(),
});

router.patch('/:goalId/milestones/:id', async (req, res, next) => {
  try {
    const data = milestoneUpdateSchema.parse(req.body);

    const goal = await prisma.goal.findFirst({
      where: { id: req.params.goalId, userId: req.user!.id, deletedAt: null },
    });

    if (!goal) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Goal not found' } });
    }

    const milestone = await prisma.goalMilestone.findFirst({
      where: { id: req.params.id, goalId: goal.id },
    });

    if (!milestone) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Milestone not found' } });
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.isCompleted !== undefined) {
      updateData.isCompleted = data.isCompleted;
      updateData.completedAt = data.isCompleted ? new Date() : null;
    }

    await prisma.goalMilestone.update({
      where: { id: milestone.id },
      data: updateData,
    });

    const updatedGoal = await prisma.goal.findUnique({
      where: { id: goal.id },
      include: { milestones: { orderBy: { order: 'asc' } } },
    });

    res.json({ success: true, data: { goal: updatedGoal } });
  } catch (error) {
    next(error);
  }
});

export default router;
