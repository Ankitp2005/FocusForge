# Tech Stack — Last-Minute Life Saver
**Version:** 1.0 | **Updated:** June 2026

---

## Architecture Philosophy

- **Web-first, API-driven**: React SPA frontend, Node.js/FastAPI backend, REST + WebSockets
- **AI-native**: Claude API deeply integrated, not bolted on
- **Cloud-native**: Deployed on AWS, containerized with Docker, orchestrated with ECS Fargate
- **Modular monolith → microservices**: Start with modular monolith, extract services as load demands

---

## Frontend

| Layer | Technology | Rationale |
|---|---|---|
| Framework | **React 18** (with Vite) | Component model, ecosystem, concurrent features |
| Language | **TypeScript** | Type safety, better AI-assisted development |
| State Management | **Zustand** | Lightweight, simple, no boilerplate |
| Routing | **React Router v6** | Industry standard, nested routes |
| UI Component Library | **shadcn/ui** + **Radix UI** | Accessible, unstyled primitives, fully customizable |
| Styling | **Tailwind CSS** | Utility-first, consistent design system |
| Data Fetching | **TanStack Query (React Query)** | Cache management, background refetch, optimistic updates |
| Forms | **React Hook Form** + **Zod** | Performant forms, schema validation |
| Date/Time | **date-fns** | Lightweight, tree-shakeable, locale support |
| Charts/Viz | **Recharts** | React-native charts, responsive |
| Drag & Drop | **dnd-kit** | Accessible, modern, touch-friendly |
| Animations | **Framer Motion** | Smooth, performant animations |
| Calendar UI | **FullCalendar** (React wrapper) | Feature-rich calendar component |
| Notifications | **react-hot-toast** | Lightweight toast notifications |
| PWA | **Vite PWA Plugin** | Service worker, offline support |
| Testing | **Vitest** + **React Testing Library** | Unit + integration tests |
| E2E Testing | **Playwright** | Cross-browser end-to-end |

---

## Backend

| Layer | Technology | Rationale |
|---|---|---|
| Runtime | **Node.js 20 LTS** | JS ecosystem, async I/O, shared types with frontend |
| Framework | **Express.js** (with TypeScript) | Mature, flexible, massive ecosystem |
| API Style | **REST** (primary) + **WebSockets** (real-time) | REST for CRUD, WS for live updates |
| Validation | **Zod** | Runtime schema validation, shared with frontend |
| ORM | **Prisma** | Type-safe DB access, migrations, great DX |
| Authentication | **Passport.js** + **JWT** + **OAuth 2.0** | Flexible auth strategies |
| Job Queue | **BullMQ** (Redis-backed) | Scheduled jobs, reminders, async processing |
| Caching | **Redis** | Session store, rate limiting, response cache |
| File Processing | **Multer** | Multipart form handling |
| Email | **Resend** | Modern email API, great deliverability |
| Logging | **Winston** + **Pino** | Structured logging |
| Testing | **Jest** + **Supertest** | Unit + API integration tests |

---

## AI / ML Layer

| Component | Technology | Rationale |
|---|---|---|
| Primary LLM | **Anthropic Claude API** (claude-sonnet-4-6) | Best reasoning, context handling, safety |
| AI Orchestration | **Custom Agent Framework** (Node.js) | Tool-use pattern, multi-step planning |
| Embeddings | **OpenAI text-embedding-3-small** | Task similarity, smart search |
| Vector DB | **pgvector** (PostgreSQL extension) | Embedding storage without extra infra |
| NLP (task parsing) | **Claude API** with structured output | Natural language → task schema |
| Prompt Management | **Promptfoo** | Prompt versioning, evaluation, testing |
| Caching (AI) | **Redis** (semantic cache) | Reduce API costs on repeated queries |

---

## Database

| Database | Use Case | Technology |
|---|---|---|
| Primary DB | Users, tasks, goals, habits | **PostgreSQL 16** (via Supabase) |
| Cache | Sessions, rate limiting, job queues | **Redis 7** (Upstash) |
| Vector Store | Task embeddings, semantic search | **pgvector** extension on Postgres |
| Analytics | Event tracking, usage metrics | **ClickHouse** (self-hosted or Tinybird) |
| Search | Full-text task search | **PostgreSQL FTS** (pg_trgm) |

---

## Infrastructure & DevOps

| Layer | Technology | Rationale |
|---|---|---|
| Cloud Provider | **AWS** | Mature, comprehensive, scalable |
| Compute | **ECS Fargate** | Serverless containers, auto-scaling |
| Container Registry | **AWS ECR** | Native ECS integration |
| CI/CD | **GitHub Actions** | Automated test, build, deploy pipeline |
| Infrastructure as Code | **Terraform** | Reproducible infra, version-controlled |
| CDN | **AWS CloudFront** | Global edge, static asset delivery |
| Static Hosting | **S3 + CloudFront** | Frontend SPA hosting |
| Load Balancer | **AWS ALB** | Layer 7 routing, SSL termination |
| Database Hosting | **Supabase** (managed Postgres) | Managed DB with built-in auth, realtime |
| Redis Hosting | **Upstash** | Serverless Redis, no ops overhead |
| Secrets Management | **AWS Secrets Manager** | Encrypted secrets, rotation |
| Monitoring | **Datadog** | APM, logs, dashboards, alerts |
| Error Tracking | **Sentry** | Real-time error alerting |
| Uptime Monitoring | **Better Uptime** | Endpoint monitoring, status page |
| DNS | **Route 53** | AWS-native DNS management |
| SSL/TLS | **AWS ACM** | Free managed certs |

---

## Third-Party Integrations

| Integration | API/SDK | Purpose |
|---|---|---|
| Google Calendar | Google Calendar API v3 | Two-way calendar sync |
| Google OAuth | Google Identity Services | Login with Google |
| Stripe | Stripe API + Webhooks | Payments, subscriptions |
| Resend | Resend API | Transactional email |
| Slack (Phase 2) | Slack Web API | Team notifications |
| MS Teams (Phase 2) | Microsoft Graph API | Enterprise calendar + notifications |

---

## Development Tools

| Tool | Purpose |
|---|---|
| **pnpm** | Fast, efficient package management |
| **ESLint** + **Prettier** | Code quality + formatting |
| **Husky** + **lint-staged** | Pre-commit hooks |
| **Commitlint** | Conventional commit messages |
| **Docker** + **Docker Compose** | Local dev environment |
| **Bruno** | API testing (open-source Postman) |
| **Storybook** | Component development + documentation |
| **Turborepo** | Monorepo build orchestration |

---

## Repository Structure

```
lmls/
├── apps/
│   ├── web/                 # React frontend (Vite)
│   └── api/                 # Express.js backend
├── packages/
│   ├── types/               # Shared TypeScript types
│   ├── schemas/             # Shared Zod schemas
│   ├── ui/                  # Shared UI components
│   └── utils/               # Shared utilities
├── infra/
│   └── terraform/           # AWS infrastructure
├── .github/
│   └── workflows/           # CI/CD pipelines
├── docs/                    # All documentation
└── docker-compose.yml       # Local dev stack
```

---

## Environment Configuration

```bash
# apps/api/.env.example

# App
NODE_ENV=development
PORT=3001
APP_URL=http://localhost:5173
API_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/lmls
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your-secret-here
JWT_EXPIRY=7d
SESSION_SECRET=your-session-secret

# Google OAuth + Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# Anthropic
ANTHROPIC_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Email
RESEND_API_KEY=

# Monitoring
SENTRY_DSN=
DATADOG_API_KEY=
```

---

## Performance Targets

| Metric | Target |
|---|---|
| Lighthouse Performance Score | ≥ 90 |
| Time to Interactive (TTI) | < 3.5s |
| First Contentful Paint (FCP) | < 1.5s |
| API P95 Latency | < 300ms |
| WebSocket message latency | < 100ms |
| Database query P95 | < 50ms |

---

*Tech Stack Owner: Engineering Lead | Last Updated: June 2026*
