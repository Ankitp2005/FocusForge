# User Flows & Onboarding
## Last-Minute Life Saver
**Version:** 1.0

---

## 1. Onboarding Flow (New User)

### Goal: Get user to their first AI-prioritized task list in < 3 minutes

```
Step 1: Landing Page
  → Headline: "Stop missing deadlines. Start finishing what matters."
  → CTA: "Get started free" / "See how it works" (30-sec demo video)

Step 2: Sign Up
  → Google OAuth (primary — one click)
  → OR Email + Password
  → No credit card required

Step 3: Quick Profile Setup (1 screen, 3 questions)
  → "What describes you best?" (Student / Professional / Entrepreneur / Other)
  → "When do you typically work?" (Work hours selector — default 9am-6pm)
  → "Your timezone?" (auto-detected, confirm)
  → [Next →]

Step 4: Connect Calendar (optional but encouraged)
  → "Sync your Google Calendar so LMLS knows when you're free"
  → [Connect Google Calendar] or [Skip for now]
  → If skip: "You can connect anytime in Settings"

Step 5: Add First Task (interactive demo)
  → "Let's add your first task. Type anything:"
  → Example pre-filled: "Submit project report by Friday"
  → AI parses and shows what it extracted (live demo of parsing)
  → User confirms or edits
  → [This looks right →]

Step 6: Meet Your AI Coach
  → AI Coach panel slides in
  → AI says: "Hi [name]! I see your first task is due [date].
              Based on the timing, I'd suggest starting [day].
              Want me to block focus time for you?"
  → [Yes, schedule it] or [I'll handle it myself]

Step 7: Dashboard
  → User lands on priority queue with their first task
  → Tooltip walkthrough (skippable): 3 tooltips on key features
  → Done!
```

---

## 2. Core Task Flows

### 2.1 Add Task (Quick Path)
```
User clicks [+ Add task] or types in quick-add bar
  → Types: "Call Sarah tomorrow 3pm re: contract"
  → AI parses in real-time (shows detected fields as chips)
  → User hits Enter or [Add]
  → Task appears at top of priority queue
  → AI Coach: "Added! Sarah's contract call is booked for tomorrow 3pm 📞"
  → Reminder automatically scheduled for 30 min before
```

### 2.2 Complete Task
```
User clicks checkbox on task card
  → Checkbox fills green with animation
  → Card slides up and disappears (with undo option: 5 seconds)
  → Progress counter updates: "12 tasks completed today 🔥"
  → If it was a streak-breaking completion: celebration animation
  → AI Coach proactively: "Great work! Next up: [next priority task]"
```

### 2.3 Respond to Urgent Reminder
```
Reminder fires (in-app notification):
  "🔴 Your Q3 report is due in 3 hours — you haven't started yet!"
  [Start now] [Snooze 1h] [Ask AI for help] [Dismiss]

If "Start now":
  → Task moves to IN_PROGRESS
  → Optional: Starts focus timer
  → Calendar block created

If "Ask AI for help":
  → AI Coach opens with context:
    "I see you have 3 hours. The report needs about 2h. 
     Let me break it into steps... 
     Step 1: Gather data (20min)
     Step 2: Write draft (80min)
     Step 3: Review and send (20min)
     Want me to set a timer for each?"

If "Snooze 1h":
  → AI asks: "Are you sure? You'll only have 2h left.
              How about I remind you in 30 min instead?"
  → Smart snooze (not blind +1h)
```

### 2.4 Plan My Day
```
User clicks "Plan My Day" button (or it auto-triggers at work start time)

Step 1: AI collects context
  → Fetches all pending tasks
  → Fetches calendar blocks for today
  → Checks habit schedule
  → Loads user work hours and preferences

Step 2: AI generates plan (< 5 seconds)
  → Shows animated "Planning your day..." state

Step 3: Proposed plan displayed
  ┌──────────────────────────────────┐
  │  Your Day — Tuesday, June 28     │
  ├──────────────────────────────────┤
  │  09:00 - 10:30 | Q3 Report      │ ← Drag to adjust
  │  10:30 - 10:45 | Break          │
  │  10:45 - 11:45 | Contract review│
  │  12:00 - 13:00 | Lunch          │
  │  13:00 - 13:30 | Email catch-up │
  │  13:30 - 14:00 | Morning workout│ ← Habit
  ├──────────────────────────────────┤
  │  ⚠️ 2 tasks deferred to tomorrow │
  │  (You only have 5h available)   │
  └──────────────────────────────────┘

Step 4: User adjusts (optional)
  → Can drag blocks to change times
  → Can swap task order
  → Can remove a block
  → "I'll handle this myself" option

Step 5: Confirm plan
  → [Looks good, lock it in]
  → Blocks pushed to Google Calendar
  → Reminders scheduled for each block
```

---

## 3. Upgrade Flow (Free → Pro)

```
Trigger points (where upgrade prompt appears):
  1. User hits 20-task limit: "You've reached the free plan limit"
  2. User tries to connect calendar: "Calendar sync is a Pro feature"
  3. User sends 21st AI request: "You've used all 20 daily AI messages"
  4. Weekly analytics: "Unlock detailed analytics with Pro"

Upgrade modal:
  ┌──────────────────────────────────────────┐
  │  🚀 Upgrade to Pro                       │
  │  Remove limits. Stay productive.         │
  ├──────────────────────────────────────────┤
  │  ✓ Unlimited tasks                       │
  │  ✓ Google Calendar sync                 │
  │  ✓ 200 AI messages per day              │
  │  ✓ Advanced analytics                   │
  │  ✓ Priority support                     │
  ├──────────────────────────────────────────┤
  │  $12/month  (or $9/mo billed annually)  │
  │                                          │
  │  [Start Pro — 7 day free trial]          │
  │  [Maybe later]                           │
  └──────────────────────────────────────────┘

Payment flow:
  → Stripe Checkout (hosted)
  → Return to app after success
  → Features unlocked immediately
  → Confirmation email sent
```

---

## 4. Key Retention Flows

### 4.1 Daily Re-engagement (Morning Email)
```
Sent at: User's work start time (configurable)
Subject: "⚡ Your day: 3 tasks due, 1 critical"

Content:
  Good morning [Name]!

  Today at a glance:
  🔴 Submit Q3 report — Due 5pm TODAY
  🟠 Call client re: contract — Due today
  🟡 Review team PRs — Due tomorrow

  [Open my plan →]

Footer: You're on a 5-day completion streak 🔥
```

### 4.2 Weekly AI Review
```
Sent at: Sunday evening (configurable)
Subject: "📊 Your week in review — 78% completion rate"

Content:
  Hi [Name], here's your week:

  🏆 Wins: 
  • Completed 14/18 tasks
  • Best day: Wednesday (6 tasks done)
  • 5-day habit streak on morning workout

  📉 Things that slipped:
  • 3 tasks pushed to next week (all low priority — OK)
  • Tuesday felt overloaded (8 tasks in one day)

  💡 Next week suggestion:
  • Cap daily tasks at 5 for a more realistic load
  • Your Q4 planning tasks are starting to pile up — let's tackle them

  [See full report] [Plan next week with AI]
```

### 4.3 Re-engagement (Inactive User — 3 days)
```
Email subject: "Hey [Name] — your tasks are waiting"

Content:
  You haven't checked in for 3 days.
  
  Here's what's pending:
  • 2 overdue tasks
  • 5 tasks due this week
  
  Your AI coach is ready to help you catch up.
  
  [Get back on track →]
```

---

## 5. Error States & Edge Cases

### Empty States
| State | Message | CTA |
|---|---|---|
| No tasks | "No tasks yet — you're all clear!" | [+ Add first task] |
| All completed | "🎉 Everything done! Enjoy your day." | [+ Add new task] |
| No tasks due today | "Nothing due today — get ahead on tomorrow's tasks" | [View this week] |
| AI unavailable | "AI coach is taking a quick break. Try again in a moment." | [Retry] |
| Calendar disconnected | "Calendar sync paused — reconnect to keep tasks in sync" | [Reconnect] |

### Error Handling Rules
- Never show raw error messages to users
- Always provide a recovery action
- Log errors to Sentry with full context
- AI errors: fall back gracefully (show cached data, don't break the app)
- Network offline: show offline banner, queue mutations, sync on reconnect

---

*UX Owner: Product + Design Team | Last Updated: June 2026*
