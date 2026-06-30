# FocusForge — Project Submission

## Tagline
> *AI-powered productivity intelligence that turns intention into execution.*

---

## Problem Statement

The modern knowledge worker faces a paradox: we have more tools to manage our time than ever before, yet global productivity is declining. According to McKinsey Global Institute, knowledge workers spend nearly **60% of their workday on coordination and communication** rather than skilled work. Existing productivity apps treat tasks as static checklists — they capture what needs to be done, but offer no intelligence about *when*, *how*, or *why*.

Mental load — the cognitive burden of planning, prioritizing, and remembering — is invisible, unmeasured, and unmanaged. The result: burnout, missed deadlines, and the chronic feeling of being busy without being productive.

---

## Our Solution — FocusForge

**FocusForge** is an AI-native productivity platform that replaces passive task lists with an intelligent, adaptive productivity engine. It combines the power of **Google Gemini AI** with real-time behavioral data to understand how you work — not just what you plan to do — and helps you close the gap between intent and execution.

FocusForge dynamically prioritizes your day using a proprietary **AI scoring engine**, parses natural-language task input, and generates personalized coaching insights — functioning as a cognitive co-pilot that learns and grows with you.

---

## Key Features

| Feature | Description |
|---|---|
| 🧠 **Natural Language Task Parsing** | Describe tasks in plain English — Gemini AI extracts titles, deadlines, priorities, tags, and recurrence automatically |
| 📊 **Dynamic Priority Scoring** | Tasks are scored in real-time based on urgency, effort, and behavioral history — not just due dates |
| 🎯 **AI Daily Planning** | One-click AI-generated daily plan that allocates tasks to time blocks based on your energy and context |
| 💬 **AI Coach** | Conversational productivity coach powered by Gemini that understands your full task and habit history |
| 🔄 **Habit Tracking** | Streak-based habit system with frequency rules (daily/weekly/monthly) and completion analytics |
| 🎯 **Goal Management** | Long-horizon goal tracking with milestone decomposition and AI-generated progress summaries |
| 📅 **Smart Calendar** | Full calendar integration with FullCalendar for scheduling visualization and time-block planning |
| ⚡ **Real-time Sync** | Socket.IO-powered live updates across all devices — changes reflect instantly |
| 🔔 **Background Workers** | BullMQ + Redis queue system for scheduled reminders and async AI processing |
| 👥 **Subscription Tiers** | Stripe-integrated billing with free and premium plans |

---

## Technical Architecture

FocusForge is built as a production-grade, cloud-native monorepo — designed for scale, reliability, and extensibility.

### Stack

```
Frontend        React 18 + TypeScript + Vite + TailwindCSS
Backend         Node.js + Express + TypeScript
AI Engine       Google Gemini 1.5 Flash (via @google/generative-ai)
Database        Neon Serverless PostgreSQL + Prisma ORM
Auth            Clerk (JWT-based, zero-session-storage)
Queue System    BullMQ + Upstash Redis
Realtime        Socket.IO (WebSocket)
Payments        Stripe (subscription billing)
Email           Resend (transactional)
Deployment      Render (Backend + Frontend) + Neon (DB)
Monorepo        npm Workspaces
```

### Architecture Highlights

- **Separation of concerns**: API server and background worker run as independent concurrent processes, enabling fault isolation
- **Serverless-ready database**: Neon's connection pooling and scale-to-zero architecture ensures cost efficiency at any scale
- **Stateless auth**: Clerk JWTs are verified server-side on every request — no session storage, fully cloud-native
- **Type safety end-to-end**: Shared Prisma types between API layers eliminate entire categories of runtime errors
- **AI orchestration**: Gemini API calls are structured with Zod-validated schemas, preventing hallucinated or malformed responses from reaching the database

---

## Impact & Innovation

### What makes FocusForge different

Most productivity apps are **passive** — they store what you tell them. FocusForge is **active** — it reasons about your work, surfaces what matters most, and coaches you toward your goals.

The integration of **Gemini AI as a reasoning layer** (not just a chatbot) is the core innovation. Instead of wrapping AI around a CRUD app, we built the data model *around* the AI's understanding of tasks, habits, goals, and behavioral patterns. Every data point — completion rates, streak history, priority scores, time estimates — feeds the AI coach, making it genuinely context-aware.

### Real-world impact potential

- **Individuals**: Reduces decision fatigue by automating daily planning
- **Students**: Habit and goal tracking for academic performance improvement
- **Remote teams**: Async-first productivity with real-time sync across time zones
- **Mental health**: Reduces burnout by surfacing workload patterns and recovery insights

---

## Live Demo

- **Application**: [https://focusforge-frontend-9hi2.onrender.com](https://focusforge-frontend-9hi2.onrender.com)
- **API**: [https://focusforge-api-pka3.onrender.com](https://focusforge-api-pka3.onrender.com)
- **Source Code**: [https://github.com/Ankitp2005/FocusForge](https://github.com/Ankitp2005/FocusForge)

---

## Team

**Ankit Pandey** — Full-Stack Developer & AI Systems Engineer  
Designed, built, and deployed the entire FocusForge platform end-to-end — from database schema design and AI prompt engineering to React UI and cloud infrastructure.

---

## Built With Google Technology

FocusForge is powered by **Google Gemini 1.5 Flash** as its core intelligence layer:

- Natural language understanding for task parsing
- Contextual daily plan generation
- Personalized coaching conversations with full memory of user history
- Progress analysis and motivational feedback generation

Gemini was chosen for its **long-context window**, **structured output capabilities** (critical for reliable JSON extraction), and its ability to maintain coherent multi-turn conversations about complex productivity data.

---

*FocusForge — Because the gap between potential and performance is a systems problem.*
