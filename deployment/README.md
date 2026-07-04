# Alive Supabase VPS Deployment

Domain: `alive.builderbite.com`  
App port: `1209`  
Suggested app path: `/var/www/alive-supabase`

## 1. Copy the project to the VPS

```bash
sudo mkdir -p /var/www/alive-supabase
sudo chown -R "$USER":"$USER" /var/www/alive-supabase
rsync -av --exclude node_modules --exclude .next --exclude .data ./ /var/www/alive-supabase/
cd /var/www/alive-supabase
```

## 2. Create `.env.local`

```bash
cp .env.example .env.local
nano .env.local
```

Add each Supabase project:

```bash
CRON_SECRET=replace-with-a-long-random-secret

SUPABASE_PROJECT_1_NAME=Client A
SUPABASE_PROJECT_1_REF=abcdefghijklmnoabcde
SUPABASE_PROJECT_1_ANON_KEY=ey...

SUPABASE_PROJECT_2_NAME=Client B
SUPABASE_PROJECT_2_REF=pqrstuvwxyzabcdxyzpq
SUPABASE_PROJECT_2_ANON_KEY=ey...
```

## 3. Install and build

```bash
npm install
npm run build
```

## 4. Start with PM2

```bash
sudo npm install -g pm2
pm2 start deployment/ecosystem.config.cjs
pm2 save
pm2 startup
```

Run the command printed by `pm2 startup`, then:

```bash
pm2 save
```

## 5. Configure Nginx

```bash
sudo cp deployment/nginx-alive.builderbite.com.conf /etc/nginx/sites-available/alive.builderbite.com
sudo ln -s /etc/nginx/sites-available/alive.builderbite.com /etc/nginx/sites-enabled/alive.builderbite.com
sudo nginx -t
sudo systemctl reload nginx
```

Optional HTTPS with Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d alive.builderbite.com
```

## 6. Add daily cron

```bash
crontab -e
```

Add this line, replacing the secret:

```bash
17 4 * * * curl -fsS "https://alive.builderbite.com/api/keep-alive?secret=YOUR_CRON_SECRET" >/dev/null
```

Quick test:

```bash
curl -fsS "https://alive.builderbite.com/api/keep-alive?secret=YOUR_CRON_SECRET"
```

## 7. Hosted scheduler option

Instead of VPS cron, any hosted scheduler that can make an HTTP request can call
the same URL daily.

For cron-job.org or a similar service:

```text
URL: https://alive.builderbite.com/api/keep-alive?secret=YOUR_CRON_SECRET
Method: GET
Schedule: once per day
Expected success: HTTP 200
```

If the scheduler supports custom headers, you can keep the secret out of the URL:

```text
x-cron-secret: YOUR_CRON_SECRET
```

or:

```text
Authorization: Bearer YOUR_CRON_SECRET
```
