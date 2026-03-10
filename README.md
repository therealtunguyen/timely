# Timely

**Find a time that works for everyone.**

A scheduling app where participants mark availability on a shared grid and a heatmap reveals the overlap. No accounts required. [timely-cyan-three.vercel.app](https://timely-cyan-three.vercel.app)

## What it does

Create an event, share the link, and let everyone paint their availability on a drag-to-select grid. A live heatmap shows where schedules overlap so you can pick the best time at a glance. Once you've decided, confirm the winning slot and participants receive a notification.

## Features

- No accounts — identity is name + 4-digit PIN
- Drag-to-paint availability grid (touch-native)
- Real-time heatmap overlap visualization with indigo-purple intensity scale
- Magic link email authentication (PIN fallback)
- Auto-expiry of old events (daily cron at 3 AM UTC)
- Calendar export *(planned)*

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5.9 |
| Styling | Tailwind CSS 4, shadcn/ui (New York), Framer Motion |
| Fonts | Outfit (body/headings) + Work Sans (display) |
| Database | Neon (serverless Postgres) + Drizzle ORM |
| State | Zustand 5 (UI only) |
| Email | Resend + React Email |
| Rate limiting | Upstash Redis + @upstash/ratelimit |
| Deployment | Vercel |

## Getting Started

**Prerequisites:** Node.js 20+, npm

```bash
# 1. Clone and install
git clone <repo-url>
cd timely
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Fill in all six variables (see table below)

# 3. Run migrations
npm run db:migrate

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Source |
|---|---|
| `DATABASE_URL` | Neon Console → Connection string (pooled) |
| `UPSTASH_REDIS_REST_URL` | Upstash Console → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Console → REST API |
| `RESEND_API_KEY` | Resend Dashboard → API Keys |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally; Vercel URL in prod |

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint (next lint) |
| `npm run db:generate` | Generate migrations from schema changes |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:push` | Push schema directly to DB (dev only) |
| `npm run db:studio` | Open Drizzle Studio (local DB explorer) |
