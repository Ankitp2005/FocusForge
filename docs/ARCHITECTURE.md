# System Architecture & Workflow
## Last-Minute Life Saver
**Version:** 1.0 | **Updated:** June 2026

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USERS                                │
│          Browser (React SPA + PWA)                         │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS / WSS
┌─────────────────────▼───────────────────────────────────────┐
│                  AWS CloudFront CDN                         │
│            (Static assets + API edge caching)              │
└──────────┬──────────────────────────────┬───────────────────┘
           │                              │
┌──────────▼──────────┐        ┌──────────▼──────────────────┐
│   S3 Static Hosting  │        │     AWS ALB (Load Balancer) │
│   (React SPA build)  │        │        HTTPS + SSL          │
└─────────────────────┘        └──────────┬──────────────────┘
                                           │
                               ┌───────────▼──────────────────┐
                               │       ECS Fargate Cluster     │
                               │  ┌────────────────────────┐  │
                               │  │   API Service (Node.js) │  │
                               │  │   /api/* routes         │  │
                               │  └────────────┬───────────┘  │
                               │  ┌────────────▼───────────┐  │
                               │  │  Worker Service (BullMQ)│  │
                               │  │  Reminders, Sync, AI    │  │
                               │  └────────────────────────┘  │
                               └──────────────┬───────────────┘
                                              │
              ┌───────────────────────────────┼──────────────────────────┐
              │                               │                          │
   ┌──────────▼──────────┐     ┌──────────────▼──────────┐  ┌──────────▼──────┐
   │   Supabase (Postgres) │     │     Upstash (Redis)     │  │  Anthropic API  │
   │   + pgvector          │     │   Cache + BullMQ Queue  │  │  (Claude)       │
   └─────────────────────┘     └─────────────────────────┘  └─────────────────┘
              │
   ┌──────────▼──────────┐
   │   Google Calendar    │
   │   API / OAuth 2.0    │
   └─────────────────────┘
```

---

## 2. Core User Workflows

### 2.1 Task Creation Flow

```
User Input (natural language)
        │
        ▼
AI Parse Service (Claude API)
  → Extract: title, due date, priority, category, tags
  → Estimate: effort in minutes
  → Return: structured Task object
        │
        ▼
Validation Layer (Zod schema)
        │
        ▼
Database: INSERT task
        │
        ├──► AI Prioritization Engine
        │      → Recompute priority scores for all user tasks
        │      → Push updated order via WebSocket
        │
        ├──► Reminder Scheduler
        │      → Calculate reminder times based on due date + prefs
        │      → Enqueue jobs in BullMQ
        │
        └──► Embedding Service
               → Generate vector embedding for task
               → Store in pgvector for semantic search
```

### 2.2 AI Prioritization Engine

```
Trigger: New task added, deadline changed, task completed, daily cron
        │
        ▼
Fetch: All PENDING + IN_PROGRESS tasks for user
        │
        ▼
Compute Priority Score (0–100) for each task:
  
  Score = weighted_sum(
    deadline_urgency      × 0.35,  // Hours until due / urgency curve
    user_defined_priority × 0.25,  // CRITICAL=4, HIGH=3, MEDIUM=2, LOW=1
    effort_vs_time_left   × 0.20,  // Can they still finish in time?
    dependency_blocking   × 0.15,  // Does completing this unblock other tasks?
    recency_of_creation   × 0.05   // Newer tasks slightly deprioritized
  )
        │
        ▼
Sort tasks by score DESC
        │
        ▼
Push sorted task list to client via WebSocket
        │
        ▼
Store priority scores in DB (for analytics)
```

### 2.3 Smart Reminder Flow

```
BullMQ Scheduler (runs every minute)
        │
        ▼
Query: TaskReminders WHERE remindAt <= NOW AND status = PENDING
        │
        ▼
For each reminder:
  ├── Assess current context:
  │     → Task still pending? (not completed/cancelled)
  │     → User in DND window?
  │     → User already has too many reminders firing?
  │
  ├── IF context clear:
  │     → Determine urgency level (1–4)
  │     → Compose AI-generated message (personalized)
  │     → Send via configured channel (in-app, email, push)
  │     → Update reminder status = SENT
  │     → Schedule next escalation if not actioned in 2 hours
  │
  └── IF context blocked:
        → Defer to next available window
        → Update remindAt
```

### 2.4 Google Calendar Sync Flow

```
User connects Google account (OAuth 2.0)
        │
        ▼
Store: access_token, refresh_token, expiry in CalendarIntegration
        │
        ▼
Register: Google Calendar Push Webhook (watch endpoint)
        │
┌───────┴──────────────────────────────────┐
│  OUTBOUND (LMLS → Google Calendar)       │
│  When task created/updated with dueDate: │
│    → Create Google Calendar event        │
│    → Store calendarEventId on task       │
└───────┬──────────────────────────────────┘
        │
┌───────▼──────────────────────────────────┐
│  INBOUND (Google Calendar → LMLS)        │
│  Webhook fires on calendar change:       │
│    → Fetch changed events from API       │
│    → Map to tasks (by calendarEventId)   │
│    → Update task dueDate if changed      │
│    → Trigger re-prioritization           │
└──────────────────────────────────────────┘
        │
        ▼
Token Refresh Strategy:
  → Check token expiry before every API call
  → If expiry < 5 min: refresh proactively
  → If refresh fails: notify user to reconnect
```

### 2.5 AI Coach Conversation Flow

```
User sends message to AI Coach
        │
        ▼
Build context payload:
  {
    user: { name, timezone, plan, preferences },
    tasks: [top 20 tasks by priority score],
    todaySchedule: [calendar events today],
    habits: [today's habit completion],
    conversationHistory: [last 20 messages]
  }
        │
        ▼
Claude API call (claude-sonnet-4-6):
  System prompt: "You are the user's proactive productivity coach..."
  Tools available:
    - create_task(title, dueDate, priority)
    - update_task(id, changes)
    - complete_task(id)
    - get_task_list(filter)
    - schedule_focus_session(taskId, startTime, durationMins)
    - get_calendar_availability(date)
        │
        ▼
If tool call returned:
  → Execute tool (DB operation)
  → Append tool result to conversation
  → Continue Claude call for final response
        │
        ▼
Stream response to user (SSE)
        │
        ▼
Save message pair to AiConversation + AiMessages
```

### 2.6 Daily Planning Flow ("Plan My Day")

```
User triggers "Plan My Day" (or morning cron at user's work start)
        │
        ▼
Gather inputs:
  → All pending tasks (sorted by priority score)
  → Today's existing calendar blocks
  → User's work hours (from preferences)
  → User's estimated energy profile (morning/afternoon/evening)
  → Pending habits for today
        │
        ▼
Claude API call:
  → Given available slots and tasks, generate optimized day schedule
  → Assign tasks to time blocks
  → Include buffer time
  → Flag tasks that won't fit today → suggest deferral or escalation
        │
        ▼
Return: Structured day plan
  {
    timeBlocks: [
      { start: "09:00", end: "10:30", taskId, type: "focus" },
      { start: "10:30", end: "10:45", type: "break" },
      ...
    ],
    deferredTasks: [...],
    warnings: ["You have 3 critical tasks and only 4 hours of work time"]
  }
        │
        ▼
Render: Visual day schedule in UI
User can drag/adjust, then confirm
        │
        ▼
Push confirmed blocks to Google Calendar (if sync enabled)
Schedule task-specific reminders for each block
```

---

## 3. Real-Time Updates (WebSocket)

```
Client connects to WebSocket endpoint on login
  → Authenticated via JWT
  → Joined to user-specific room: room_{userId}

Events pushed to client:
  - task:updated       → When any task changes
  - priority:recalculated → After re-prioritization
  - reminder:incoming  → In-app notification
  - calendar:synced    → After calendar sync completes
  - ai:response_chunk  → Streaming AI response tokens
  - habit:reminder     → Habit check-in prompt
```

---

## 4. Background Jobs Architecture

```
BullMQ Queues:

1. reminder-queue
   → Processes: Send scheduled reminders
   → Concurrency: 10
   → Retry: 3 times, exponential backoff

2. calendar-sync-queue
   → Processes: Sync Google Calendar changes
   → Concurrency: 5
   → Triggered by: Google webhook, or every 15 min cron

3. ai-processing-queue
   → Processes: Generate embeddings, compute priority scores
   → Concurrency: 3
   → Triggered by: Task create/update events

4. email-queue
   → Processes: Send email notifications, daily digests
   → Concurrency: 20
   → Rate limited: Respects Resend rate limits

5. analytics-queue
   → Processes: Batch analytics event writes
   → Concurrency: 1
   → Flush every: 30 seconds

Cron Jobs:
  → Daily Digest Email: 07:00 in user's timezone
  → Weekly AI Review: Sunday 20:00 in user's timezone
  → Priority Recalculation: Every hour
  → Overdue Task Detection: Every 15 minutes
  → Calendar Token Refresh: Every 45 minutes (before expiry)
```

---

## 5. API Design

### Base URL
`https://api.lmls.app/v1`

### Authentication
All endpoints (except auth) require: `Authorization: Bearer <jwt_token>`

### Core Endpoint Groups

```
Auth
  POST /auth/register
  POST /auth/login
  POST /auth/logout
  POST /auth/refresh
  GET  /auth/google
  GET  /auth/google/callback

Tasks
  GET    /tasks              → list (with filters: status, priority, dueDate range)
  POST   /tasks              → create (natural language or structured)
  GET    /tasks/:id
  PATCH  /tasks/:id
  DELETE /tasks/:id
  POST   /tasks/:id/complete
  POST   /tasks/:id/snooze
  GET    /tasks/search?q=    → semantic search

Goals
  GET    /goals
  POST   /goals
  GET    /goals/:id
  PATCH  /goals/:id
  DELETE /goals/:id
  POST   /goals/:id/milestones

Habits
  GET    /habits
  POST   /habits
  PATCH  /habits/:id
  DELETE /habits/:id
  POST   /habits/:id/log

AI
  POST   /ai/parse-task       → NL → structured task
  POST   /ai/plan-day         → generate daily plan
  POST   /ai/chat             → conversational AI (SSE stream)
  GET    /ai/conversations
  GET    /ai/conversations/:id

Calendar
  POST   /calendar/connect
  DELETE /calendar/disconnect
  GET    /calendar/status
  POST   /calendar/sync

Analytics
  GET    /analytics/summary
  GET    /analytics/productivity-score
  GET    /analytics/completion-trends

User
  GET    /user/me
  PATCH  /user/me
  GET    /user/preferences
  PATCH  /user/preferences

Subscriptions
  GET    /subscriptions/plans
  POST   /subscriptions/checkout
  POST   /subscriptions/portal
  POST   /webhooks/stripe    → Stripe webhook handler
```

---

## 6. Frontend Architecture

```
src/
├── app/                      # App entry, routing, providers
│   ├── App.tsx
│   ├── routes.tsx
│   └── providers.tsx
├── pages/
│   ├── Dashboard/            # Main task dashboard
│   ├── Today/                # Today's focused view
│   ├── Calendar/             # Calendar view
│   ├── Goals/                # Goals & milestones
│   ├── Habits/               # Habit tracker
│   ├── Coach/                # AI chat interface
│   ├── Analytics/            # Productivity analytics
│   ├── Settings/             # User preferences
│   └── Auth/                 # Login, register
├── components/
│   ├── tasks/                # Task card, task form, task list
│   ├── ai/                   # Chat interface, AI suggestion cards
│   ├── calendar/             # Calendar grid, event blocks
│   ├── habits/               # Habit ring, streak counter
│   ├── analytics/            # Charts, score cards
│   └── ui/                   # Base UI components (shadcn)
├── hooks/
│   ├── useTasks.ts           # Task CRUD + query
│   ├── useAICoach.ts         # AI chat state
│   ├── useCalendar.ts        # Calendar sync state
│   ├── useWebSocket.ts       # Real-time connection
│   └── useNotifications.ts   # Browser notification API
├── stores/
│   ├── taskStore.ts          # Zustand task state
│   ├── uiStore.ts            # UI state (modals, sidebars)
│   └── userStore.ts          # User/auth state
├── services/
│   ├── api.ts                # API client (axios instance)
│   ├── websocket.ts          # WS client
│   └── notifications.ts      # Browser notification service
├── utils/
│   ├── dates.ts              # Date formatting helpers
│   ├── priority.ts           # Priority color/label mapping
│   └── taskParsing.ts        # Local task text parsing
└── types/
    └── index.ts              # Shared TypeScript types
```

---

*Architecture Owner: Engineering Lead | Last Updated: June 2026*
