# VPS Deployment Guide

This guide deploys the public BuilderBite repository:

```text
https://github.com/builderbitereal/supabase-projects-alive
```

Production target:

```text
Domain: alive.builderbite.com
Internal app port: 1209
App path: /var/www/alive-supabase
PM2 app name: alive-supabase
```

The local development port is not `1209`. Port `1209` is reserved for the VPS
PM2 process behind Nginx.

## 1. Server Requirements

Recommended VPS stack:

- Ubuntu 22.04 or 24.04
- Node.js 20 LTS or newer
- npm
- Git
- PM2
- Nginx
- Certbot for HTTPS

Update the server:

```bash
sudo apt update
sudo apt upgrade -y
```

Install base packages:

```bash
sudo apt install -y git curl nginx
```

Install Node.js 20 LTS:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Install PM2 globally:

```bash
sudo npm install -g pm2
```

## 2. Clone The GitHub Repo

### Fresh reset if the directory already has old files

Use this when `/var/www/alive-supabase` already exists but is not a clean clone
of this GitHub repository.

This removes only this app directory and this app's PM2 process:

```bash
pm2 delete alive-supabase || true
pm2 save || true

sudo rm -rf /var/www/alive-supabase
sudo mkdir -p /var/www/alive-supabase
sudo chown -R "$USER":"$USER" /var/www/alive-supabase
```

Then continue with the clone command below.

Create the app directory:

```bash
sudo mkdir -p /var/www/alive-supabase
sudo chown -R "$USER":"$USER" /var/www/alive-supabase
```

Clone the repo into that directory:

```bash
git clone https://github.com/builderbitereal/supabase-projects-alive.git /var/www/alive-supabase
cd /var/www/alive-supabase
```

If the directory already exists from an older deployment:

```bash
cd /var/www/alive-supabase
git pull origin main
```

## 3. Create Production Env File

Create `.env.local` on the VPS:

```bash
cd /var/www/alive-supabase
cp .env.example .env.local
nano .env.local
```

Generate a strong cron secret:

```bash
openssl rand -hex 32
```

Set it in `.env.local`:

```bash
CRON_SECRET=replace-with-your-generated-secret
```

Then replace every placeholder anon key with the real Supabase anon key:

```bash
SUPABASE_PROJECT_1_NAME=Ajkertakarrate
SUPABASE_PROJECT_1_REF=mdovvjqnjseskgqbifcm
SUPABASE_PROJECT_1_ANON_KEY=real-anon-key-here
```

Important:

- Do not commit `.env.local`
- Do not put real anon keys in `.env.example`
- The public repo should only contain placeholders
- The VPS must have the real `.env.local`

## 4. Install And Build

Use `npm ci` for repeatable production installs:

```bash
cd /var/www/alive-supabase
npm ci
npm run build
```

Optional validation:

```bash
npm run lint
```

## 5. Start With PM2 On Port 1209

The PM2 config is already included:

```text
deployment/ecosystem.config.cjs
```

Start the app:

```bash
cd /var/www/alive-supabase
pm2 start deployment/ecosystem.config.cjs
pm2 save
```

Enable PM2 startup after reboot:

```bash
pm2 startup
```

PM2 will print a command that starts with `sudo env PATH=...`. Copy and run
that printed command, then save again:

```bash
pm2 save
```

Check status:

```bash
pm2 status
pm2 logs alive-supabase
```

Local VPS test:

```bash
curl -I http://127.0.0.1:1209
```

## 6. Configure Nginx

Copy the included Nginx config:

```bash
sudo cp /var/www/alive-supabase/deployment/nginx-alive.builderbite.com.conf /etc/nginx/sites-available/alive.builderbite.com
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/alive.builderbite.com /etc/nginx/sites-enabled/alive.builderbite.com
```

If another default Nginx site conflicts, remove the default symlink:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

Test and reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Public HTTP test:

```bash
curl -I http://alive.builderbite.com
```

## 7. Enable HTTPS

Install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Issue and install the SSL certificate:

```bash
sudo certbot --nginx -d alive.builderbite.com
```

Test renewal:

```bash
sudo certbot renew --dry-run
```

Public HTTPS test:

```bash
curl -I https://alive.builderbite.com
```

## 8. Test Keep-Alive Endpoint

Replace `YOUR_CRON_SECRET` with the value from `/var/www/alive-supabase/.env.local`:

```bash
curl -fsS "https://alive.builderbite.com/api/keep-alive?secret=YOUR_CRON_SECRET"
```

Expected result:

- HTTP `200`
- JSON response with `total`, `ok`, `failed`, and `results`

If you get `401`, the secret is wrong.

If you get `503`, `CRON_SECRET` is missing from `.env.local` or the app was not
restarted after env changes.

Restart after env edits:

```bash
pm2 restart alive-supabase
```

## 9. Schedule Daily Keep-Alive

You can use VPS cron or any hosted URL scheduler.

### Option A: VPS Cron

Open crontab:

```bash
crontab -e
```

Add one daily request:

```bash
17 4 * * * curl -fsS "https://alive.builderbite.com/api/keep-alive?secret=YOUR_CRON_SECRET" >/dev/null
```

### Option B: cron-job.org

Create a new cron job at:

```text
https://cron-job.org/en/
```

Recommended settings:

```text
Title: Alive Supabase
URL: https://alive.builderbite.com/api/keep-alive?secret=YOUR_CRON_SECRET
Method: GET
Schedule: once per day
Expected status: 200
```

If the scheduler supports request headers, prefer keeping the secret out of the
URL. Use either:

```text
x-cron-secret: YOUR_CRON_SECRET
```

or:

```text
Authorization: Bearer YOUR_CRON_SECRET
```

Then call:

```text
https://alive.builderbite.com/api/keep-alive
```

### Option C: Any URL Scheduler

Any service can be used if it supports daily HTTP requests. Examples:

- cron-job.org
- EasyCron
- UptimeRobot heartbeat style checks
- Better Stack scheduled checks
- GitHub Actions scheduled workflow

Minimum requirement:

```text
GET https://alive.builderbite.com/api/keep-alive?secret=YOUR_CRON_SECRET
```

## 10. Update Deployment Later

When new code is pushed to GitHub:

```bash
cd /var/www/alive-supabase
git pull origin main
npm ci
npm run build
pm2 restart alive-supabase
pm2 save
```

Check after update:

```bash
pm2 status
curl -I https://alive.builderbite.com
curl -fsS "https://alive.builderbite.com/api/status?secret=YOUR_CRON_SECRET"
```

## 11. Useful Commands

View logs:

```bash
pm2 logs alive-supabase
```

Restart app:

```bash
pm2 restart alive-supabase
```

Stop app:

```bash
pm2 stop alive-supabase
```

Reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Check port `1209`:

```bash
sudo ss -ltnp | grep 1209
```

## 12. Troubleshooting

`502 Bad Gateway`

Check that PM2 is running:

```bash
pm2 status
pm2 logs alive-supabase
```

`401 Unauthorized`

The cron URL secret does not match `CRON_SECRET` in `.env.local`, or PM2 is
still running the previous environment.

Run this on the VPS:

```bash
cd /var/www/alive-supabase

grep '^CRON_SECRET=' .env.local

pm2 restart alive-supabase --update-env
pm2 save

SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d= -f2- | tr -d '\r\n')
curl -fsS -H "x-cron-secret: $SECRET" "https://alive.builderbite.com/api/keep-alive"
```

If that works, update the cron-job.org URL or header to use the same secret.

`503 Service Unavailable`

`CRON_SECRET` is missing or empty. Edit `.env.local`, then restart:

```bash
pm2 restart alive-supabase
```

Supabase project returns failed status

After the current health-check update, the default ping path is:

```text
/auth/v1/health
```

If every project returns `401`, the server is probably still running older code
that pinged `/rest/v1/`. Redeploy and restart PM2:

```bash
cd /var/www/alive-supabase
git pull origin main
npm ci
npm run build
pm2 restart alive-supabase --update-env
```

If only one project fails, check that the project ref is correct and that the
project is reachable at:

```text
https://<project-ref>.supabase.co/auth/v1/health
```

Nginx config fails

Run:

```bash
sudo nginx -t
```

Fix the reported line before reloading Nginx.
