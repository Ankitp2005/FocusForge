import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { initializeSocket, disconnectSocket } from '@/lib/socket';

interface ReminderPayload {
  reminderId: string;
  taskId: string;
  title: string;
  priority: string;
  message: string;
}

/**
 * useWebSocket — initializes a WebSocket connection per ARCHITECTURE.md §3
 * Listens to:
 *   - TASK_UPDATED → invalidates the tasks query cache
 *   - REMINDER_FIRED → calls onReminder for in-app banner
 */
export const useWebSocket = (token: string | null, onReminder?: (reminder: ReminderPayload) => void) => {
  const queryClient = useQueryClient();
  const socketRef = useRef<ReturnType<typeof initializeSocket>>(null);
  const isConnectedRef = useRef(false);

  useEffect(() => {
    if (!token || isConnectedRef.current) return;

    const handleTaskUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };

    const handleReminderFired = (reminder: ReminderPayload) => {
      if (onReminder) onReminder(reminder);
    };

    socketRef.current = initializeSocket(token, handleTaskUpdated, handleReminderFired);
    isConnectedRef.current = true;

    return () => {
      disconnectSocket();
      isConnectedRef.current = false;
    };
  }, [token, queryClient, onReminder]);

  return { socket: socketRef.current };
};
