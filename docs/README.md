# Last-Minute Life Saver (LMLS)
## AI-Powered Productivity Companion — Project Documentation Index

> **"Stop missing deadlines. Start finishing what matters."**

---

## What Is LMLS?

Last-Minute Life Saver is a proactive AI-powered web application that helps students, professionals, and entrepreneurs manage deadlines, prioritize tasks, and get things done — before it's too late.

Unlike passive reminder apps, LMLS acts as an intelligent productivity partner: it understands your workload, predicts which tasks are at risk, builds you a daily plan, and coaches you through completion.

---

## Documentation Index

| Document | Location | Description |
|---|---|---|
| **Product Requirements** | `docs/PRD.md` | Full product spec: features, user stories, metrics, launch plan |
| **Tech Stack** | `docs/TECH_STACK.md` | All technologies, rationale, environment config |
| **Architecture & Workflows** | `docs/ARCHITECTURE.md` | System design, data flows, API patterns |
| **Database Schema** | `schemas/DATABASE_SCHEMA.md` | Full Prisma schema, ERD, migration strategy |
| **API Specification** | `api/API_SPEC.md` | All endpoints, request/response formats |
| **AI Agent Skills** | `agents/AI_AGENT_SKILLS.md` | Claude prompts, tool schemas, agent patterns |
| **Security & Audit** | `security/SECURITY.md` | Auth, encryption, compliance, incident response |
| **Infrastructure & DevOps** | `infra/INFRASTRUCTURE.md` | AWS setup, Docker, CI/CD, monitoring |

---

## Quick Reference

### Core Value Propositions
1. **AI prioritization** — Automatically ranks tasks by deadline urgency, effort, and dependencies
2. **Proactive AI coach** — Conversational assistant that knows your full context
3. **Smart reminders** — Escalating, context-aware alerts (not just calendar pings)
4. **Daily planning** — AI-generated time-blocked schedules in 30 seconds
5. **Calendar sync** — Two-way Google Calendar integration
6. **Goal & habit tracking** — Long-term momentum with AI weekly reviews

### Target Users
- 🎓 Students managing assignment deadlines
- 💼 Professionals juggling meetings and deliverables
- 🚀 Entrepreneurs tracking commitments and recurring tasks
- 👥 Teams who need deadline visibility (Phase 2)

### Revenue Model
| Plan | Price | Key Features |
|---|---|---|
| Free | $0 | 20 tasks, basic reminders, 20 AI requests/day |
| Pro | $12/mo | Unlimited tasks, calendar sync, full AI coach, analytics |
| Teams | $29/seat/mo | Shared boards, team visibility, Slack integration |
| Enterprise | Custom | Custom integrations, SSO, dedicated support |

---

## Tech Summary

```
Frontend:    React 18 + TypeScript + Tailwind CSS + shadcn/ui
Backend:     Node.js + Express.js + Prisma + PostgreSQL
AI:          Anthropic Claude API (claude-sonnet-4-6)
Real-time:   WebSockets (BullMQ + Redis)
Auth:        JWT + Google OAuth 2.0
Payments:    Stripe
Email:       Resend
Infra:       AWS ECS Fargate + CloudFront + S3
CI/CD:       GitHub Actions → ECS
Database:    Supabase (Postgres 16 + pgvector)
Cache/Queue: Upstash Redis
```

---

## Development Quick Start

```bash
git clone https://github.com/your-org/lmls.git
cd lmls
npm install
cp apps/api/.env.example apps/api/.env
# Fill in ANTHROPIC_API_KEY and GOOGLE_OAUTH credentials
docker-compose up -d
npm run dev
# → Web: http://localhost:5173
# → API: http://localhost:3001
```

---

## Key Architecture Decisions

| Decision | Choice | Why |
|---|---|---|
| AI Provider | Anthropic Claude | Best reasoning, tool use, safety guarantees |
| Database | PostgreSQL + pgvector | Relational + vector search in one DB |
| Real-time | WebSockets over SSE | Full duplex needed for AI streaming + task updates |
| Auth | JWT + refresh rotation | Stateless scale + security (token reuse detection) |
| Deployment | ECS Fargate | Serverless containers, auto-scale, no k8s complexity |
| Monorepo | Turborepo | Shared types/schemas between frontend and backend |

---

## AI Coding Agent Instructions

If you are an AI coding agent building this product, follow this order:

1. **Read** `docs/TECH_STACK.md` — understand the full stack before writing any code
2. **Read** `schemas/DATABASE_SCHEMA.md` — set up Prisma schema first
3. **Read** `api/API_SPEC.md` — build API endpoints to spec
4. **Read** `agents/AI_AGENT_SKILLS.md` — implement AI features using exact prompts
5. **Read** `security/SECURITY.md` — apply security requirements throughout
6. **Read** `infra/INFRASTRUCTURE.md` — use Docker Compose for local dev
7. **Reference** `docs/PRD.md` — resolve ambiguity by going back to product requirements

### Key Constraints for AI Agents
- **Never deviate from the Prisma schema** without documenting why
- **Always validate AI outputs** with Zod before using them
- **Never expose secrets** to the frontend — all AI calls go through the backend
- **All task mutations** must check `userId === authenticatedUser.id`
- **Rate limit** all AI endpoints per user per plan

---

## Project Status

| Phase | Status |
|---|---|
| Documentation | ✅ Complete |
| Local Dev Setup | 🔧 In Progress |
| Core API (F-01 to F-05) | 📋 Planned |
| Frontend MVP | 📋 Planned |
| AI Integration | 📋 Planned |
| Beta Launch | 📋 Month 3–4 |
| Public Launch | 📋 Month 5 |

---

*Last Updated: June 2026 | Version: 1.0*  
*For questions: See PRD.md for product decisions, ARCHITECTURE.md for technical decisions*
