# Portfolio

Personal workspace for **Miguel Silva** — portfolio site plus independent product apps.

## Projects

| Project | Folder | Stack | Description |
|---------|--------|-------|-------------|
| **Portfolio Site** | [portfolio](./portfolio) | React, TypeScript, Tailwind | Main landing page showcasing work |
| **ApplyTrack — AI Job Tracker** | [job-tracker](./job-tracker) | React, Gemini AI, Supabase | Kanban job board with AI tools + cloud sync |
| **FitTrack — Workouts & weight** | [fit-tracker](./fit-tracker) | React, TypeScript, Tailwind, Supabase | Daily set checklist + weekly kg average |

## Structure

```
Portfolio/
├── portfolio/         ← Main portfolio website
├── job-tracker/       ← ApplyTrack (standalone product)
├── fit-tracker/       ← FitTrack (standalone product)
├── ARCHITECTURE.md    ← Monorepo layout & product boundaries
├── DEPLOY.md          ← Step-by-step deploy guide
└── README.md
```

## Quick start (local)

From the repo root (`C:\Dev\Portfolio`):

```bash
cd portfolio && npm install && npm run dev
cd job-tracker && npm install && npm run dev
cd fit-tracker && npm install && npm run dev
```

Copy `.env.example` → `.env` in each app that needs API keys.

## Deploy to the web

See **[DEPLOY.md](./DEPLOY.md)** for full instructions (Vercel + Supabase).

## Author

Miguel Silva — [GitHub](https://github.com/DevMiguelSilva)
