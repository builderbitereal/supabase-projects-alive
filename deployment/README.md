# VPS Deployment Guide

This guide deploys:

```text
https://github.com/builderbitereal/supabase-projects-alive
```

Use your own domain. This guide uses this placeholder:

```text
alive.your-domain.com
```

Replace it everywhere with your real domain, for example:

```text
supabase-alive.example.com
```

## Deployment Defaults

```text
Domain: alive.your-domain.com
Internal app port: 1209
App path: /var/www/supabase-projects-alive
PM2 app name: supabase-projects-alive
Nginx config: /etc/nginx/sites-available/alive.your-domain.com
```

Local development uses port `3000`. The VPS app process uses internal port
`1209` behind Nginx.

## 1. Point DNS To Your VPS

In your DNS provider, create an `A` record:

```text
Type: A
Name: alive
Value: YOUR_VPS_IP_ADDRESS
TTL: Auto
```

If you use a root domain or another subdomain, adjust the Nginx commands below
to match your chosen domain.

Wait until DNS resolves:

```bash
dig alive.your-domain.com
```

## 2. Install Server Requirements

Recommended:

- Ubuntu 22.04 or 24.04
- Node.js 20 LTS or newer
- npm
- Git
- PM2
- Nginx
- Certbot

Update the server:

```bash
sudo apt update
sudo apt upgrade -y
```

Install base tools:

```bash
sudo apt install -y git curl nginx
```

Install Node.js 20:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Install PM2:

```bash
sudo npm install -g pm2
```

## 3. Clone The Repo

Create the app directory:

```bash
sudo mkdir -p /var/www/supabase-projects-alive
sudo chown -R "$USER":"$USER" /var/www/supabase-projects-alive
```

Clone:

```bash
git clone https://github.com/builderbitereal/supabase-projects-alive.git /var/www/supabase-projects-alive
cd /var/www/supabase-projects-alive
```

If you already have an old or broken copy and want a clean start:

```bash
pm2 delete supabase-projects-alive || true
pm2 save || true

sudo rm -rf /var/www/supabase-projects-alive
sudo mkdir -p /var/www/supabase-projects-alive
sudo chown -R "$USER":"$USER" /var/www/supabase-projects-alive

git clone https://github.com/builderbitereal/supabase-projects-alive.git /var/www/supabase-projects-alive
cd /var/www/supabase-projects-alive
```

## 4. Create The Production Env File

Copy the example:

```bash
cp .env.example .env.local
```

Generate a strong secret:

```bash
openssl rand -hex 32
```

Edit the env file:

```bash
nano .env.local
```

Set:

```bash
CRON_SECRET=replace-with-your-generated-secret

PING_TIMEOUT_MS=15000
PING_CONCURRENCY=5
MAX_INDEXED_PROJECTS=50
SUPABASE_PING_PATH=/auth/v1/health
```

Add your Supabase projects:

```bash
SUPABASE_PROJECT_1_NAME=Main App
SUPABASE_PROJECT_1_REF=your-project-ref-1
SUPABASE_PROJECT_1_ANON_KEY=your-anon-key-1

SUPABASE_PROJECT_2_NAME=Client App
SUPABASE_PROJECT_2_REF=your-project-ref-2
SUPABASE_PROJECT_2_ANON_KEY=your-anon-key-2
```

To get these values:

1. Open Supabase
2. Select your project
3. Go to `Project Settings`
4. Open `API`
5. Copy the project ref
6. Copy the `anon public` key

Do not use the service role key.

## 5. Install And Build

```bash
cd /var/www/supabase-projects-alive
npm ci
npm run build
```

Optional type check:

```bash
npm run lint
```

## 6. Start With PM2

The included PM2 config runs the app on internal port `1209`:

```text
deployment/ecosystem.config.cjs
```

Start:

```bash
pm2 start deployment/ecosystem.config.cjs
pm2 save
```

Enable startup after reboot:

```bash
pm2 startup
```

PM2 will print a `sudo env PATH=...` command. Copy and run that printed command,
then save again:

```bash
pm2 save
```

Check:

```bash
pm2 status
pm2 logs supabase-projects-alive
curl -I http://127.0.0.1:1209
```

## 7. Configure Nginx

Copy the sample config:

```bash
sudo cp /var/www/supabase-projects-alive/deployment/nginx-your-domain.conf /etc/nginx/sites-available/alive.your-domain.com
```

Edit it:

```bash
sudo nano /etc/nginx/sites-available/alive.your-domain.com
```

Replace:

```text
alive.your-domain.com
```

with your real domain.

Enable the site:

```bash
sudo ln -sf /etc/nginx/sites-available/alive.your-domain.com /etc/nginx/sites-enabled/alive.your-domain.com
```

Optional: disable the default site:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

Test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Test HTTP:

```bash
curl -I http://alive.your-domain.com
```

## 8. Enable HTTPS

Install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Issue the certificate:

```bash
sudo certbot --nginx -d alive.your-domain.com
```

Test auto-renewal:

```bash
sudo certbot renew --dry-run
```

Test HTTPS:

```bash
curl -I https://alive.your-domain.com
```

## 9. Test The Keep-Alive URL

Use the secret from `.env.local`:

```bash
SECRET=$(grep '^CRON_SECRET=' /var/www/supabase-projects-alive/.env.local | cut -d= -f2- | tr -d '\r\n')
curl -i -H "x-cron-secret: $SECRET" "https://alive.your-domain.com/api/keep-alive"
```

Expected:

- HTTP `200`
- JSON with `total`, `ok`, `failed`, and `results`

Also test status:

```bash
curl -fsS -H "x-cron-secret: $SECRET" "https://alive.your-domain.com/api/status"
```

## 10. Add A Daily Schedule

You can use VPS cron or an external scheduler.

### Option A: VPS Cron

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

### Option B: cron-job.org

Create a new job:

```text
https://cron-job.org/en/
```

URL-only setup:

```text
URL: https://alive.your-domain.com/api/keep-alive?secret=YOUR_CRON_SECRET
Method: GET
Schedule: once per day or twice per day
Expected status: 200
```

Header-based setup, if supported:

```text
URL: https://alive.your-domain.com/api/keep-alive
Header: x-cron-secret: YOUR_CRON_SECRET
Method: GET
Expected status: 200
```

### Option C: Any URL Scheduler

Any scheduler works if it can call an HTTPS URL:

```text
GET https://alive.your-domain.com/api/keep-alive?secret=YOUR_CRON_SECRET
```

Examples:

- cron-job.org
- EasyCron
- UptimeRobot
- Better Stack
- GitHub Actions scheduled workflow

## 11. Update The App Later

When new code is pushed:

```bash
cd /var/www/supabase-projects-alive
git pull origin main
npm ci
npm run build
pm2 restart supabase-projects-alive --update-env
pm2 save
```

Test after update:

```bash
SECRET=$(grep '^CRON_SECRET=' /var/www/supabase-projects-alive/.env.local | cut -d= -f2- | tr -d '\r\n')
curl -I https://alive.your-domain.com
curl -fsS -H "x-cron-secret: $SECRET" "https://alive.your-domain.com/api/status"
```

## 12. Useful Commands

PM2 status:

```bash
pm2 status
```

Logs:

```bash
pm2 logs supabase-projects-alive
```

Restart:

```bash
pm2 restart supabase-projects-alive --update-env
```

Stop:

```bash
pm2 stop supabase-projects-alive
```

Reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Check port:

```bash
sudo ss -ltnp | grep 1209
```

## 13. Troubleshooting

`502 Bad Gateway`

The app is probably not running on port `1209`.

```bash
pm2 status
pm2 logs supabase-projects-alive
curl -I http://127.0.0.1:1209
```

`401 Unauthorized`

The scheduler secret does not match `CRON_SECRET`.

```bash
grep '^CRON_SECRET=' /var/www/supabase-projects-alive/.env.local
pm2 restart supabase-projects-alive --update-env
```

`503 Service Unavailable`

`CRON_SECRET` is missing or empty in `.env.local`.

All Supabase projects fail

Check the project refs and anon keys. The default ping path is:

```text
/auth/v1/health
```

Test one project manually:

```bash
REF=your-project-ref
ANON_KEY=your-anon-key
curl -i -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" "https://$REF.supabase.co/auth/v1/health"
```

Nginx config error

Run:

```bash
sudo nginx -t
```

Fix the reported line, then reload Nginx.
