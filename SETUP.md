# DealClaw — Repo Setup (2 Minuten)

## 1. GitHub Repo erstellen

Geh auf https://github.com/new und erstelle:
- **Name:** `dealclaw`
- **Visibility:** Private
- **KEIN** README, .gitignore oder License hinzufuegen (haben wir schon)

## 2. Repo initialisieren und pushen

Oeffne ein Terminal in deinem `tradeclaw`-Ordner und fuehre aus:

```bash
# Git initialisieren
git init
git branch -M main

# Alte TradeClaw-Dateien loeschen (optional)
rm -f TradeClaw_PRD_v1.docx TradeClaw_Pitch_Deck.pptx

# Alles stagen
git add .

# Erster Commit
git commit -m "Initial commit: DealClaw MVP, Landing Page, API Spec, Docs

- Landing page with waitlist (index.html)
- OpenAPI 3.1 specification (openapi.yaml)
- Express.js MVP with routes, services, DB schema
- PRD and Pitch Deck in docs/
- Framework-agnostic architecture for AI agent commerce"

# Remote hinzufuegen (ersetze USERNAME mit deinem GitHub-Username)
git remote add origin git@github.com:USERNAME/dealclaw.git

# Pushen
git push -u origin main
```

## 3. Landing Page deployen (Cloudflare Pages)

1. Geh auf https://dash.cloudflare.com → Pages → Create a project
2. Verbinde dein GitHub-Repo `dealclaw`
3. Build settings:
   - **Build command:** (leer lassen)
   - **Build output directory:** `/` (Root)
4. Deploy!
5. Unter Custom Domains: `dealclaw.org` hinzufuegen
6. Redirect `trade-claw.com` → `dealclaw.org` (Cloudflare Rules)

## 4. Fertig!

Deine Landing Page ist live auf dealclaw.org.
Der MVP-Code ist bereit fuer das naechste Deployment (Railway/Fly.io).
