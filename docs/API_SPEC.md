# API Specification
## Last-Minute Life Saver — REST API v1
**Base URL:** `https://api.lmls.app/v1`  
**Version:** 1.0 | **Format:** JSON

---

## Authentication

All endpoints (except those marked public) require:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## Standard Response Envelope

### Success
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "perPage": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task with ID xyz was not found",
    "details": {}
  }
}
```

### Error Codes
| Code | HTTP Status | Description |
|---|---|---|
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Authenticated but lacks permission |
| NOT_FOUND | 404 | Resource does not exist |
| VALIDATION_ERROR | 422 | Request body fails validation |
| RATE_LIMITED | 429 | Too many requests |
| AI_UNAVAILABLE | 503 | Claude API temporarily unavailable |
| INTERNAL_ERROR | 500 | Unexpected server error |

---

## Auth Endpoints

### POST /auth/register
Register a new account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "Jane Doe",
  "timezone": "America/New_York"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "clx...", "email": "user@example.com", "name": "Jane Doe" },
    "accessToken": "eyJ...",
    "expiresIn": 900
  }
}
```
Refresh token set as `HttpOnly` cookie.

---

### POST /auth/login
**Request:**
```json
{ "email": "user@example.com", "password": "SecurePass123!" }
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "clx...", "email": "user@example.com", "name": "Jane Doe", "plan": "FREE" },
    "accessToken": "eyJ...",
    "expiresIn": 900
  }
}
```

---

### POST /auth/refresh
Exchange refresh token (cookie) for new access token.

**Response 200:**
```json
{
  "success": true,
  "data": { "accessToken": "eyJ...", "expiresIn": 900 }
}
```

---

### GET /auth/google *(public)*
Initiates Google OAuth flow. Redirect user to this URL.

### GET /auth/google/callback *(public)*
OAuth callback. Redirects to frontend with token.

---

## Task Endpoints

### GET /tasks
Get user's task list.

**Query Parameters:**
| Param | Type | Default | Description |
|---|---|---|---|
| status | string | "PENDING,IN_PROGRESS" | Comma-separated statuses |
| priority | string | all | Filter by priority |
| category | string | all | Filter by category |
| dueAfter | ISO8601 | - | Tasks due after date |
| dueBefore | ISO8601 | - | Tasks due before date |
| includeOverdue | boolean | true | Include overdue tasks |
| page | number | 1 | Pagination page |
| perPage | number | 20 | Results per page (max 100) |
| sort | string | "priorityScore" | Field to sort by |
| order | string | "desc" | "asc" or "desc" |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "clx...",
        "title": "Submit quarterly report",
        "description": null,
        "status": "PENDING",
        "priority": "HIGH",
        "priorityScore": 87.3,
        "category": "work",
        "tags": ["report", "quarterly"],
        "dueDate": "2026-06-30T23:59:00Z",
        "estimatedMins": 120,
        "isRecurring": false,
        "subtasks": [],
        "reminders": [
          {
            "id": "clx...",
            "remindAt": "2026-06-30T08:00:00Z",
            "channel": "IN_APP",
            "status": "PENDING"
          }
        ],
        "completedAt": null,
        "createdAt": "2026-06-27T10:00:00Z",
        "updatedAt": "2026-06-27T10:00:00Z"
      }
    ]
  },
  "meta": { "page": 1, "perPage": 20, "total": 47, "totalPages": 3 }
}
```

---

### POST /tasks
Create a new task. Accepts natural language or structured input.

**Request (Natural Language):**
```json
{
  "rawInput": "Submit Q3 report to Sarah by Friday 5pm, important",
  "parseWithAI": true
}
```

**Request (Structured):**
```json
{
  "title": "Submit Q3 report to Sarah",
  "dueDate": "2026-07-04T17:00:00Z",
  "priority": "HIGH",
  "category": "work",
  "estimatedMins": 90,
  "tags": ["report", "q3"]
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "task": { ...taskObject },
    "aiParsed": {
      "original": "Submit Q3 report to Sarah by Friday 5pm, important",
      "confidence": 0.96,
      "extracted": { "dueDate": "next Friday 5pm", "priority": "inferred HIGH" }
    }
  }
}
```

---

### GET /tasks/:id
**Response 200:** Full task object with subtasks and reminders.

---

### PATCH /tasks/:id
Update task fields. Only include fields to change.

**Request:**
```json
{
  "title": "Updated title",
  "dueDate": "2026-07-01T17:00:00Z",
  "priority": "CRITICAL"
}
```

---

### DELETE /tasks/:id
Soft-delete a task.
**Response 200:** `{ "success": true, "data": { "deleted": true } }`

---

### POST /tasks/:id/complete
Mark task as completed.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "task": { ...taskObject, "status": "COMPLETED", "completedAt": "2026-06-27T..." },
    "celebrationMessage": "Great work! You've completed 5 tasks today 🎉"
  }
}
```

---

### POST /tasks/:id/snooze
Snooze a task.

**Request:**
```json
{
  "snoozeUntil": "2026-06-28T09:00:00Z",
  "useSmartSnooze": true
}
```

If `useSmartSnooze: true`, AI determines optimal snooze time based on task due date and user schedule.

---

### GET /tasks/search
Semantic + keyword search across tasks.

**Query:** `?q=report+quarterly&limit=10`

**Response 200:** Array of matching tasks with relevance scores.

---

## AI Endpoints

### POST /ai/parse-task
Parse natural language into structured task. Lightweight, no conversation.

**Request:**
```json
{ "input": "Call dentist tomorrow morning" }
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "title": "Call dentist",
    "dueDate": "2026-06-28T12:00:00Z",
    "priority": "MEDIUM",
    "category": "health",
    "estimatedMins": 15,
    "tags": ["health", "appointment"]
  }
}
```

---

### POST /ai/plan-day
Generate an AI-optimized daily schedule.

**Request:**
```json
{
  "date": "2026-06-28",
  "includeCalendar": true,
  "includeHabits": true
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "date": "2026-06-28",
    "timeBlocks": [
      {
        "start": "09:00",
        "end": "10:30",
        "type": "focus",
        "taskId": "clx...",
        "title": "Submit Q3 report",
        "notes": "High priority — due tomorrow"
      },
      {
        "start": "10:30",
        "end": "10:45",
        "type": "break",
        "title": "Break",
        "notes": null
      }
    ],
    "deferredTasks": [
      {
        "taskId": "clx...",
        "title": "Review contract",
        "suggestedDate": "2026-06-29",
        "reason": "Not enough time today — due next week, safe to defer"
      }
    ],
    "warnings": ["You have 3 high-priority tasks competing for 2 hours of focus time"],
    "energyAdvice": "Schedule your deepest work before 11am based on your past completion patterns"
  }
}
```

---

### POST /ai/chat
Send a message to the AI coach. Returns Server-Sent Events stream.

**Request:**
```json
{
  "message": "What should I focus on right now?",
  "conversationId": "clx..." // optional — omit to start new conversation
}
```

**Response:** `Content-Type: text/event-stream`
```
data: {"type": "token", "content": "Based"}
data: {"type": "token", "content": " on your"}
data: {"type": "tool_call", "tool": "get_task_list", "status": "running"}
data: {"type": "tool_result", "tool": "get_task_list", "status": "done"}
data: {"type": "token", "content": "your top priority right now is"}
data: {"type": "done", "conversationId": "clx...", "messageId": "clx..."}
```

---

## Goal Endpoints

### GET /goals
List all goals.

### POST /goals
**Request:**
```json
{
  "title": "Complete AWS certification",
  "description": "Pass the AWS Solutions Architect exam",
  "category": "study",
  "targetDate": "2026-09-30"
}
```

### POST /goals/:id/milestones
**Request:**
```json
{
  "milestones": [
    { "title": "Complete course videos", "dueDate": "2026-07-31", "order": 1 },
    { "title": "Take 3 practice exams", "dueDate": "2026-08-31", "order": 2 },
    { "title": "Schedule and pass exam", "dueDate": "2026-09-30", "order": 3 }
  ]
}
```

---

## Habit Endpoints

### GET /habits
List habits with today's completion status.

### POST /habits
**Request:**
```json
{
  "title": "Morning workout",
  "frequency": "DAILY",
  "targetDaysOfWeek": [1, 2, 3, 4, 5],
  "reminderTime": "07:00"
}
```

### POST /habits/:id/log
Log habit completion for today (or specified date).

**Request:**
```json
{
  "completedOn": "2026-06-27",
  "note": "Ran 5km!"
}
```

---

## Analytics Endpoints

### GET /analytics/summary
**Response:**
```json
{
  "success": true,
  "data": {
    "period": "last_30_days",
    "tasksCreated": 47,
    "tasksCompleted": 38,
    "completionRate": 80.9,
    "deadlinesMissed": 3,
    "averageCompletionTimeHours": 18.4,
    "habitStreaks": [
      { "habitId": "clx...", "title": "Morning workout", "currentStreak": 12 }
    ],
    "productivityScore": 84,
    "productivityTrend": "improving"
  }
}
```

---

## Calendar Endpoints

### POST /calendar/connect
**Request:**
```json
{ "provider": "google", "authCode": "4/..." }
```

### GET /calendar/status
**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "provider": "google",
    "accountEmail": "user@gmail.com",
    "lastSyncedAt": "2026-06-27T10:30:00Z",
    "syncEnabled": true
  }
}
```

---

## Webhook Endpoints

### POST /webhooks/stripe *(no auth — verified by Stripe signature)*
Handles: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

### POST /webhooks/google-calendar *(no auth — verified by Google token)*
Handles: Calendar change notifications for synced users.

---

*API Spec Owner: Backend Team | Last Updated: June 2026*
