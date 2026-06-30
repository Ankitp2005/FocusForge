import { io, Socket } from 'socket.io-client';
import { env } from './env';

let socket: Socket | null = null;

export const initializeSocket = (token: string, onTaskUpdated?: () => void, onReminderFired?: (reminder: any) => void) => {
  if (!token) return null;

  // If already initialized, disconnect first
  if (socket) {
    socket.disconnect();
  }

  const apiHost = env.VITE_API_URL.replace('/api/v1', '');

  socket = io(apiHost, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('Connected to FocusForge WebSocket server');
  });

  if (onTaskUpdated) {
    socket.on('TASK_UPDATED', () => {
      console.log('Tasks updated event received from server');
      onTaskUpdated();
    });
  }

  if (onReminderFired) {
    socket.on('REMINDER_FIRED', (reminder) => {
      console.log('Reminder fired event received from server', reminder);
      onReminderFired(reminder);
    });
  }

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('Disconnected from WebSocket server:', reason);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
