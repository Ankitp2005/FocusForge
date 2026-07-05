import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { prisma } from '../config/database';
import { TaskStatus, Priority } from '@prisma/client';
import { parseTaskWithAI } from '../services/ai';
import { reminderQueue, prioritizationQueue } from '../config/queue';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { saveTaskEmbedding, generateEmbedding } from '../services/embeddings';
import { logAudit } from '../services/audit';
import { calculatePriorityScore } from '../utils/priority';
import { emitToUser } from '../config/websocket';

const router = Router();
router.use(authenticate);

// Validation schemas
const taskCreateSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  category: z.string().optional().nullable(),
  estimatedMins: z.number().int().positive().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  rawInput: z.string().optional(),
  parseWithAI: z.boolean().optional().default(false),
});

const taskUpdateSchema = taskCreateSchema.partial();

// Shared priority utility imported at top

import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../services/googleCalendar';

async function syncTaskToGoogleCalendar(taskId: string, userId: string, action: 'create' | 'update' | 'delete') {
  try {
    const integration = await prisma.calendarIntegration.findFirst({
      where: { userId, provider: 'google', syncEnabled: true },
    });
    if (!integration) return;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });
    if (!task || task.deletedAt) {
      if (task?.calendarEventId) {
        await deleteCalendarEvent(integration.accessToken, integration.refreshToken, task.calendarEventId);
        await prisma.task.update({ where: { id: taskId }, data: { calendarEventId: null } });
      }
      return;
    }

    if (action === 'delete') {
      if (task.calendarEventId) {
        await deleteCalendarEvent(integration.accessToken, integration.refreshToken, task.calendarEventId);
        await prisma.task.update({ where: { id: taskId }, data: { calendarEventId: null } });
      }
      return;
    }

    if (!task.dueDate) {
      if (task.calendarEventId) {
        await deleteCalendarEvent(integration.accessToken, integration.refreshToken, task.calendarEventId);
        await prisma.task.update({ where: { id: taskId }, data: { calendarEventId: null } });
      }
      return;
    }

    const durationMins = task.estimatedMins || 30;
    const startTime = new Date(task.dueDate);
    const endTime = new Date(startTime.getTime() + durationMins * 60 * 1000);

    const eventPayload = {
      summary: task.title,
      description: task.description || `FocusForge Task. Priority: ${task.priority}`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    };

    if (task.calendarEventId) {
      await updateCalendarEvent(integration.accessToken, integration.refreshToken, task.calendarEventId, eventPayload);
    } else {
      const event = await createCalendarEvent(integration.accessToken, integration.refreshToken, eventPayload);
      await prisma.task.update({
        where: { id: taskId },
        data: { calendarEventId: event.id },
      });
    }
  } catch (err) {
    logger.error(`Failed to sync task ${taskId} to Google Calendar`, err);
  }
}

// ─── GET /api/v1/tasks ───────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    // Lazy Unsnooze: Automatically revert SNOOZED tasks to PENDING if snooze window expired
    await prisma.task.updateMany({
      where: {
        userId: req.user!.id,
        status: 'SNOOZED',
        snoozedUntil: { lte: new Date() },
        deletedAt: null,
      },
      data: {
        status: 'PENDING',
        snoozedUntil: null,
      },
    });

    const { status, priority, category, dueBefore, dueAfter, includeOverdue = 'true', sort = 'priorityScore', order = 'desc', page = '1', perPage = '20' } = req.query;

    const where: any = { userId: req.user!.id, deletedAt: null };

    if (status && typeof status === 'string') {
      where.status = { in: status.split(',') };
    } else {
      where.status = { in: ['PENDING', 'IN_PROGRESS'] };
    }

    if (priority && priority !== 'all') where.priority = priority;
    if (category && category !== 'all') where.category = category;

    if (dueBefore || dueAfter) {
      where.dueDate = {};
      if (dueBefore) where.dueDate.lte = new Date(dueBefore as string);
      if (dueAfter) where.dueDate.gte = new Date(dueAfter as string);
    }

    // includeOverdue logic: if 'false', exclude overdue tasks
    if (includeOverdue === 'false') {
      const now = new Date();
      where.OR = [
        { dueDate: null },
        { dueDate: { gte: now } }
      ];
    }

    const skip = (Number(page) - 1) * Number(perPage);
    const take = Math.min(Number(perPage), 100);

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take,
        orderBy: { [sort as string]: order },
        include: { reminders: { where: { status: 'PENDING' } } },
      }),
      prisma.task.count({ where }),
    ]);

    res.json({
      success: true,
      data: { tasks },
      meta: {
        page: Number(page),
        perPage: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/v1/tasks ──────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    let data = taskCreateSchema.parse(req.body);

    if (data.parseWithAI && data.rawInput) {
      const userTimezone = req.user?.timezone || 'UTC';
      const aiResult = await parseTaskWithAI(data.rawInput, userTimezone);
      
      // Override values from AI parsing
      data = {
        ...data,
        title: aiResult.title,
        description: aiResult.description || data.description,
        dueDate: aiResult.dueDate || data.dueDate,
        priority: aiResult.priority,
        category: aiResult.category || data.category,
        estimatedMins: aiResult.estimatedMins || data.estimatedMins,
        tags: aiResult.tags.length > 0 ? aiResult.tags : data.tags,
      };
    }

    if (!data.title) {
      throw new z.ZodError([
        {
          code: 'custom',
          path: ['title'],
          message: 'Title is required',
        },
      ]);
    }

    const finalDueDate = data.dueDate ? new Date(data.dueDate as string) : null;
    const initialScore = calculatePriorityScore(data.priority, finalDueDate, new Date());

    const task = await prisma.task.create({
      data: {
        userId: req.user!.id,
        title: data.title,
        description: data.description,
        dueDate: finalDueDate,
        priority: data.priority,
        category: data.category,
        estimatedMins: data.estimatedMins,
        tags: data.tags,
        sourceInput: data.rawInput,
        priorityScore: initialScore,
      },
    });

    // Save task embedding in background
    saveTaskEmbedding(task.id, task.title + ' ' + (data.description || '')).catch((err) => {
      logger.error(`Failed to save task embedding for ${task.id}`, err);
    });

    emitToUser(req.user!.id, 'TASK_UPDATED', { type: 'create', taskId: task.id });

    syncTaskToGoogleCalendar(task.id, req.user!.id, 'create').catch((err) => {
      logger.error(`Failed to sync new task ${task.id} to calendar`, err);
    });

    // Schedule reminder and prioritize
    if (finalDueDate) {
      const userPrefs = await prisma.userPreferences.findUnique({
        where: { userId: req.user!.id },
      });
      // Only schedule reminder if enableSmartReminders is not explicitly disabled
      const smartRemindersEnabled = userPrefs?.enableSmartReminders !== false;
      if (smartRemindersEnabled) {
        const leadTimeMins = userPrefs?.reminderLeadTimeMinutes ?? 60;
        let remindAt = new Date(finalDueDate.getTime() - leadTimeMins * 60 * 1000);
        
        // If the calculated reminder time is in the past, but the task is still due in the future,
        // remind the user at the exact due time instead of firing immediately.
        if (remindAt.getTime() < Date.now() && finalDueDate.getTime() > Date.now()) {
          remindAt = finalDueDate;
        }

        const reminder = await prisma.taskReminder.create({
          data: {
            taskId: task.id,
            userId: req.user!.id,
            remindAt,
            status: 'PENDING',
          },
        });

        const delay = Math.max(0, remindAt.getTime() - Date.now());
        await reminderQueue.add(
          'send-reminder',
          { reminderId: reminder.id },
          { delay, jobId: `reminder-${reminder.id}` }
        );
      }
    }

    await prioritizationQueue.add(
      'recalc-priority',
      { userId: req.user!.id },
      { jobId: `prioritize-${req.user!.id}-${Date.now()}` }
    );

    logAudit(req, {
      action: 'task.create',
      resourceType: 'task',
      resourceId: task.id,
      success: true,
      metadata: { title: task.title, priority: task.priority },
    });

    res.status(201).json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/v1/tasks/:id ───────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.user!.id, deletedAt: null },
      include: { subtasks: true, reminders: true },
    });

    if (!task) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
    }

    res.json({ success: true, data: { task } });
  } catch (error) {
    next(error);
  }
});

// ─── PATCH /api/v1/tasks/:id ─────────────────────────────────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const data = taskUpdateSchema.parse(req.body);

    const task = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.user!.id, deletedAt: null },
    });

    if (!task) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
    }

    const newPriority = data.priority || task.priority;
    const newDueDate = data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate as string) : null) : task.dueDate;
    const newScore = calculatePriorityScore(newPriority, newDueDate, task.createdAt);

    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: {
        ...data,
        dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate as string) : null) : undefined,
        priorityScore: newScore,
      },
    });

    syncTaskToGoogleCalendar(updatedTask.id, req.user!.id, 'update').catch((err) => {
      logger.error(`Failed to sync task ${updatedTask.id} update to calendar`, err);
    });

    emitToUser(req.user!.id, 'TASK_UPDATED', { type: 'update', taskId: updatedTask.id });

    // Update embedding if title or description changes
    if (data.title !== undefined || data.description !== undefined) {
      saveTaskEmbedding(task.id, (data.title || task.title) + ' ' + (data.description !== undefined ? (data.description || '') : (task.description || ''))).catch((err) => {
        logger.error(`Failed to update task embedding for ${task.id}`, err);
      });
    }

    // If dueDate or priority changes, re-evaluate reminders and prioritization
    if (data.dueDate !== undefined || data.priority !== undefined) {
      // Remove old reminder jobs
      const oldReminders = await prisma.taskReminder.findMany({
        where: { taskId: task.id, status: 'PENDING' },
      });
      for (const oldRem of oldReminders) {
        const job = await reminderQueue.getJob(`reminder-${oldRem.id}`);
        if (job) await job.remove();
      }
      await prisma.taskReminder.deleteMany({
        where: { taskId: task.id, status: 'PENDING' },
      });

      // Schedule new reminder if new due date is set
      if (newDueDate) {
        const userPrefs = await prisma.userPreferences.findUnique({
          where: { userId: req.user!.id },
        });
        // Only schedule reminder if enableSmartReminders is not explicitly disabled
        const smartRemindersEnabled = userPrefs?.enableSmartReminders !== false;
        if (smartRemindersEnabled) {
          const leadTimeMins = userPrefs?.reminderLeadTimeMinutes ?? 60;
          const remindAt = new Date(newDueDate.getTime() - leadTimeMins * 60 * 1000);

          const reminder = await prisma.taskReminder.create({
            data: {
              taskId: task.id,
              userId: req.user!.id,
              remindAt,
              status: 'PENDING',
            },
          });

          const delay = Math.max(0, remindAt.getTime() - Date.now());
          await reminderQueue.add(
            'send-reminder',
            { reminderId: reminder.id },
            { delay, jobId: `reminder-${reminder.id}` }
          );
        }
      }

      // Recalculate priority
      await prioritizationQueue.add(
        'recalc-priority',
        { userId: req.user!.id },
        { jobId: `prioritize-${req.user!.id}-${Date.now()}` }
      );
    }

    logAudit(req, {
      action: 'task.update',
      resourceType: 'task',
      resourceId: updatedTask.id,
      success: true,
      metadata: { updatedFields: Object.keys(data) },
    });

    res.json({ success: true, data: { task: updatedTask } });
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /api/v1/tasks/:id ────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.user!.id, deletedAt: null },
    });

    if (!task) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
    }

    // Remove old reminder jobs
    const oldReminders = await prisma.taskReminder.findMany({
      where: { taskId: task.id, status: 'PENDING' },
    });
    for (const oldRem of oldReminders) {
      const job = await reminderQueue.getJob(`reminder-${oldRem.id}`);
      if (job) await job.remove();
    }
    await prisma.taskReminder.deleteMany({
      where: { taskId: task.id, status: 'PENDING' },
    });

    await prisma.task.update({
      where: { id: task.id },
      data: { deletedAt: new Date() },
    });

    syncTaskToGoogleCalendar(task.id, req.user!.id, 'delete').catch((err) => {
      logger.error(`Failed to sync task ${task.id} deletion to calendar`, err);
    });

    // Recalculate priority
    await prioritizationQueue.add(
      'recalc-priority',
      { userId: req.user!.id },
      { jobId: `prioritize-${req.user!.id}-${Date.now()}` }
    );

    logAudit(req, {
      action: 'task.delete',
      resourceType: 'task',
      resourceId: task.id,
      success: true,
    });

    emitToUser(req.user!.id, 'TASK_UPDATED', { type: 'delete', taskId: task.id });

    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/v1/tasks/:id/complete ─────────────────────────────────────────
router.post('/:id/complete', async (req, res, next) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.user!.id, deletedAt: null },
    });

    if (!task) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
    }

    // Remove old reminder jobs
    const oldReminders = await prisma.taskReminder.findMany({
      where: { taskId: task.id, status: 'PENDING' },
    });
    for (const oldRem of oldReminders) {
      const job = await reminderQueue.getJob(`reminder-${oldRem.id}`);
      if (job) await job.remove();
    }
    await prisma.taskReminder.deleteMany({
      where: { taskId: task.id, status: 'PENDING' },
    });

    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: { status: TaskStatus.COMPLETED, completedAt: new Date() },
    });

    // Recalculate priority
    await prioritizationQueue.add(
      'recalc-priority',
      { userId: req.user!.id },
      { jobId: `prioritize-${req.user!.id}-${Date.now()}` }
    );

    logAudit(req, {
      action: 'task.complete',
      resourceType: 'task',
      resourceId: updatedTask.id,
      success: true,
    });

    emitToUser(req.user!.id, 'TASK_UPDATED', { type: 'complete', taskId: updatedTask.id });

    res.json({
      success: true,
      data: {
        task: updatedTask,
        celebrationMessage: 'Great work! Task completed 🎉',
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/v1/tasks/search ────────────────────────────────────────────────
router.get('/search', async (req, res, next) => {
  try {
    const { q, limit = '10' } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Query parameter q is required' },
      });
    }

    const userId = req.user!.id;
    const limitNum = Math.min(parseInt(limit as string, 10) || 10, 50);

    const embedding = await generateEmbedding(q);
    const vectorStr = `[${embedding.join(',')}]`;

    // Perform vector similarity search
    const results: any[] = await prisma.$queryRaw`
      SELECT 
        t.id, 
        t.title, 
        t.description, 
        t.status, 
        t.priority, 
        t."priorityScore", 
        t.category, 
        t.tags, 
        t."dueDate", 
        t."estimatedMins", 
        t."isRecurring", 
        t."completedAt", 
        t."createdAt", 
        t."updatedAt",
        1 - (te.embedding <=> ${vectorStr}::vector) as similarity
      FROM "Task" t
      JOIN "TaskEmbedding" te ON t.id = te."taskId"
      WHERE t."userId" = ${userId} AND t."deletedAt" IS NULL
      ORDER BY te.embedding <=> ${vectorStr}::vector ASC
      LIMIT ${limitNum}
    `;

    res.json({
      success: true,
      data: {
        tasks: results.map((r) => ({
          ...r,
          similarity: parseFloat(r.similarity),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/v1/tasks/:id/snooze ───────────────────────────────────────────
const snoozeSchema = z.object({
  snoozeUntil: z.string().datetime(),
  useSmartSnooze: z.boolean().optional().default(false),
});

router.post('/:id/snooze', async (req, res, next) => {
  try {
    const { snoozeUntil, useSmartSnooze } = snoozeSchema.parse(req.body);

    const task = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.user!.id, deletedAt: null },
    });

    if (!task) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
    }

    let finalSnoozeUntil = new Date(snoozeUntil);

    if (useSmartSnooze && env.GEMINI_API_KEY && !env.GEMINI_API_KEY.startsWith('mock_')) {
      try {
        const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const userPrefs = await prisma.userPreferences.findUnique({
          where: { userId: req.user!.id },
        });

        const prompt = `You are a smart productivity assistant. The user wants to snooze the task: "${task.title}".
Current task details:
- Description: ${task.description || 'none'}
- Due Date: ${task.dueDate ? task.dueDate.toISOString() : 'none'}
- Priority: ${task.priority}
- User Work Hours: ${userPrefs?.workStartHour || 9}:00 to ${userPrefs?.workEndHour || 18}:00
- User requested snooze time: ${snoozeUntil}
- Current server time: ${new Date().toISOString()}

Determine the optimal time to resume this task. Avoid scheduling it during user DND hours or in conflict with the due date.
Return ONLY a valid ISO8601 datetime string, with no other text, markdown block, or explanations.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const cleanedText = text.replace(/```[a-z]*|```/g, '').trim();
        const dateMatch = new Date(cleanedText);
        if (!isNaN(dateMatch.getTime())) {
          finalSnoozeUntil = dateMatch;
        }
      } catch (aiErr) {
        logger.error('Smart snooze AI calculation failed, falling back to requested time', aiErr);
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: {
        status: TaskStatus.SNOOZED,
        snoozedUntil: finalSnoozeUntil,
      },
    });

    // Remove old pending reminders and schedule new reminder
    const oldReminders = await prisma.taskReminder.findMany({
      where: { taskId: task.id, status: 'PENDING' },
    });
    for (const oldRem of oldReminders) {
      const job = await reminderQueue.getJob(`reminder-${oldRem.id}`);
      if (job) await job.remove();
    }
    await prisma.taskReminder.deleteMany({
      where: { taskId: task.id, status: 'PENDING' },
    });

    const userPrefs = await prisma.userPreferences.findUnique({
      where: { userId: req.user!.id },
    });
    const smartRemindersEnabled = userPrefs?.enableSmartReminders !== false;
    const leadTimeMins = userPrefs?.reminderLeadTimeMinutes ?? 60;
    const remindAt = new Date(finalSnoozeUntil.getTime() - leadTimeMins * 60 * 1000);
    const finalRemindAt = remindAt.getTime() > Date.now() ? remindAt : finalSnoozeUntil;

    if (smartRemindersEnabled) {
      const reminder = await prisma.taskReminder.create({
        data: {
          taskId: task.id,
          userId: req.user!.id,
          remindAt: finalRemindAt,
          status: 'PENDING',
        },
      });

      const delay = Math.max(0, finalRemindAt.getTime() - Date.now());
      await reminderQueue.add(
        'send-reminder',
        { reminderId: reminder.id },
        { delay, jobId: `reminder-${reminder.id}` }
      );
    }

    // Recalculate priority
    await prioritizationQueue.add(
      'recalc-priority',
      { userId: req.user!.id },
      { jobId: `prioritize-${req.user!.id}-${Date.now()}` }
    );

    logAudit(req, {
      action: 'task.snooze',
      resourceType: 'task',
      resourceId: updatedTask.id,
      success: true,
      metadata: { snoozedUntil: finalSnoozeUntil.toISOString() },
    });

    emitToUser(req.user!.id, 'TASK_UPDATED', { type: 'snooze', taskId: updatedTask.id });

    res.json({
      success: true,
      data: {
        task: updatedTask,
        snoozedUntil: finalSnoozeUntil.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
