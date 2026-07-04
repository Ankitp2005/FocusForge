import { Server, Socket } from 'socket.io';
import { supabase } from './supabase';
import { prisma } from './database';
import { logger } from './logger';

let globalIo: Server | null = null;

export function setupWebSocket(io: Server) {
  globalIo = io;

  // Authentication Middleware for Socket.io
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: Missing token'));
      }

      // Verify token with Supabase Auth
      const { data: { user: sbUser }, error: sbError } = await supabase.auth.getUser(token);

      if (sbError || !sbUser) {
        return next(new Error('Authentication error: Invalid or expired token'));
      }

      const supabaseId = sbUser.id;
      const user = await prisma.user.findUnique({
        where: { supabaseId, deletedAt: null },
      });

      if (!user) {
        return next(new Error('Authentication error: User not synced'));
      }

      socket.data = { userId: user.id };
      next();
    } catch (err) {
      logger.error('WebSocket auth failed:', err);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    const roomName = `user_${userId}`;
    
    socket.join(roomName);
    logger.info(`WebSocket client connected: ${socket.id} (User: ${userId}) joined room: ${roomName}`);

    socket.on('disconnect', () => {
      logger.info(`WebSocket client disconnected: ${socket.id} (User: ${userId})`);
    });
  });
}

export function emitToUser<T>(userId: string, event: string, payload: T) {
  if (globalIo) {
    const roomName = `user_${userId}`;
    globalIo.to(roomName).emit(event, payload);
    logger.info(`WebSocket event '${event}' emitted to room '${roomName}'`);
  } else {
    logger.warn(`Could not emit event: Socket.io is not initialized`);
  }
}
