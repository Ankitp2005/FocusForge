import { Worker, Job } from 'bullmq';
import { redis } from './config/redis';
import { prisma } from './config/database';
import { emitToUser } from './config/websocket';
import { logger } from './config/logger';
import { env } from './config/env';
import { ReminderStatus, TaskStatus } from '@prisma/client';
import { fetchCalendarEvents } from './services/googleCalendar';
import { sendReminderEmail } from './services/email';
import { calculatePriorityScore } from './utils/priority';

console.log('👷 Worker process starting...');
logger.info('Worker process starting...');
logger.info(`Environment: ${env.NODE_ENV}`);

// Shared priority utility imported at top

// 1. Prioritization Worker
const prioritizationWorker = new Worker(
  'prioritization-queue',
  async (job: Job<{ userId: string }>) => {
    const { userId } = job.data;
    logger.info(`Processing prioritization queue for user: ${userId}`);

    // Fetch all pending / in-progress tasks
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    });

    // Update each task's priorityScore in DB
    const updates = tasks.map((task) => {
      const newScore = calculatePriorityScore(task.priority, task.dueDate, task.createdAt);
      return prisma.task.update({
        where: { id: task.id },
        data: { priorityScore: newScore },
      });
    });

    await prisma.$transaction(updates);

    // Emit event to client via WebSocket to refresh task list
    emitToUser(userId, 'TASK_UPDATED', { type: 'prioritization', timestamp: new Date() });
    logger.info(`Prioritization complete for user: ${userId}`);
  },
  { connection: redis as any }
);

// 2. Reminders Worker
const remindersWorker = new Worker(
  'reminders-queue',
  async (job: Job<{ reminderId: string }>) => {
    const { reminderId } = job.data;
    logger.info(`Processing reminder job: ${reminderId}`);

    const reminder = await prisma.taskReminder.findUnique({
      where: { id: reminderId },
      include: { task: true },
    });

    if (!reminder) {
      logger.warn(`Reminder ${reminderId} not found in database.`);
      return;
    }

    // Check if task is still pending or in progress
    if (reminder.task.status === TaskStatus.COMPLETED || reminder.task.status === TaskStatus.CANCELLED) {
      logger.info(`Task ${reminder.task.id} is already completed/cancelled. Skipping reminder.`);
      await prisma.taskReminder.update({
        where: { id: reminderId },
        data: { status: ReminderStatus.DISMISSED },
      });
      return;
    }

    // Create warning message (personalized)
    let message = reminder.message;
    if (!message) {
      const urgencyStr = reminder.task.priority === 'CRITICAL' ? '🔴 CRITICAL: ' : '⚠️ WARNING: ';
      message = `${urgencyStr}"${reminder.task.title}" requires immediate attention.`;
    }

    // Update reminder status
    await prisma.taskReminder.update({
      where: { id: reminderId },
      data: {
        status: ReminderStatus.SENT,
        sentAt: new Date(),
        message,
      },
    });

    // Push real-time WS notification
    emitToUser(reminder.userId, 'REMINDER_FIRED', {
      reminderId: reminder.id,
      taskId: reminder.task.id,
      title: reminder.task.title,
      priority: reminder.task.priority,
      message,
    });

    // Send background email notification
    try {
      const user = await prisma.user.findUnique({
        where: { id: reminder.userId },
        select: { email: true },
      });
      if (user && user.email) {
        await sendReminderEmail(user.email, reminder.task.title, reminder.task.priority, message);
      }
    } catch (emailErr) {
      logger.error(`Failed to dispatch email notification for reminder ${reminderId}`, emailErr);
    }

    logger.info(`Reminder fired successfully for user ${reminder.userId}`);
  },
  { connection: redis as any }
);

// Listen to errors
prioritizationWorker.on('failed', (job, err) => {
  logger.error(`Prioritization job failed: ${job?.id}`, err);
});

remindersWorker.on('failed', (job, err) => {
  logger.error(`Reminder job failed: ${job?.id}`, err);
});

// 3. Calendar Sync Worker
const calendarSyncWorker = new Worker(
  'calendar-sync-queue',
  async (job: Job<{ userId: string }>) => {
    const { userId } = job.data;
    logger.info(`Processing calendar sync for user: ${userId}`);

    const integration = await prisma.calendarIntegration.findFirst({
      where: { userId, provider: 'google', syncEnabled: true },
    });

    if (!integration) {
      logger.info(`No active calendar integration for user ${userId}. Skipping sync.`);
      return;
    }

    try {
      const events = await fetchCalendarEvents(integration.accessToken, integration.refreshToken);
      logger.info(`Fetched ${events.length} calendar events for user ${userId}`);

      await prisma.calendarIntegration.update({
        where: { id: integration.id },
        data: { lastSyncedAt: new Date() },
      });

      emitToUser(userId, 'CALENDAR_SYNCED', { timestamp: new Date(), count: events.length });
    } catch (err) {
      logger.error(`Calendar sync failed for user ${userId}`, err);
      throw err;
    }
  },
  { connection: redis as any }
);

calendarSyncWorker.on('failed', (job, err) => {
  logger.error(`Calendar sync job failed: ${job?.id}`, err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Worker shutting down...');
  await prioritizationWorker.close();
  await remindersWorker.close();
  await calendarSyncWorker.close();
  process.exit(0);
});
