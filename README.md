# Alive Supabase

**Alive Supabase** is a lightweight Next.js utility from **BuilderBite** for
keeping multiple Supabase projects warm through a protected scheduled endpoint.

It is designed for teams that manage many Supabase projects and want one simple
machine-friendly URL that can be called daily from a VPS cron job, PM2-hosted
server, or an external scheduler such as cron-job.org.

Production domain used by BuilderBite:

```text
https://alive.builderbite.com
```

## Features

- Keep-alive endpoint for multiple Supabase projects
- Server-only project configuration through environment variables
- Supports many Supabase accounts/projects with indexed env variables
- Protected cron endpoint using `CRON_SECRET`
- Simple dashboard for latest run status
- Local last-run result storage in `.data/last-run.json`
- Works with Linux cron, VPS cron, cron-job.org, uptime monitors, and other URL schedulers
- PM2 and Nginx deployment files included

## How It Works

The app reads your configured Supabase project refs from the server environment,
then calls the default Supabase Auth health endpoint:

```text
https://<project-ref>.supabase.co/auth/v1/health
```

The request also sends the configured anon key headers when available. No
Supabase service role key is required.

The public dashboard never exposes anon keys.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- PM2 for VPS process management
- Nginx reverse proxy for production deployment

## Local Development

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.example .env.local
```

Start the local dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Local development uses port `3000`. The production VPS deployment uses port
`1209` behind Nginx.

## Environment Variables

Create `.env.local` on the server or locally.

```bash
CRON_SECRET=replace-with-a-long-random-secret

PING_TIMEOUT_MS=15000
PING_CONCURRENCY=5
MAX_INDEXED_PROJECTS=50
SUPABASE_PING_PATH=/auth/v1/health

SUPABASE_PROJECT_1_NAME=Main workload
SUPABASE_PROJECT_1_REF=your-project-ref-1
SUPABASE_PROJECT_1_ANON_KEY=your-anon-key-1

SUPABASE_PROJECT_2_NAME=Second workload
SUPABASE_PROJECT_2_REF=your-project-ref-2
SUPABASE_PROJECT_2_ANON_KEY=your-anon-key-2
```

You can add as many projects as needed by continuing the indexed pattern:

```bash
SUPABASE_PROJECT_15_NAME=Project 15
SUPABASE_PROJECT_15_REF=your-project-ref-15
SUPABASE_PROJECT_15_ANON_KEY=your-anon-key-15
```

This repository's `.env.example` includes BuilderBite's project names and refs
as a ready structure, but it intentionally uses placeholder anon keys so the
public GitHub repo does not publish live credentials. Keep real values only in
private env files such as `.env.local` on the server.

The app also supports a single JSON variable:

```bash
SUPABASE_PROJECTS_JSON=[{"name":"Main workload","projectRef":"your-project-ref-1","anonKey":"your-anon-key-1"}]
```

## API Endpoints

Run keep-alive checks:

```text
GET /api/keep-alive?secret=YOUR_CRON_SECRET
```

Read current configured projects and last run:

```text
GET /api/status?secret=YOUR_CRON_SECRET
```

The keep-alive response returns JSON similar to:

```json
{
  "checkedAt": "2026-07-04T00:00:00.000Z",
  "total": 2,
  "ok": 2,
  "failed": 0,
  "durationMs": 842,
  "results": []
}
```

## Scheduling

You can trigger the keep-alive URL from any scheduler that can make a daily HTTP
request.

### Option 1: Linux Cron On Your VPS

Open crontab:

```bash
crontab -e
```

Add a daily job:

```bash
17 4 * * * curl -fsS "https://alive.builderbite.com/api/keep-alive?secret=YOUR_CRON_SECRET" >/dev/null
```

Test it manually:

```bash
curl -fsS "https://alive.builderbite.com/api/keep-alive?secret=YOUR_CRON_SECRET"
```

### Option 2: cron-job.org Or Any Hosted Scheduler

Use this when you want a third-party service to call the URL for you.

Recommended setup:

- URL: `https://alive.builderbite.com/api/keep-alive?secret=YOUR_CRON_SECRET`
- Method: `GET`
- Schedule: once per day
- Expected success: HTTP `200`

If your scheduler supports custom headers, you may keep the secret out of the
URL and send either header instead:

```text
x-cron-secret: YOUR_CRON_SECRET
```

or:

```text
Authorization: Bearer YOUR_CRON_SECRET
```

For simple URL-only schedulers, the `?secret=` query parameter is supported.

## VPS Deployment

The included deployment setup is prepared for:

```text
Domain: alive.builderbite.com
Internal app port: 1209
Suggested app path: /var/www/alive-supabase
```

Deployment files:

- `deployment/ecosystem.config.cjs`
- `deployment/nginx-alive.builderbite.com.conf`
- `deployment/README.md`

Full VPS instructions are available in:

```text
deployment/README.md
```

## Security Notes

- Never commit `.env.local`
- Use a long random `CRON_SECRET`
- Rotate `CRON_SECRET` if it is exposed in scheduler logs or browser history
- Use Supabase anon keys only; service role keys are not needed
- Prefer header-based secrets when your scheduler supports custom headers
- Keep the dashboard unindexed; this project sets `robots: noindex`

## BuilderBite

Built by **BuilderBite** as a small infrastructure utility for keeping many
client and internal Supabase workloads easy to monitor and schedule.

Website:

```text
https://builderbite.com
```
