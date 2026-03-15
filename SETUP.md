# DealClaw Setup & Deployment Guide

## 1. Push Updates to GitHub

```bash
cd dealclaw
git add -A
git commit -m "v0.2: Full MVP with DB logic, Python SDK, tests, Docker setup"
git push origin main
```

## 2. Deploy Landing Page (GitHub Pages)

> **Note:** The frontend is now hosted on **GitHub Pages** (auto-deploy from `main` branch), not Cloudflare Pages.

1. Go to your repo **Settings** → **Pages**
2. Source: **Deploy from a branch** → `main` / `/ (root)`
3. Save → your landing page is live at `boris-from-berlin.github.io/dealclaw`

### Add Custom Domain (dealclaw.org)

1. In repo **Settings** → **Pages** → **Custom domain**, add `dealclaw.org`
2. Update your domain's DNS:
   - Add a CNAME record: `dealclaw.org` → `boris-from-berlin.github.io`
   - GitHub will auto-provision an SSL certificate

### Set up trade-claw.com Redirect

1. Configure a DNS redirect at your registrar or use a simple redirect service
2. Redirect `trade-claw.com/*` → `https://dealclaw.org/$1` (301 redirect)

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

# API: http://localhost:4000
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
(GitHub Pages)       (Railway.app)      (Railway Managed)
                          ↑
                    [Python SDK]
                   pip install dealclaw
```
