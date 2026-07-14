import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { Priority, TaskStatus } from '@prisma/client';
import { fetchCalendarEvents, createCalendarEvent } from './googleCalendar';
import { calculatePriorityScore } from '../utils/priority';
import { emitToUser } from '../config/websocket';
import { reminderQueue, prioritizationQueue } from '../config/queue';

const isMockMode = !env.GEMINI_API_KEY || env.GEMINI_API_KEY.trim() === '' || env.GEMINI_API_KEY.startsWith('mock_');

const genAI = isMockMode ? null : new GoogleGenerativeAI(env.GEMINI_API_KEY);

// ─── Tool Definitions per AI_AGENT_SKILLS.md §2 ─────────────────────────────

const geminiTools: any = [
  {
    functionDeclarations: [
      {
        name: 'get_task_list',
        description: 'Retrieve the user\'s task list with optional filters',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            status: { type: SchemaType.STRING, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ALL'], format: 'enum' },
            priority: { type: SchemaType.STRING, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'ALL'], format: 'enum' },
            dueBefore: { type: SchemaType.STRING, description: 'ISO8601 date string' },
            limit: { type: SchemaType.INTEGER, description: 'Max tasks to return (default: 20, max: 50)' },
          },
        },
      },
      {
        name: 'create_task',
        description: 'Create a new task for the user.',
        parameters: {
          type: SchemaType.OBJECT,
          required: ['title'],
          properties: {
            title: { type: SchemaType.STRING },
            description: { type: SchemaType.STRING },
            dueDate: { type: SchemaType.STRING, description: 'ISO8601 datetime string. IMPORTANT: Specify the offset (e.g., YYYY-MM-DDTHH:mm:ss+05:30) or convert to UTC correctly based on the user\'s local time.' },
            priority: { type: SchemaType.STRING, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], format: 'enum' },
            category: { type: SchemaType.STRING },
            estimatedMins: { type: SchemaType.INTEGER },
            tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          },
        },
      },
      {
        name: 'complete_task',
        description: 'Mark a task as completed',
        parameters: {
          type: SchemaType.OBJECT,
          required: ['taskId'],
          properties: {
            taskId: { type: SchemaType.STRING },
          },
        },
      },
      {
        name: 'update_task',
        description: 'Update an existing task. Only update fields the user explicitly wants changed.',
        parameters: {
          type: SchemaType.OBJECT,
          required: ['taskId'],
          properties: {
            taskId: { type: SchemaType.STRING },
            title: { type: SchemaType.STRING },
            dueDate: { type: SchemaType.STRING, description: 'ISO8601 datetime string. IMPORTANT: Specify the offset (e.g., YYYY-MM-DDTHH:mm:ss+05:30) or convert to UTC correctly based on the user\'s local time.' },
            priority: { type: SchemaType.STRING, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], format: 'enum' },
            status: { type: SchemaType.STRING, enum: ['PENDING', 'IN_PROGRESS', 'SNOOZED'], format: 'enum' },
            estimatedMins: { type: SchemaType.INTEGER },
          },
        },
      },
      {
        name: 'snooze_task',
        description: 'Snooze a task to a specific time. AI should suggest a smart snooze time, not just +15min.',
        parameters: {
          type: SchemaType.OBJECT,
          required: ['taskId', 'snoozeUntil'],
          properties: {
            taskId: { type: SchemaType.STRING },
            snoozeUntil: { type: SchemaType.STRING, description: 'ISO8601 datetime string. IMPORTANT: Specify the offset (e.g., YYYY-MM-DDTHH:mm:ss+05:30) or convert to UTC correctly based on the user\'s local time.' },
            reason: { type: SchemaType.STRING, description: 'Why it\'s being snoozed' },
          },
        },
      },
      {
        name: 'get_calendar_availability',
        description: 'Check what calendar slots are free for scheduling',
        parameters: {
          type: SchemaType.OBJECT,
          required: ['date'],
          properties: {
            date: { type: SchemaType.STRING, description: 'YYYY-MM-DD format' },
            durationMins: { type: SchemaType.INTEGER, description: 'Duration needed in minutes' },
          },
        },
      },
      {
        name: 'schedule_focus_session',
        description: 'Block time in calendar for focused work on a specific task',
        parameters: {
          type: SchemaType.OBJECT,
          required: ['taskId', 'startTime', 'durationMins'],
          properties: {
            taskId: { type: SchemaType.STRING },
            startTime: { type: SchemaType.STRING, description: 'ISO8601 datetime string. IMPORTANT: Specify the offset (e.g., YYYY-MM-DDTHH:mm:ss+05:30) or convert to UTC correctly based on the user\'s local time.' },
            durationMins: { type: SchemaType.INTEGER },
          },
        },
      },
      {
        name: 'break_down_task',
        description: 'Ask AI to decompose a complex task into manageable subtasks',
        parameters: {
          type: SchemaType.OBJECT,
          required: ['taskId'],
          properties: {
            taskId: { type: SchemaType.STRING },
            targetCompletionDate: { type: SchemaType.STRING, description: 'ISO8601 date' },
          },
        },
      },
    ],
  },
];

// ─── Tool Executor per AI_AGENT_SKILLS.md §3.3 ──────────────────────────────

async function executeTool(
  toolName: string,
  toolInput: any,
  userId: string
): Promise<string> {
  try {
    switch (toolName) {
      case 'get_task_list': {
        const where: any = { userId, deletedAt: null };
        if (toolInput.status && toolInput.status !== 'ALL') where.status = toolInput.status;
        if (toolInput.priority && toolInput.priority !== 'ALL') where.priority = toolInput.priority;
        if (toolInput.dueBefore) where.dueDate = { lte: new Date(toolInput.dueBefore) };

        const tasks = await prisma.task.findMany({
          where,
          take: Math.min(toolInput.limit || 20, 50),
          orderBy: { priorityScore: 'desc' },
          select: { id: true, title: true, status: true, priority: true, dueDate: true, estimatedMins: true, category: true, priorityScore: true },
        });
        return JSON.stringify({ tasks, count: tasks.length });
      }

      case 'create_task': {
        const priority = (toolInput.priority as Priority) || Priority.MEDIUM;
        const dueDate = toolInput.dueDate ? new Date(toolInput.dueDate) : null;
        const priorityScore = calculatePriorityScore(priority, dueDate, new Date());

        const task = await prisma.task.create({
          data: {
            userId,
            title: toolInput.title,
            description: toolInput.description || null,
            dueDate,
            priority,
            category: toolInput.category || null,
            estimatedMins: toolInput.estimatedMins || null,
            tags: toolInput.tags || [],
            aiGenerated: true,
            priorityScore,
          },
        });

        // Schedule new reminder if due date is set and in the future
        if (dueDate && dueDate.getTime() > Date.now()) {
          const userPrefs = await prisma.userPreferences.findUnique({
            where: { userId },
          });
          const smartRemindersEnabled = userPrefs?.enableSmartReminders !== false;
          if (smartRemindersEnabled) {
            const leadTimeMins = userPrefs?.reminderLeadTimeMinutes ?? 60;
            let remindAt = new Date(dueDate.getTime() - leadTimeMins * 60 * 1000);
            if (remindAt.getTime() < Date.now()) {
              remindAt = dueDate;
            }

            const reminder = await prisma.taskReminder.create({
              data: {
                taskId: task.id,
                userId,
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
          { userId },
          { jobId: `prioritize-${userId}-${Date.now()}` }
        );

        emitToUser(userId, 'TASK_UPDATED', { type: 'create', taskId: task.id });
        return JSON.stringify({ success: true, task: { id: task.id, title: task.title } });
      }

      case 'complete_task': {
        const task = await prisma.task.findFirst({
          where: { id: toolInput.taskId, userId, deletedAt: null },
        });
        if (!task) return JSON.stringify({ error: 'Task not found' });

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
          data: { status: TaskStatus.COMPLETED, completedAt: new Date() },
        });
        emitToUser(userId, 'TASK_UPDATED', { type: 'complete', taskId: task.id });
        return JSON.stringify({ success: true, completedTask: task.title });
      }

      case 'update_task': {
        const task = await prisma.task.findFirst({
          where: { id: toolInput.taskId, userId, deletedAt: null },
        });
        if (!task) return JSON.stringify({ error: 'Task not found' });

        const updateData: any = {};
        if (toolInput.title) updateData.title = toolInput.title;
        if (toolInput.dueDate) updateData.dueDate = new Date(toolInput.dueDate);
        if (toolInput.priority) updateData.priority = toolInput.priority;
        if (toolInput.status) updateData.status = toolInput.status;
        if (toolInput.estimatedMins) updateData.estimatedMins = toolInput.estimatedMins;

        const newPriority = toolInput.priority || task.priority;
        const newDueDate = toolInput.dueDate !== undefined ? (toolInput.dueDate ? new Date(toolInput.dueDate) : null) : task.dueDate;
        updateData.priorityScore = calculatePriorityScore(newPriority, newDueDate, task.createdAt);

        const updated = await prisma.task.update({
          where: { id: task.id },
          data: updateData,
        });

        // If dueDate or priority changes, re-evaluate reminders and prioritization
        if (toolInput.dueDate !== undefined || toolInput.priority !== undefined) {
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

          // Schedule new reminder if new due date is set and in the future
          if (newDueDate && newDueDate.getTime() > Date.now()) {
            const userPrefs = await prisma.userPreferences.findUnique({
              where: { userId },
            });
            const smartRemindersEnabled = userPrefs?.enableSmartReminders !== false;
            if (smartRemindersEnabled) {
              const leadTimeMins = userPrefs?.reminderLeadTimeMinutes ?? 60;
              let remindAt = new Date(newDueDate.getTime() - leadTimeMins * 60 * 1000);
              if (remindAt.getTime() < Date.now()) {
                remindAt = newDueDate;
              }

              const reminder = await prisma.taskReminder.create({
                data: {
                  taskId: task.id,
                  userId,
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
            { userId },
            { jobId: `prioritize-${userId}-${Date.now()}` }
          );
        }

        emitToUser(userId, 'TASK_UPDATED', { type: 'update', taskId: updated.id });
        return JSON.stringify({ success: true, task: { id: updated.id, title: updated.title } });
      }

      case 'snooze_task': {
        const task = await prisma.task.findFirst({
          where: { id: toolInput.taskId, userId, deletedAt: null },
        });
        if (!task) return JSON.stringify({ error: 'Task not found' });

        const snoozeUntilDate = new Date(toolInput.snoozeUntil);

        await prisma.task.update({
          where: { id: task.id },
          data: {
            status: TaskStatus.SNOOZED,
            snoozedUntil: snoozeUntilDate,
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
          where: { userId },
        });
        const smartRemindersEnabled = userPrefs?.enableSmartReminders !== false;
        const leadTimeMins = userPrefs?.reminderLeadTimeMinutes ?? 60;
        const remindAt = new Date(snoozeUntilDate.getTime() - leadTimeMins * 60 * 1000);
        const finalRemindAt = remindAt.getTime() > Date.now() ? remindAt : snoozeUntilDate;

        if (smartRemindersEnabled) {
          const reminder = await prisma.taskReminder.create({
            data: {
              taskId: task.id,
              userId,
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
          { userId },
          { jobId: `prioritize-${userId}-${Date.now()}` }
        );

        emitToUser(userId, 'TASK_UPDATED', { type: 'snooze', taskId: task.id });
        return JSON.stringify({ success: true, snoozedTask: task.title, snoozeUntil: toolInput.snoozeUntil });
      }

      case 'get_calendar_availability': {
        const integration = await prisma.calendarIntegration.findFirst({
          where: { userId, provider: 'google', syncEnabled: true },
        });
        if (!integration) {
          return JSON.stringify({ message: 'Calendar not connected. User is fully available.' });
        }
        try {
          const events = await fetchCalendarEvents(integration.accessToken, integration.refreshToken);
          const dateStr = toolInput.date; // YYYY-MM-DD
          const dailyEvents = events.filter((e: any) => {
            const start = e.start?.dateTime || e.start?.date;
            return start && start.startsWith(dateStr);
          });
          return JSON.stringify({ success: true, events: dailyEvents });
        } catch (err: any) {
          return JSON.stringify({ error: 'Failed to retrieve availability', details: err.message });
        }
      }

      case 'schedule_focus_session': {
        const task = await prisma.task.findFirst({
          where: { id: toolInput.taskId, userId, deletedAt: null },
        });
        if (!task) return JSON.stringify({ error: 'Task not found' });

        const integration = await prisma.calendarIntegration.findFirst({
          where: { userId, provider: 'google', syncEnabled: true },
        });
        if (!integration) {
          return JSON.stringify({ error: 'Google Calendar not connected. Cannot schedule focus session.' });
        }

        try {
          const startTime = new Date(toolInput.startTime);
          const endTime = new Date(startTime.getTime() + toolInput.durationMins * 60 * 1000);
          const event = await createCalendarEvent(integration.accessToken, integration.refreshToken, {
            summary: `FocusForge Focus: ${task.title}`,
            description: `Scheduled focus block for task: ${task.title}`,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
          });

          await prisma.task.update({
            where: { id: task.id },
            data: { calendarEventId: event.id },
          });

          return JSON.stringify({ success: true, message: `Focus session scheduled for "${task.title}"`, eventId: event.id });
        } catch (err: any) {
          return JSON.stringify({ error: 'Failed to schedule focus session', details: err.message });
        }
      }

      case 'break_down_task': {
        const task = await prisma.task.findFirst({
          where: { id: toolInput.taskId, userId, deletedAt: null },
        });
        if (!task) return JSON.stringify({ error: 'Task not found' });

        const prompt = `You are a task decomposer. Break down the task: "${task.title}" (Description: ${task.description || 'none'}) into 3-5 logical subtasks.
Return ONLY a JSON array of subtask titles: ["Subtask 1", "Subtask 2", ...], with no other text or explanation.`;

        try {
          const genAIInstance = new GoogleGenerativeAI(env.GEMINI_API_KEY);
          const model = genAIInstance.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const result = await model.generateContent(prompt);
          const responseText = result.response.text().trim();
          const cleanedText = responseText.replace(/```[a-z]*|```/g, '').trim();
          const subtaskTitles: string[] = JSON.parse(cleanedText);

          const subtasks = [];
          if (Array.isArray(subtaskTitles)) {
            for (const title of subtaskTitles) {
              const priorityScore = calculatePriorityScore(task.priority, task.dueDate, new Date());
              const sub = await prisma.task.create({
                data: {
                  userId,
                  title,
                  parentTaskId: task.id,
                  status: TaskStatus.PENDING,
                  priority: task.priority,
                  category: task.category,
                  aiGenerated: true,
                  priorityScore,
                },
              });
              subtasks.push({ id: sub.id, title: sub.title });
            }
            emitToUser(userId, 'TASK_UPDATED', { type: 'breakdown', parentTaskId: task.id });
          }
          return JSON.stringify({ success: true, parentTask: task.title, subtasks });
        } catch (err: any) {
          return JSON.stringify({ error: 'Failed to break down task', details: err.message });
        }
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err) {
    logger.error(`Tool execution error: ${toolName}`, err);
    return JSON.stringify({ error: 'Tool execution failed' });
  }
}

// ─── System Prompt Builder per AI_AGENT_SKILLS.md §1.1 ──────────────────────

function buildCoachSystemPrompt(
  user: {
    name: string;
    timezone: string;
    plan: string;
    preferences?: { workStartHour?: number; workEndHour?: number; productivityStyle?: string; aiCoachingTone?: string } | null;
  },
  tasks: any[],
  habits: any[],
  schedule: any[]
): string {
  const prefs = user.preferences;

  const tasksContext = tasks.length > 0
    ? tasks.map(t => `- [${t.priority}] "${t.title}" (ID: ${t.id}, Due: ${t.dueDate ? new Date(t.dueDate).toISOString() : 'none'}, Category: ${t.category || 'none'}, Est: ${t.estimatedMins || 0}m)`).join('\n')
    : 'No active tasks.';

  const habitsContext = habits.length > 0
    ? habits.map(h => `- "${h.title}" (${h.frequency}) - Status: ${h.logs.length > 0 ? 'COMPLETED TODAY' : 'PENDING'}`).join('\n')
    : 'No active habits.';

  const scheduleContext = schedule.length > 0
    ? schedule.map(e => `- "${e.summary}" (${new Date(e.start?.dateTime || e.start?.date).toLocaleTimeString()} to ${new Date(e.end?.dateTime || e.end?.date).toLocaleTimeString()})`).join('\n')
    : 'No calendar events scheduled today.';

  return `You are the AI productivity coach for FocusForge, a proactive assistant that helps users stay on top of their tasks, deadlines, and goals.

Your personality:
- Warm, encouraging, and action-oriented
- Direct and concise — users are busy
- Never judgmental about missed tasks
- Celebrate wins, big and small
- Tone adapts to user's preference: ${prefs?.aiCoachingTone || 'friendly'}

Your capabilities (use tools proactively):
- View and modify the user's task list
- Create and track tasks
- Complete tasks for the user
- Snooze tasks, schedule focus sessions, break down tasks, and check calendar availability.

Current user context:
- Name: ${user.name}
- Timezone: ${user.timezone}
- Current server time (UTC): ${new Date().toISOString()}
- User current local time: ${new Date().toLocaleString('en-US', { timeZone: user.timezone })}
- Plan: ${user.plan}
- Work hours: ${prefs?.workStartHour ?? 9}:00 – ${prefs?.workEndHour ?? 18}:00
- Productivity style: ${prefs?.productivityStyle || 'balanced'}

ACTIVE TASKS:
${tasksContext}

DAILY HABITS:
${habitsContext}

TODAY'S CALENDAR:
${scheduleContext}

Rules you MUST follow:
1. NEVER make up task details — only reference tasks that exist in the provided list
2. NEVER modify tasks without user confirmation when the change is destructive (delete, date push by >3 days)
3. Always confirm before creating recurring tasks
4. If the user seems overwhelmed, acknowledge it first before suggesting solutions
5. Keep responses under 150 words unless detailed planning is explicitly requested
6. Always end action-taking responses with a clear next step for the user

When you see the user's task list, proactively notice:
- Tasks due in the next 24 hours
- Overdue tasks
- Tasks with no due date (gently suggest adding one)
- Unrealistic workloads for today`;
}

// ─── Main Chat Function per AI_AGENT_SKILLS.md §3.2 ─────────────────────────

export interface ChatResult {
  assistantMessage: string;
  conversationId: string;
  toolsUsed: string[];
}

export async function runAICoachChatStream(
  userMessage: string,
  conversationId: string | null,
  userId: string,
  onChunk: (chunk: any) => void
): Promise<ChatResult> {
  const startTime = Date.now();
  const toolsUsed: string[] = [];

  // Get user context
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { preferences: true },
  });
  if (!user) throw new Error('User not found');

  // Get or create conversation
  let conversation;
  if (conversationId) {
    conversation = await prisma.aiConversation.findFirst({
      where: { id: conversationId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
    });
  }

  if (!conversation) {
    conversation = await prisma.aiConversation.create({
      data: {
        userId,
        title: userMessage.slice(0, 60),
      },
      include: { messages: true },
    });
  }

  if (isMockMode) {
    const mockReply = `Hello ${user.name}! I am your AI Productivity Coach (offline mock mode). I see you wrote: "${userMessage}". To enable my full agentic task planning capabilities, please configure a valid Google \`GEMINI_API_KEY\` in your \`apps/api/.env\` file!`;
    
    // Simulate streaming for mock mode
    const words = mockReply.split(' ');
    for (const word of words) {
      onChunk({ type: 'token', content: word + ' ' });
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    await prisma.aiMessage.createMany({
      data: [
        { conversationId: conversation.id, role: 'user', content: userMessage },
        { conversationId: conversation.id, role: 'assistant', content: mockReply, latencyMs: 50 },
      ]
    });

    onChunk({ type: 'done', conversationId: conversation.id });

    return {
      assistantMessage: mockReply,
      conversationId: conversation.id,
      toolsUsed: [],
    };
  }

  // Build message history from DB for Gemini chat (strictly sanitised)
  let history: any[] = [];
  let lastRole: string | null = null;

  for (const m of conversation.messages) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    if (role === lastRole) {
      if (history.length > 0) {
        history[history.length - 1].parts[0].text += '\n' + m.content;
      }
      continue;
    }
    history.push({
      role,
      parts: [{ text: m.content }],
    });
    lastRole = role;
  }

  // Gemini startChat history MUST end with a 'model' (assistant) message
  if (history.length > 0 && history[history.length - 1].role === 'user') {
    const lastUserMsg = history.pop();
    userMessage = lastUserMsg.parts[0].text + '\n' + userMessage;
  }

  // Save user message to DB
  await prisma.aiMessage.create({
    data: {
      conversationId: conversation.id,
      role: 'user',
      content: userMessage,
    },
  });

  const activeTasks = await prisma.task.findMany({
    where: { userId, deletedAt: null, status: { in: ['PENDING', 'IN_PROGRESS'] } },
    orderBy: { priorityScore: 'desc' },
    take: 20,
    select: { id: true, title: true, status: true, priority: true, dueDate: true, estimatedMins: true, category: true },
  });

  const todayDate = new Date();
  todayDate.setUTCHours(0, 0, 0, 0);
  const habits = await prisma.habit.findMany({
    where: { userId, deletedAt: null, isActive: true },
    select: {
      id: true,
      title: true,
      frequency: true,
      logs: {
        where: { completedOn: todayDate },
        select: { id: true, completedOn: true },
      },
    },
  });

  let calendarEvents: any[] = [];
  const integration = await prisma.calendarIntegration.findFirst({
    where: { userId, provider: 'google', syncEnabled: true },
  });
  if (integration) {
    try {
      calendarEvents = await fetchCalendarEvents(integration.accessToken, integration.refreshToken);
      const todayStr = new Date().toISOString().split('T')[0];
      calendarEvents = calendarEvents.filter((e: any) => {
        const start = e.start?.dateTime || e.start?.date;
        return start && start.startsWith(todayStr);
      });
    } catch (e) {
      logger.error('Failed to pre-fetch calendar for AI Coach prompt', e);
    }
  }

  const model = genAI!.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: buildCoachSystemPrompt(
      {
        name: user.name,
        timezone: user.timezone,
        plan: user.plan,
        preferences: user.preferences,
      },
      activeTasks,
      habits,
      calendarEvents
    ),
    tools: geminiTools,
  });

  const chat = model.startChat({ history });

  let resultStream = await chat.sendMessageStream(userMessage);
  let finalText = '';

  for await (const chunk of resultStream.stream) {
    try {
      const text = chunk.text();
      if (text) {
        finalText += text;
        onChunk({ type: 'token', content: text });
      }
    } catch (e) {
      // Ignore: chunk only contains function calls, not text
    }
  }

  const response = await resultStream.response;
  let functionCalls = response.functionCalls();
  let loopCount = 0;
  const maxLoops = 5;

  while (functionCalls && functionCalls.length > 0 && loopCount < maxLoops) {
    loopCount++;
    const partsToSend = [];

    for (const call of functionCalls) {
      onChunk({ type: 'tool_call', tool: call.name, status: 'running' });
      toolsUsed.push(call.name);
      const resultString = await executeTool(call.name, call.args, userId);
      onChunk({ type: 'tool_result', tool: call.name, status: 'done' });
      
      partsToSend.push({
        functionResponse: {
          name: call.name,
          response: { result: resultString },
        },
      });
    }

    const followUpStream = await chat.sendMessageStream(partsToSend);
    for await (const chunk of followUpStream.stream) {
      try {
        const text = chunk.text();
        if (text) {
          finalText += text;
          onChunk({ type: 'token', content: text });
        }
      } catch (e) {
        // Ignore: chunk only contains function calls, not text
      }
    }

    const followUpResponse = await followUpStream.response;
    functionCalls = followUpResponse.functionCalls();
  }

  const latencyMs = Date.now() - startTime;

  // Save assistant message to DB
  const savedMsg = await prisma.aiMessage.create({
    data: {
      conversationId: conversation.id,
      role: 'assistant',
      content: finalText || 'Action complete. How else can I assist you?',
      toolCalls: toolsUsed.length > 0 ? toolsUsed : undefined,
      latencyMs,
    },
  });

  onChunk({ type: 'done', conversationId: conversation.id, messageId: savedMsg.id });

  return {
    assistantMessage: finalText || 'Action complete.',
    conversationId: conversation.id,
    toolsUsed,
  };
}
