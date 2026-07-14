import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { env } from '../config/env';
import { Priority } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../config/logger';
import { prisma } from '../config/database';
import { fetchCalendarEvents } from './googleCalendar';

const isMockMode = !env.GEMINI_API_KEY || env.GEMINI_API_KEY.trim() === '' || env.GEMINI_API_KEY.startsWith('mock_');

const genAI = isMockMode ? null : new GoogleGenerativeAI(env.GEMINI_API_KEY);

export const aiTaskResultSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  dueDate: z.string().datetime().nullable(),
  priority: z.nativeEnum(Priority),
  category: z.string(),
  estimatedMins: z.number().nullable(),
  tags: z.array(z.string()),
  isRecurring: z.boolean(),
  recurrenceRule: z.string().nullable(),
});

export type AITaskResult = z.infer<typeof aiTaskResultSchema>;

export async function parseTaskWithAI(text: string, timezone: string): Promise<AITaskResult> {
  if (isMockMode) {
    const lower = text.toLowerCase();
    let priority: Priority = 'MEDIUM';
    if (lower.includes('urgent') || lower.includes('asap') || lower.includes('critical')) {
      priority = 'CRITICAL';
    } else if (lower.includes('important') || lower.includes('high') || lower.includes('tomorrow')) {
      priority = 'HIGH';
    } else if (lower.includes('low') || lower.includes('someday')) {
      priority = 'LOW';
    }

    let dueDate: string | null = null;
    if (lower.includes('today')) {
      const d = new Date();
      d.setHours(23, 59, 59, 999);
      dueDate = d.toISOString();
    } else if (lower.includes('tomorrow')) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(23, 59, 59, 999);
      dueDate = d.toISOString();
    }

    return {
      title: text.substring(0, 100),
      description: 'Auto-parsed in offline mode (mock AI)',
      dueDate,
      priority,
      category: 'other',
      estimatedMins: 30,
      tags: ['offline'],
      isRecurring: false,
      recurrenceRule: null,
    };
  }

  const currentDateTime = new Date().toISOString();
  let userLocalDateTime = '';
  try {
    userLocalDateTime = new Date().toLocaleString('en-US', { timeZone: timezone ? timezone.trim() : 'UTC' });
  } catch (e) {
    userLocalDateTime = new Date().toLocaleString('en-US', { timeZone: 'UTC' });
  }
  
  const prompt = `
You are a task parsing engine. Convert natural language task descriptions into structured task data.

Task: "${text}"

Extract and return structured task data according to the schema.
Rules:
- Current server time (UTC): ${currentDateTime}
- User current local time: ${userLocalDateTime} (timezone: ${timezone})
- If a relative date is mentioned ("tomorrow", "next Friday"), convert to absolute date
- If no time is specified for dueDate, set to end of that day (23:59)
- Priority inference:
  - CRITICAL: "urgent", "ASAP", "emergency", "today", "due in hours"
  - HIGH: "important", "tomorrow", "this week"  
  - MEDIUM: default for most tasks
  - LOW: "someday", "eventually", "when I have time"
- Estimate effort realistically based on task type
`;

  try {
    const model = genAI!.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING, description: 'concise, action-oriented, max 100 chars' },
            description: { type: SchemaType.STRING, description: 'any additional context' },
            dueDate: { type: SchemaType.STRING, description: 'ISO8601 string or null. IMPORTANT: Specify the offset (e.g. YYYY-MM-DDTHH:mm:ss+05:30) or convert to UTC correctly based on the user\'s local time.' },
            priority: { type: SchemaType.STRING, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], format: 'enum' },
            category: { type: SchemaType.STRING, enum: ['work', 'personal', 'study', 'health', 'finance', 'other'], format: 'enum' },
            estimatedMins: { type: SchemaType.INTEGER, description: 'realistic estimate or null' },
            tags: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: '2-4 relevant tags, lowercase',
            },
            isRecurring: { type: SchemaType.BOOLEAN },
            recurrenceRule: { type: SchemaType.STRING, description: 'RRULE format if recurring or null' },
          },
          required: ['title', 'priority', 'category', 'isRecurring', 'tags'],
        },
      },
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsedJson = JSON.parse(responseText.trim());
    
    let dueDate = parsedJson.dueDate;
    if (dueDate === 'null' || dueDate === 'N/A' || dueDate === '' || !dueDate) {
      dueDate = null;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      dueDate = `${dueDate}T23:59:59.999Z`;
    }

    let description = parsedJson.description;
    if (description === 'null' || description === 'N/A' || description === '' || !description) {
      description = null;
    }

    let recurrenceRule = parsedJson.recurrenceRule;
    if (recurrenceRule === 'null' || recurrenceRule === 'N/A' || recurrenceRule === '' || !recurrenceRule) {
      recurrenceRule = null;
    }

    let estimatedMins = parsedJson.estimatedMins;
    if (typeof estimatedMins === 'string') {
      estimatedMins = parseInt(estimatedMins, 10);
    }
    if (isNaN(estimatedMins) || estimatedMins === null || estimatedMins === undefined) {
      estimatedMins = null;
    }

    return aiTaskResultSchema.parse({
      ...parsedJson,
      dueDate,
      description,
      recurrenceRule,
      estimatedMins,
    });
  } catch (err: any) {
    logger.warn(`[AI Task Parser] Gemini API failed or rate-limited. Falling back to local timezone-aware regex parser: ${err.message}`);

    const lower = text.toLowerCase();
    let priority: Priority = 'MEDIUM';
    if (lower.includes('urgent') || lower.includes('asap') || lower.includes('critical')) {
      priority = 'CRITICAL';
    } else if (lower.includes('important') || lower.includes('high') || lower.includes('tomorrow')) {
      priority = 'HIGH';
    } else if (lower.includes('low') || lower.includes('someday')) {
      priority = 'LOW';
    }

    let dueDate: string | null = null;
    
    // Simple regex parser for time/date in text (e.g. 11:30 PM, 23:30, 9pm, etc.)
    const timeMatch = text.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i) || text.match(/(\d{1,2})\s*(am|pm)/i);
    
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3];
      
      if (ampm) {
        if (ampm.toLowerCase() === 'pm' && hours < 12) hours += 12;
        if (ampm.toLowerCase() === 'am' && hours === 12) hours = 0;
      }
      
      try {
        // Resolve timezone offset safely using Intl.DateTimeFormat
        let userTz = (timezone || 'UTC').trim();
        
        // Helper function to resolve UTC date from local date components in a given timezone
        const getUtcDate = (y: number, m: number, d: number, hr: number, mn: number, tz: string) => {
          const baseDate = new Date(Date.UTC(y, m, d, hr, mn));
          let formatter;
          try {
            formatter = new Intl.DateTimeFormat('en-US', {
              timeZone: tz.trim(),
              hourCycle: 'h23',
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
              hour: 'numeric',
              minute: 'numeric'
            });
          } catch (e) {
            formatter = new Intl.DateTimeFormat('en-US', {
              timeZone: 'UTC',
              hourCycle: 'h23',
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
              hour: 'numeric',
              minute: 'numeric'
            });
          }
          
          const parts = formatter.formatToParts(baseDate);
          const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
          
          const testDate = new Date(Date.UTC(
            parseInt(partMap.year, 10),
            parseInt(partMap.month, 10) - 1,
            parseInt(partMap.day, 10),
            parseInt(partMap.hour, 10),
            parseInt(partMap.minute, 10)
          ));
          
          const diffMs = baseDate.getTime() - testDate.getTime();
          return new Date(baseDate.getTime() + diffMs);
        };

        let currentLocalFormatter;
        try {
          currentLocalFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: userTz,
            hourCycle: 'h23',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
          });
        } catch (e) {
          userTz = 'UTC';
          currentLocalFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'UTC',
            hourCycle: 'h23',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
          });
        }
        
        const currentLocalParts = currentLocalFormatter.formatToParts(new Date());
        const currentLocalMap = Object.fromEntries(currentLocalParts.map(p => [p.type, p.value]));
        
        const localYear = parseInt(currentLocalMap.year, 10);
        const localMonth = parseInt(currentLocalMap.month, 10) - 1;
        const localDay = parseInt(currentLocalMap.day, 10);

        let dueDateObj = getUtcDate(localYear, localMonth, localDay, hours, mins, userTz);
        
        // If the calculated time is already in the past (e.g. user is testing a same-day task due in 2 minutes,
        // but because of formatting/parsing components it resolves slightly in the past), 
        // we keep it if it is within 5 minutes of now (same hour block), otherwise we push it to tomorrow.
        const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
        if (dueDateObj.getTime() < fiveMinsAgo) {
          dueDateObj = getUtcDate(localYear, localMonth, localDay + 1, hours, mins, userTz);
        }
        
        dueDate = dueDateObj.toISOString();
      } catch (tzErr) {
        logger.warn('[AI Task Parser] Failed to parse with user timezone, falling back to UTC', tzErr);
        const date = new Date();
        date.setHours(hours, mins, 0, 0);
        dueDate = date.toISOString();
      }
    } else {
      const date = new Date();
      // Default to end of day if relative keywords are found
      if (lower.includes('today')) {
        date.setHours(23, 59, 59, 999);
        dueDate = date.toISOString();
      } else if (lower.includes('tomorrow')) {
        date.setDate(date.getDate() + 1);
        date.setHours(23, 59, 59, 999);
        dueDate = date.toISOString();
      }
    }

    // Try to strip time references from title
    let title = text.replace(/(\d{1,2}):(\d{2})\s*(am|pm)?/gi, '')
                    .replace(/(\d{1,2})\s*(am|pm)/gi, '')
                    .replace(/(today|tomorrow|urgent|asap|critical|important|high|low|someday)/gi, '')
                    .replace(/\s+/g, ' ')
                    .trim();

    if (!title) {
      title = text;
    }

    return {
      title: title.substring(0, 100),
      description: 'Auto-parsed in fallback mode (Gemini quota limit reached)',
      dueDate,
      priority,
      category: 'other',
      estimatedMins: 30,
      tags: ['fallback'],
      isRecurring: false,
      recurrenceRule: null,
    };
  }
}

export async function planDayWithAI(
  userId: string,
  date: string,
  includeCalendar: boolean,
  includeHabits: boolean
): Promise<any> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { preferences: true },
  });
  if (!user) throw new Error('User not found');

  // Fetch active tasks
  const tasks = await prisma.task.findMany({
    where: { userId, deletedAt: null, status: { in: ['PENDING', 'IN_PROGRESS'] } },
    orderBy: { priorityScore: 'desc' },
    take: 20,
    select: { id: true, title: true, status: true, priority: true, dueDate: true, estimatedMins: true, category: true },
  });

  // Fetch today's habits if requested
  let habitsList: any[] = [];
  if (includeHabits) {
    habitsList = await prisma.habit.findMany({
      where: { userId, deletedAt: null, isActive: true },
      select: { id: true, title: true, frequency: true, reminderTime: true },
    });
  }

  // Fetch calendar events if requested
  let calendarEvents: any[] = [];
  if (includeCalendar) {
    const integration = await prisma.calendarIntegration.findFirst({
      where: { userId, provider: 'google', syncEnabled: true },
    });
    if (integration) {
      try {
        calendarEvents = await fetchCalendarEvents(integration.accessToken, integration.refreshToken);
        calendarEvents = calendarEvents.filter((e: any) => {
          const start = e.start?.dateTime || e.start?.date;
          return start && start.startsWith(date);
        });
      } catch (err) {
        logger.error('Failed to fetch calendar events for day planning', err);
      }
    }
  }

  if (isMockMode) {
    const timeBlocks: any[] = [];
    let currentHour = user.preferences?.workStartHour ?? 9;
    let currentMin = 0;

    const addMinutes = (mins: number) => {
      currentMin += mins;
      if (currentMin >= 60) {
        currentHour += Math.floor(currentMin / 60);
        currentMin = currentMin % 60;
      }
    };

    const formatTime = (h: number, m: number) => {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    // 1. Add any calendar events
    calendarEvents.forEach((event: any) => {
      const startStr = event.start?.dateTime || event.start?.date;
      const endStr = event.end?.dateTime || event.end?.date;
      if (startStr && endStr) {
        const start = new Date(startStr);
        const end = new Date(endStr);
        timeBlocks.push({
          start: formatTime(start.getHours(), start.getMinutes()),
          end: formatTime(end.getHours(), end.getMinutes()),
          type: 'meeting',
          taskId: null,
          title: event.summary || 'Meeting',
          notes: 'Google Calendar Event',
        });
      }
    });

    // 2. Add tasks as focus blocks
    tasks.forEach((task: any) => {
      const workEnd = user.preferences?.workEndHour ?? 18;
      if (currentHour >= workEnd) return;

      const duration = task.estimatedMins || 45;
      const startTime = formatTime(currentHour, currentMin);
      
      addMinutes(duration);
      const endTime = formatTime(currentHour, currentMin);

      timeBlocks.push({
        start: startTime,
        end: endTime,
        type: 'focus',
        taskId: task.id,
        title: task.title,
        notes: `AI scheduled focus session for priority: ${task.priority}`,
      });

      // Add a break after the task if we have time
      if (currentHour < workEnd) {
        const breakStart = formatTime(currentHour, currentMin);
        addMinutes(10);
        const breakEnd = formatTime(currentHour, currentMin);
        timeBlocks.push({
          start: breakStart,
          end: breakEnd,
          type: 'break',
          taskId: null,
          title: 'Short Break',
          notes: 'Rest and stretch',
        });
      }
    });

    // 3. Add habits if requested
    if (includeHabits && habitsList.length > 0) {
      habitsList.forEach((habit: any) => {
        const hTime = habit.reminderTime || '08:00';
        const [hh, mm] = hTime.split(':').map(Number);
        timeBlocks.push({
          start: hTime,
          end: formatTime(hh, (mm || 0) + 30),
          type: 'habit',
          taskId: null,
          title: habit.title,
          notes: 'Daily Habit Cue',
        });
      });
    }

    // Sort timeBlocks chronologically by start time
    timeBlocks.sort((a, b) => a.start.localeCompare(b.start));

    return {
      date,
      timeBlocks,
      deferredTasks: [],
      warnings: [],
      energyAdvice: 'Offline dynamic scheduling complete. Take regular breaks.',
    };
  }

  const prefs = user.preferences;
  const workStart = `${prefs?.workStartHour ?? 9}:00`;
  const workEnd = `${prefs?.workEndHour ?? 18}:00`;
  const focusSessionMins = prefs?.preferredFocusSessionMins ?? 25;
  const productivityStyle = prefs?.productivityStyle || 'balanced';

  const systemInstruction = `You are an expert daily planner. Create an optimized daily schedule from the user's task list and available time slots.

User profile:
- Name: ${user.name}
- Work hours: ${workStart} to ${workEnd} (timezone: ${user.timezone})
- Focus session preference: ${focusSessionMins} minutes
- Productivity style: ${productivityStyle}
- Today: ${date}

Planning principles:
1. Schedule high-priority/hard tasks in the user's peak energy time (morning = deep work for most)
2. Leave 20% buffer time — do not pack the day completely
3. Group similar tasks together (context switching is costly)
4. Habits should be scheduled at their preferred time
5. Never schedule tasks back-to-back without at least a 10-min break
6. If tasks don't fit today, explicitly flag them as "deferred" with a suggested new date

Return ONLY a JSON object:
{
  "timeBlocks": [
    {
      "start": "HH:MM",
      "end": "HH:MM",
      "type": "focus" | "break" | "meeting" | "admin" | "habit",
      "taskId": string | null,
      "title": string,
      "notes": string | null
    }
  ],
  "deferredTasks": [{ "taskId": string, "suggestedDate": "YYYY-MM-DD", "reason": string }],
  "warnings": string[],
  "energyAdvice": string
}`;

  const prompt = `Tasks to plan:
${JSON.stringify(tasks, null, 2)}

Today's calendar events:
${JSON.stringify(calendarEvents, null, 2)}

Daily habits:
${JSON.stringify(habitsList, null, 2)}

Please build the optimized daily schedule.`;

  try {
    const model = genAI!.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            timeBlocks: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  start: { type: SchemaType.STRING, description: 'HH:MM' },
                  end: { type: SchemaType.STRING, description: 'HH:MM' },
                  type: { type: SchemaType.STRING, enum: ['focus', 'break', 'meeting', 'admin', 'habit'], format: 'enum' },
                  taskId: { type: SchemaType.STRING },
                  title: { type: SchemaType.STRING },
                  notes: { type: SchemaType.STRING },
                },
                required: ['start', 'end', 'type', 'title'],
              },
            },
            deferredTasks: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  taskId: { type: SchemaType.STRING },
                  suggestedDate: { type: SchemaType.STRING, description: 'YYYY-MM-DD' },
                  reason: { type: SchemaType.STRING },
                },
                required: ['taskId', 'suggestedDate', 'reason'],
              },
            },
            warnings: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            energyAdvice: { type: SchemaType.STRING },
          },
          required: ['timeBlocks', 'deferredTasks', 'warnings', 'energyAdvice'],
        },
      },
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction,
    });

    const responseText = result.response.text();
    return JSON.parse(responseText.trim());
  } catch (err) {
    logger.error('Failed to run daily planner with Gemini', err);
    throw new Error('Failed to generate daily plan');
  }
}
