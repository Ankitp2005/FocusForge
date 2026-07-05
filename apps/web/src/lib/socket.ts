import { io, Socket } from 'socket.io-client';
import { env } from './env';

let socket: Socket | null = null;

export const initializeSocket = (token: string, onTaskUpdated?: () => void, onReminderFired?: (reminder: any) => void) => {
  if (!token) return null;

  // If already initialized and connected, reuse to avoid duplicate connections
  if (socket && socket.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const apiHost = env.VITE_API_URL.replace('/api/v1', '');

  socket = io(apiHost, {
    auth: { token },
    transports: ['websocket'],
    // --- Reconnection config ---
    // Automatically attempt to reconnect when the connection drops (e.g. phone goes to sleep)
    reconnection: true,
    reconnectionAttempts: 10,          // try up to 10 times before giving up
    reconnectionDelay: 2000,           // wait 2s between attempts
    reconnectionDelayMax: 10000,       // cap at 10s delay
    timeout: 20000,                    // connection timeout
  });

  // Attach listeners helper — called on connect and re-called on every reconnect
  // This is critical: after reconnect, the socket is a new internal object and old
  // listeners registered before the disconnect are no longer active.
  const attachListeners = () => {
    if (onTaskUpdated) {
      socket!.off('TASK_UPDATED');
      socket!.on('TASK_UPDATED', () => {
        console.log('[WS] Tasks updated event received from server');
        onTaskUpdated();
      });
    }

    if (onReminderFired) {
      socket!.off('REMINDER_FIRED');
      socket!.on('REMINDER_FIRED', (reminder) => {
        console.log('[WS] Reminder fired event received from server', reminder);
        onReminderFired(reminder);
      });
    }
  };

  socket.on('connect', () => {
    console.log('[WS] Connected to FocusForge WebSocket server');
    attachListeners();
  });

  // Re-attach listeners after every automatic reconnect
  socket.on('reconnect', (attempt: number) => {
    console.log(`[WS] Reconnected after ${attempt} attempt(s) — re-attaching listeners`);
    attachListeners();
  });

  socket.on('reconnect_attempt', (attempt: number) => {
    console.log(`[WS] Reconnection attempt #${attempt}...`);
  });

  socket.on('reconnect_failed', () => {
    console.warn('[WS] All reconnection attempts exhausted. Notifications will not be delivered until next app open.');
  });

  socket.on('connect_error', (error) => {
    console.error('[WS] WebSocket connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[WS] Disconnected from WebSocket server:', reason);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
