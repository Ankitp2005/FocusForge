import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { parseTaskWithAI, planDayWithAI } from '../services/ai';
import { runAICoachChatStream } from '../services/aiCoach';
import { prisma } from '../config/database';
import { aiRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../config/logger';

const router = Router();
router.use(authenticate);

const parseTaskSchema = z.object({
  text: z.string().min(1).max(500),
});

// ─── POST /api/v1/ai/parse-task ──────────────────────────────────────────────
router.post('/parse-task', aiRateLimiter, async (req, res, next) => {
  try {
    const data = parseTaskSchema.parse(req.body);
    const userTimezone = req.user?.timezone || 'UTC';

    const parsedResult = await parseTaskWithAI(data.text, userTimezone);

    res.json({
      success: true,
      data: parsedResult,
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/v1/ai/plan-day ────────────────────────────────────────────────
const planDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  includeCalendar: z.boolean().optional().default(true),
  includeHabits: z.boolean().optional().default(true),
});

router.post('/plan-day', aiRateLimiter, async (req, res, next) => {
  try {
    const { date, includeCalendar, includeHabits } = planDaySchema.parse(req.body);
    
    const plan = await planDayWithAI(
      req.user!.id,
      date,
      includeCalendar,
      includeHabits
    );

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/v1/ai/chat ───────────────────────────────────────────────────
const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().nullable().optional(),
});

router.post('/chat', aiRateLimiter, async (req, res, next) => {
  try {
    const data = chatSchema.parse(req.body);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await runAICoachChatStream(
      data.message,
      data.conversationId || null,
      req.user!.id,
      (chunk) => {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    );

    res.end();
  } catch (error) {
    logger.error('Error in runAICoachChatStream:', error);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: (error as Error).message })}\n\n`);
      res.end();
    } else {
      next(error);
    }
  }
});

// ─── GET /api/v1/ai/conversations ────────────────────────────────────────────
router.get('/conversations', async (req, res, next) => {
  try {
    const conversations = await prisma.aiConversation.findMany({
      where: { userId: req.user!.id },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    res.json({
      success: true,
      data: { conversations },
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/v1/ai/conversations/:id ────────────────────────────────────────
router.get('/conversations/:id', async (req, res, next) => {
  try {
    const conversation = await prisma.aiConversation.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            toolCalls: true,
            latencyMs: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Conversation not found' },
      });
    }

    res.json({
      success: true,
      data: { conversation },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
