# FocusForge ⚒️

> **Forging Pure Productivity.** Stop vibing, start shipping.

FocusForge is a high-octane, neobrutalist productivity console designed for builders. It integrates task management, Pomodoro timers, and calendar scheduling under a proactive AI Coach.

---

## ⚡ Key Features

* **🤖 Proactive AI Coach**: Talk directly with your AI productivity coach to add tasks, re-schedule items, get motivational feedback, and optimize your schedule.
* **📅 Google Calendar Synchronization**: FocusForge automatically overlays tasks directly onto your Google Calendar schedule, carving out dedicated focus slots to prevent cognitive overload.
* **⏱️ Pomodoro Tracker**: Standardized countdown timer to track active sessions.
* **🏆 Challenges & Milestones**: Gamify your targets by creating active challenges with difficulty star ratings.
* **💥 Neobrutalist UI**: A high-contrast, cyberpunk-inspired visual dashboard designed for fast, distraction-free navigation.

---

## 🏗️ Tech Stack

* **Frontend**: React, TypeScript, Vite, Tailwind CSS, Socket.io Client, Clerk Auth.
* **Backend**: Node.js, Express, Socket.io, BullMQ (Redis-backed task queue), Prisma ORM.
* **Database**: Serverless PostgreSQL (hosted on **Neon**).
* **Integrations**: Google Calendar API (OAuth 2.0), Clerk Identity, Stripe billing, Resend email.

---

## ⚙️ Local Development

### 1. Prerequisite Installations
* **Node.js** (v18 or higher)
* **Redis** (running locally or in Docker)
* **PostgreSQL** (or a serverless Neon database connection string)

### 2. Configure Environment Variables
Create an `.env` file in `apps/api/` with the following variables:
```env
PORT=3001
APP_URL=http://localhost:5173
API_URL=http://localhost:3001
DATABASE_URL=your_postgres_connection_string
REDIS_URL=redis://localhost:6379
CLERK_SECRET_KEY=your_clerk_secret
CLERK_PUBLISHABLE_KEY=your_clerk_publishable
GEMINI_API_KEY=your_gemini_api_key
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
RESEND_API_KEY=your_resend_api_key
```

### 3. Install & Start Development Servers
From the root workspace directory, run:
```bash
# Install dependencies across all workspaces
npm install

# Run database migrations
npm run db:generate --workspace=apps/api
npm run db:migrate --workspace=apps/api

# Start Web Client & API server simultaneously
npm run dev

# In another terminal window, start the BullMQ worker
npm run worker
```

---

## 🚀 Deployment (1-Click Render.com Blueprint)

FocusForge includes a pre-configured `render.yaml` file for automated deployment on the **Render.com Free Tier**.

1. Connect your repository to your **Render** account.
2. Select **New > Blueprint**.
3. Choose the FocusForge repository.
4. Input the environment secrets (e.g. `DATABASE_URL`, `CLERK_SECRET_KEY`, `GEMINI_API_KEY`) when prompted.
5. Click **Deploy**. Render will automatically provision:
   * A free internal Redis database.
   * A Node.js Web Service running the API and worker concurrently.
   * A static site container hosting the React frontend app.
