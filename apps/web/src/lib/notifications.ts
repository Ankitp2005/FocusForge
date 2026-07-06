import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
}

export function getNotificationId(taskId: string): number {
  let hash = 0;
  for (let i = 0; i < taskId.length; i++) {
    hash = taskId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash | 0);
}

export async function syncLocalNotifications(tasks: Task[]) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Get already scheduled pending notifications
    const pendingReq = await LocalNotifications.getPending();
    const pendingList = pendingReq.notifications || [];

    const now = new Date();
    const activeTasksWithDueDates = tasks.filter((task) => {
      if (task.status === 'COMPLETED' || task.status === 'CANCELLED') return false;
      if (!task.dueDate) return false;
      
      const due = new Date(task.dueDate);
      return due > now; // Must be in the future
    });

    const activeNotificationIds = new Set<number>();
    const toSchedule: any[] = [];

    for (const task of activeTasksWithDueDates) {
      const id = getNotificationId(task.id);
      activeNotificationIds.add(id);

      const due = new Date(task.dueDate!);
      
      // We always schedule/reschedule to make sure it contains the latest title/status
      // Re-scheduling with the same ID automatically overrides/updates the alarm in Capacitor
      toSchedule.push({
        id,
        title: `🚨 ${task.priority} PRIORITY DUE — FOCUSFORGE`,
        body: `"${task.title}" requires your immediate attention.`,
        schedule: { at: due },
        channelId: 'focusforge-sound-alarms',
        extra: {
          taskId: task.id,
        },
      });
    }

    // Cancel any notifications that are no longer active (completed, deleted, or past)
    const toCancel: number[] = [];
    for (const pending of pendingList) {
      if (!activeNotificationIds.has(pending.id)) {
        toCancel.push(pending.id);
      }
    }

    if (toCancel.length > 0) {
      await LocalNotifications.cancel({
        notifications: toCancel.map((id) => ({ id })),
      });
      console.log(`[Notifications] Cancelled ${toCancel.length} outdated alarms`);
    }

    if (toSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: toSchedule,
      });
      console.log(`[Notifications] Scheduled/Updated ${toSchedule.length} alarms`);
    }
  } catch (err) {
    console.error('[Notifications] Failed to sync local notifications:', err);
  }
}
