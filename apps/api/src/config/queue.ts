import { Queue } from 'bullmq';
import { redis } from './redis';

export const reminderQueue = new Queue('reminders-queue', {
  connection: redis as any,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 100,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

export const prioritizationQueue = new Queue('prioritization-queue', {
  connection: redis as any,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

export const calendarSyncQueue = new Queue('calendar-sync-queue', {
  connection: redis as any,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 100,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});
