import { Server, Socket } from 'socket.io';
import { supabase } from './supabase';
import { prisma } from './database';
import { logger } from './logger';
import { env } from './env';
import { redis } from './redis';
import Redis from 'ioredis';

let globalIo: Server | null = null;
let subRedis: Redis | null = null;

export function setupWebSocket(io: Server) {
  globalIo = io;

  // Initialize Redis subscriber connection for the WebSocket bridge
  try {
    subRedis = new Redis(env.REDIS_URL, {
      ...(env.REDIS_URL.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {}),
    });

    subRedis.on('error', (err) => {
      logger.error('Redis subscription client error:', err);
    });

    subRedis.subscribe('websocket-bridge').then(() => {
      logger.info('Subscribed to Redis websocket-bridge channel successfully');
    });

    subRedis.on('message', (channel, message) => {
      if (channel === 'websocket-bridge') {
        try {
          const { userId, event, payload } = JSON.parse(message);
          if (globalIo) {
            const roomName = `user_${userId}`;
            globalIo.to(roomName).emit(event, payload);
            logger.info(`[WS-Bridge] Emitted event '${event}' to room '${roomName}'`);
          }
        } catch (err) {
          logger.error('[WS-Bridge] Failed to parse bridged message:', err);
        }
      }
    });
  } catch (err) {
    logger.error('Failed to initialize Redis subscription bridge:', err);
  }

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
    // If running in the main API server process where Socket.IO is active, emit directly
    const roomName = `user_${userId}`;
    globalIo.to(roomName).emit(event, payload);
    logger.info(`WebSocket event '${event}' emitted directly to room '${roomName}'`);
  } else {
    // If running in the Worker process, publish to Redis bridge so the API server process forwards it
    const message = JSON.stringify({ userId, event, payload });
    redis.publish('websocket-bridge', message).catch((err) => {
      logger.error('Failed to publish websocket event to Redis bridge:', err);
    });
    logger.info(`WebSocket event '${event}' published to Redis bridge for user_${userId}`);
  }
}

