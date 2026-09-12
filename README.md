# Portafolio

Personal portfolio workspace for **Miguel Silva** — software developer career in Canada.

## Projects

| Project | Folder | Stack | Description |
|---------|--------|-------|-------------|
| **Portfolio Site** | [portfolio](./portfolio) | React, TypeScript, Tailwind | Main landing page showcasing work |
| **ApplyTrack — AI Job Tracker** | [job-tracker](./job-tracker) | React, Gemini AI, Supabase | Kanban job board with AI tools + cloud sync |

## Structure

```
Portafolio/
├── portfolio/         ← Main portfolio website
├── job-tracker/       ← AI job tracker with Supabase
├── DEPLOY.md          ← Step-by-step deploy guide
└── README.md
```

## Quick start (local)

Each app runs independently:

```bash
cd portfolio && npm install && npm run dev
cd job-tracker && npm install && npm run dev
```

Copy `.env.example` → `.env` in each app that needs API keys.

## Deploy to the web

See **[DEPLOY.md](./DEPLOY.md)** for full instructions (Vercel + Supabase).

## Author

Miguel Silva — [GitHub](https://github.com/DevMiguelSilva)
