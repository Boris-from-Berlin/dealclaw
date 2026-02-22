# DealClaw Setup & Deployment Guide

## 1. Push Updates to GitHub

```bash
cd tradeclaw
git add -A
git commit -m "v0.2: Full MVP with DB logic, Python SDK, tests, Docker setup"
git push origin main
```

## 2. Deploy Landing Page (Cloudflare Pages)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Pages** → **Create a project**
2. Connect your GitHub repo: `Boris-from-Berlin/dealclaw`
3. Settings:
   - **Build command**: (leave empty — it's a static HTML page)
   - **Build output directory**: `/` (root)
4. Deploy → your landing page is live at `dealclaw.pages.dev`

### Add Custom Domain (dealclaw.org)

1. In Cloudflare Pages → your project → **Custom domains**
2. Add `dealclaw.org`
3. Update your domain's DNS:
   - At your registrar, change nameservers to Cloudflare, OR
   - Add a CNAME record: `dealclaw.org` → `dealclaw.pages.dev`

### Set up trade-claw.com Redirect

1. Add `trade-claw.com` to Cloudflare (free plan)
2. Add a Page Rule or Redirect Rule:
   - `trade-claw.com/*` → `https://dealclaw.org/$1` (301 redirect)
   - OR use the `_redirects` file (auto-handled by Cloudflare Pages)

## 3. Deploy API (Railway.app)

1. Go to [railway.app](https://railway.app) → New Project
2. **Add PostgreSQL** service (one click)
3. **Deploy from GitHub**: `Boris-from-Berlin/dealclaw`
   - Root directory: `mvp`
   - Start command: `npm start`
4. Add environment variables from `.env.example`
   - `DATABASE_URL` is auto-set by Railway for the PostgreSQL service
   - Set `JWT_SECRET` to a strong random string
   - Set `NODE_ENV=production`
5. Run migrations:
   ```bash
   railway run npm run db:setup
   ```

### Custom API Domain

Add `api.dealclaw.org` as custom domain in Railway, then add a CNAME record:
- `api.dealclaw.org` → `your-app.up.railway.app`

## 4. Local Development (Docker)

```bash
# Start everything
docker-compose up -d

# API: http://localhost:3000
# DB: localhost:5432 (dealclaw/password)
# Redis: localhost:6379

# Run migrations and seed
cd mvp && npm run db:setup

# Run tests
npm test

# Stop
docker-compose down
```

## 5. Local Development (Manual)

```bash
# Install PostgreSQL and create database
createdb dealclaw

# Setup
cd mvp
cp .env.example .env    # Edit with your DB credentials
npm install
npm run db:setup        # Migrate + seed

# Start dev server (auto-reload)
npm run dev
```

## Architecture

```
[Landing Page]          [API Server]           [Database]
dealclaw.org  ←→  api.dealclaw.org  ←→  PostgreSQL + Redis
(Cloudflare Pages)    (Railway.app)      (Railway Managed)
                          ↑
                    [Python SDK]
                   pip install dealclaw
```
