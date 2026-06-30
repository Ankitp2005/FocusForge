# Database Schema — Last-Minute Life Saver
**Version:** 1.0 | **Database:** PostgreSQL 16 with pgvector

---

## Schema Overview

```
users
  └── tasks (user_id)
        └── subtasks (task_id)
        └── task_reminders (task_id)
        └── task_embeddings (task_id)
  └── goals (user_id)
        └── goal_milestones (goal_id)
  └── habits (user_id)
        └── habit_logs (habit_id)
  └── calendar_integrations (user_id)
  └── ai_conversations (user_id)
        └── ai_messages (conversation_id)
  └── user_preferences (user_id)
  └── analytics_events (user_id)
  └── subscriptions (user_id)
```

---

## Full Schema (Prisma Format)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  extensions = [pgvector(map: "vector"), pg_trgm]
}

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────

model User {
  id                String    @id @default(cuid())
  email             String    @unique
  emailVerified     Boolean   @default(false)
  passwordHash      String?   // null for OAuth-only users
  name              String
  avatarUrl         String?
  timezone          String    @default("UTC")
  plan              Plan      @default(FREE)
  planExpiresAt     DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime? // soft delete

  // Relations
  tasks             Task[]
  goals             Goal[]
  habits            Habit[]
  preferences       UserPreferences?
  oauthAccounts     OAuthAccount[]
  calendarIntegrations CalendarIntegration[]
  aiConversations   AiConversation[]
  subscription      Subscription?
  analyticsEvents   AnalyticsEvent[]
  teamMemberships   TeamMember[]

  @@index([email])
  @@index([plan])
}

enum Plan {
  FREE
  PRO
  TEAMS
  ENTERPRISE
}

model UserPreferences {
  id                        String    @id @default(cuid())
  userId                    String    @unique
  workStartHour             Int       @default(9)   // 9 = 9:00 AM
  workEndHour               Int       @default(18)  // 18 = 6:00 PM
  preferredFocusSessionMins Int       @default(25)  // Pomodoro default
  enableSmartReminders      Boolean   @default(true)
  reminderLeadTimeMinutes   Int       @default(60)
  doNotDisturbStart         String?   // "22:00"
  doNotDisturbEnd           String?   // "08:00"
  weekStartDay              Int       @default(1)   // 1=Monday, 0=Sunday
  productivityStyle         String    @default("balanced") // "deep_worker" | "balanced" | "flexible"
  aiCoachingTone            String    @default("friendly") // "friendly" | "strict" | "minimal"
  emailDigestFrequency      String    @default("daily") // "none" | "daily" | "weekly"
  updatedAt                 DateTime  @updatedAt

  user  User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model OAuthAccount {
  id             String   @id @default(cuid())
  userId         String
  provider       String   // "google" | "github"
  providerUserId String
  accessToken    String?  @db.Text
  refreshToken   String?  @db.Text
  tokenExpiresAt DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user  User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerUserId])
  @@index([userId])
}

// ─────────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────────

model Task {
  id              String      @id @default(cuid())
  userId          String
  title           String
  description     String?     @db.Text
  status          TaskStatus  @default(PENDING)
  priority        Priority    @default(MEDIUM)
  priorityScore   Float?      // AI-computed 0-100 score
  category        String?     // "work" | "personal" | "study" | "health" | custom
  tags            String[]    @default([])
  dueDate         DateTime?
  dueDateIsFixed  Boolean     @default(false) // false = AI can suggest moving it
  estimatedMins   Int?        // user or AI estimated effort
  actualMins      Int?        // tracked actual time
  isRecurring     Boolean     @default(false)
  recurrenceRule  String?     // RRULE string (RFC 5545)
  parentTaskId    String?     // for subtasks
  calendarEventId String?     // linked Google Calendar event
  completedAt     DateTime?
  snoozedUntil    DateTime?
  aiGenerated     Boolean     @default(false)
  sourceInput     String?     @db.Text // original natural language input
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  deletedAt       DateTime?

  // Relations
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent          Task?         @relation("SubTasks", fields: [parentTaskId], references: [id])
  subtasks        Task[]        @relation("SubTasks")
  reminders       TaskReminder[]
  embedding       TaskEmbedding?
  goalMilestone   GoalMilestone? @relation(fields: [goalMilestoneId], references: [id])
  goalMilestoneId String?

  @@index([userId, status])
  @@index([userId, dueDate])
  @@index([userId, priority])
  @@index([userId, deletedAt])
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
  SNOOZED
}

enum Priority {
  CRITICAL
  HIGH
  MEDIUM
  LOW
}

model TaskEmbedding {
  id        String                  @id @default(cuid())
  taskId    String                  @unique
  embedding Unsupported("vector(1536)")
  createdAt DateTime                @default(now())
  updatedAt DateTime                @updatedAt

  task  Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
}

model TaskReminder {
  id             String         @id @default(cuid())
  taskId         String
  userId         String
  remindAt       DateTime
  channel        ReminderChannel @default(IN_APP)
  status         ReminderStatus  @default(PENDING)
  urgencyLevel   Int             @default(1) // 1=gentle, 2=moderate, 3=urgent, 4=critical
  message        String?
  sentAt         DateTime?
  dismissedAt    DateTime?
  snoozedUntil   DateTime?
  createdAt      DateTime        @default(now())

  task  Task @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@index([remindAt, status])
  @@index([taskId])
}

enum ReminderChannel {
  IN_APP
  EMAIL
  PUSH
  SMS
}

enum ReminderStatus {
  PENDING
  SENT
  DISMISSED
  SNOOZED
  FAILED
}

// ─────────────────────────────────────────────
// GOALS
// ─────────────────────────────────────────────

model Goal {
  id            String      @id @default(cuid())
  userId        String
  title         String
  description   String?     @db.Text
  category      String?
  targetDate    DateTime?
  status        GoalStatus  @default(ACTIVE)
  progressPct   Float       @default(0)
  isPublic      Boolean     @default(false)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  completedAt   DateTime?
  deletedAt     DateTime?

  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  milestones  GoalMilestone[]

  @@index([userId, status])
}

enum GoalStatus {
  ACTIVE
  COMPLETED
  PAUSED
  CANCELLED
}

model GoalMilestone {
  id          String    @id @default(cuid())
  goalId      String
  title       String
  dueDate     DateTime?
  isCompleted Boolean   @default(false)
  completedAt DateTime?
  order       Int       @default(0)
  createdAt   DateTime  @default(now())

  goal   Goal   @relation(fields: [goalId], references: [id], onDelete: Cascade)
  tasks  Task[]

  @@index([goalId])
}

// ─────────────────────────────────────────────
// HABITS
// ─────────────────────────────────────────────

model Habit {
  id              String        @id @default(cuid())
  userId          String
  title           String
  description     String?
  frequency       HabitFreq     @default(DAILY)
  targetDaysOfWeek Int[]        @default([]) // 0=Sun, 1=Mon...6=Sat
  reminderTime    String?       // "08:00"
  currentStreak   Int           @default(0)
  longestStreak   Int           @default(0)
  isActive        Boolean       @default(true)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?

  user  User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  logs  HabitLog[]

  @@index([userId, isActive])
}

enum HabitFreq {
  DAILY
  WEEKLY
  CUSTOM
}

model HabitLog {
  id          String    @id @default(cuid())
  habitId     String
  completedOn DateTime  @db.Date
  note        String?
  createdAt   DateTime  @default(now())

  habit  Habit @relation(fields: [habitId], references: [id], onDelete: Cascade)

  @@unique([habitId, completedOn])
  @@index([habitId])
}

// ─────────────────────────────────────────────
// CALENDAR INTEGRATION
// ─────────────────────────────────────────────

model CalendarIntegration {
  id              String    @id @default(cuid())
  userId          String
  provider        String    // "google" | "outlook"
  accountEmail    String
  accessToken     String    @db.Text
  refreshToken    String?   @db.Text
  tokenExpiresAt  DateTime?
  syncEnabled     Boolean   @default(true)
  lastSyncedAt    DateTime?
  calendarIds     String[]  @default([]) // which calendars to sync
  webhookChannelId String?
  webhookExpiry   DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  user  User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, provider, accountEmail])
  @@index([userId])
}

// ─────────────────────────────────────────────
// AI CONVERSATIONS
// ─────────────────────────────────────────────

model AiConversation {
  id          String      @id @default(cuid())
  userId      String
  title       String?
  context     Json?       // snapshot of user state at conversation start
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  AiMessage[]

  @@index([userId])
}

model AiMessage {
  id              String    @id @default(cuid())
  conversationId  String
  role            String    // "user" | "assistant"
  content         String    @db.Text
  toolCalls       Json?     // AI tool call records
  tokenCount      Int?
  latencyMs       Int?
  createdAt       DateTime  @default(now())

  conversation  AiConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
}

// ─────────────────────────────────────────────
// SUBSCRIPTIONS & BILLING
// ─────────────────────────────────────────────

model Subscription {
  id                   String    @id @default(cuid())
  userId               String    @unique
  stripeCustomerId     String    @unique
  stripeSubscriptionId String?   @unique
  stripePriceId        String?
  plan                 Plan
  status               SubStatus @default(ACTIVE)
  currentPeriodStart   DateTime?
  currentPeriodEnd     DateTime?
  cancelAtPeriodEnd    Boolean   @default(false)
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  user  User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum SubStatus {
  ACTIVE
  PAST_DUE
  CANCELLED
  TRIALING
  PAUSED
}

// ─────────────────────────────────────────────
// TEAMS (Phase 2)
// ─────────────────────────────────────────────

model Team {
  id          String    @id @default(cuid())
  name        String
  slug        String    @unique
  ownerId     String
  plan        Plan      @default(TEAMS)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  members     TeamMember[]
}

model TeamMember {
  id        String    @id @default(cuid())
  teamId    String
  userId    String
  role      TeamRole  @default(MEMBER)
  joinedAt  DateTime  @default(now())

  team  Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user  User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([teamId, userId])
}

enum TeamRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}

// ─────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────

model AnalyticsEvent {
  id         String   @id @default(cuid())
  userId     String?
  eventName  String   // "task_created", "task_completed", "reminder_dismissed", etc.
  properties Json?
  sessionId  String?
  ipHash     String?  // hashed for privacy
  userAgent  String?
  createdAt  DateTime @default(now())

  user  User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId, eventName])
  @@index([createdAt])
}
```

---

## Key Indexes Summary

| Table | Index | Purpose |
|---|---|---|
| tasks | (userId, status) | Dashboard queries |
| tasks | (userId, dueDate) | Timeline view |
| tasks | (userId, priority) | Priority view |
| task_reminders | (remindAt, status) | Reminder job scheduler |
| analytics_events | (userId, eventName) | User analytics |
| analytics_events | (createdAt) | Time-series queries |

---

## Migration Strategy

1. All migrations managed via `prisma migrate dev` (development) and `prisma migrate deploy` (production)
2. Never edit migration files after applied — always create new migrations
3. Soft deletes used for `users`, `tasks`, `goals`, `habits` (deletedAt field)
4. All sensitive fields (tokens) encrypted at rest via Supabase encryption

---

## Seed Data (Development)

```typescript
// prisma/seed.ts
// Creates 3 test users: free, pro, teams plan
// Creates sample tasks with various statuses, priorities, and due dates
// Creates sample goals with milestones
// Creates sample habits with logs
```

---

*Schema Owner: Backend Team | Last Updated: June 2026*
