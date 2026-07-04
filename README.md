# Supabase Projects Alive

Keep multiple Supabase projects active with one small Next.js app and one
scheduled URL.

This open-source utility from **BuilderBite** is useful when you manage several
Supabase projects and want a simple daily health ping so inactive projects do
not sit untouched for long periods.

Deploy it to your own domain, for example:

```text
https://alive.your-domain.com
```

Then schedule:

```text
https://alive.your-domain.com/api/keep-alive?secret=YOUR_CRON_SECRET
```

## What This App Does

- Stores all Supabase project configuration in server-only env variables
- Calls each configured Supabase project health endpoint
- Supports many projects with simple indexed env variables
- Protects the trigger endpoint with `CRON_SECRET`
- Shows a clean dashboard with totals and hidden project details
- Works with VPS cron, cron-job.org, EasyCron, uptime monitors, and similar tools
- Includes PM2 and Nginx deployment files

## How The Keep-Alive Works

For each configured project, the app calls:

```text
https://<project-ref>.supabase.co/auth/v1/health
```

The app sends the project's Supabase anon key in the request headers. A Supabase
service role key is not required.

The dashboard intentionally hides project names, refs, keys, and per-project
errors for security.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Poppins font through `next/font`
- PM2 for VPS process management
- Nginx as reverse proxy

## Quick Start

Clone the repo:

```bash
git clone https://github.com/builderbitereal/supabase-projects-alive.git
cd supabase-projects-alive
```

Install dependencies:

```bash
npm install
```

Create your env file:

```bash
cp .env.example .env.local
```

Generate a secret:

```bash
openssl rand -hex 32
```

Edit `.env.local`:

```bash
CRON_SECRET=replace-with-your-generated-secret

SUPABASE_PROJECT_1_NAME=Main App
SUPABASE_PROJECT_1_REF=your-project-ref
SUPABASE_PROJECT_1_ANON_KEY=your-anon-key
```

Run locally:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Get Supabase Values

For each Supabase project:

1. Open your Supabase dashboard
2. Select the project
3. Go to `Project Settings`
4. Open `API`
5. Copy the project ref from the project URL or API settings
6. Copy the `anon public` key

Your project URL looks like:

```text
https://your-project-ref.supabase.co
```

The value before `.supabase.co` is the project ref.

## Environment Variables

Use indexed variables for multiple projects:

```bash
CRON_SECRET=replace-with-a-long-random-secret

PING_TIMEOUT_MS=15000
PING_CONCURRENCY=5
MAX_INDEXED_PROJECTS=50
SUPABASE_PING_PATH=/auth/v1/health

SUPABASE_PROJECT_1_NAME=Main App
SUPABASE_PROJECT_1_REF=your-project-ref-1
SUPABASE_PROJECT_1_ANON_KEY=your-anon-key-1

SUPABASE_PROJECT_2_NAME=Client App
SUPABASE_PROJECT_2_REF=your-project-ref-2
SUPABASE_PROJECT_2_ANON_KEY=your-anon-key-2
```

Continue the same pattern for more projects:

```bash
SUPABASE_PROJECT_15_NAME=Project 15
SUPABASE_PROJECT_15_REF=your-project-ref-15
SUPABASE_PROJECT_15_ANON_KEY=your-anon-key-15
```

You can also use one JSON variable:

```bash
SUPABASE_PROJECTS_JSON=[{"name":"Main App","projectRef":"your-project-ref-1","anonKey":"your-anon-key-1"}]
```

Never commit `.env.local`.

## API Endpoints

Run the keep-alive check:

```text
GET /api/keep-alive?secret=YOUR_CRON_SECRET
```

Read current status:

```text
GET /api/status?secret=YOUR_CRON_SECRET
```

Header-based auth is supported:

```text
x-cron-secret: YOUR_CRON_SECRET
```

or:

```text
Authorization: Bearer YOUR_CRON_SECRET
```

Example response:

```json
{
  "checkedAt": "2026-07-04T00:00:00.000Z",
  "total": 3,
  "ok": 3,
  "failed": 0,
  "durationMs": 842,
  "results": []
}
```

## Deploy To A VPS

Full instructions are in:

```text
deployment/README.md
```

Default production assumptions:

```text
Domain: alive.your-domain.com
Internal app port: 1209
App path: /var/www/supabase-projects-alive
PM2 app name: supabase-projects-alive
```

Important files:

- `deployment/ecosystem.config.cjs`
- `deployment/nginx-your-domain.conf`
- `deployment/README.md`

Replace every `alive.your-domain.com` value with your real domain.

## Schedule It

You can run the URL once or twice per day. Daily is usually enough.

### Linux Cron

Open cron:

```bash
crontab -e
```

Run once per day at 6:00 AM:

```cron
0 6 * * * SECRET=$(grep '^CRON_SECRET=' /var/www/supabase-projects-alive/.env.local | cut -d= -f2- | tr -d '\r\n') && curl -fsS -H "x-cron-secret: $SECRET" "https://alive.your-domain.com/api/keep-alive" >/dev/null 2>&1
```

Run twice per day at 6:00 AM and 6:00 PM:

```cron
0 6,18 * * * SECRET=$(grep '^CRON_SECRET=' /var/www/supabase-projects-alive/.env.local | cut -d= -f2- | tr -d '\r\n') && curl -fsS -H "x-cron-secret: $SECRET" "https://alive.your-domain.com/api/keep-alive" >/dev/null 2>&1
```

### cron-job.org

Create a new job at:

```text
https://cron-job.org/en/
```

Use:

```text
URL: https://alive.your-domain.com/api/keep-alive?secret=YOUR_CRON_SECRET
Method: GET
Schedule: once per day or twice per day
Expected status: 200
```

If your scheduler supports headers, use this cleaner URL:

```text
https://alive.your-domain.com/api/keep-alive
```

and add:

```text
x-cron-secret: YOUR_CRON_SECRET
```

## Update Later

On your VPS:

```bash
cd /var/www/supabase-projects-alive
git pull origin main
npm ci
npm run build
pm2 restart supabase-projects-alive --update-env
pm2 save
```

## Troubleshooting

`401 Unauthorized`

Your `CRON_SECRET` does not match. Check `.env.local`, then restart PM2 with:

```bash
pm2 restart supabase-projects-alive --update-env
```

`503 Service Unavailable`

`CRON_SECRET` is missing from `.env.local`.

All projects fail

Check that every project ref and anon key match the same Supabase project.

Nginx shows `502 Bad Gateway`

Check PM2:

```bash
pm2 status
pm2 logs supabase-projects-alive
```

## Security Notes

- Never commit `.env.local`
- Do not use service role keys
- Use a long random `CRON_SECRET`
- Prefer header-based scheduler auth when possible
- Rotate `CRON_SECRET` if it is exposed in logs, screenshots, or browser history
- Keep the app behind HTTPS in production

## BuilderBite

Built by **BuilderBite** for teams and developers managing many Supabase
projects.

Star the repo if it saves you time.
