# ApplyTrack v2 — Find · Tailor · Track

Human-in-the-loop job search for Canada front-end roles: refresh an Adzuna-powered inbox, approve fits into a Kanban tracker, tailor a DOCX from your master CV, and keep JD + notes ready for interview calls.

## Features

- **Job Inbox** — saved searches → Adzuna CA refresh → match % → approve / dismiss
- **Kanban board** — Saved → Applied → Interview → Offer → Rejected
- **Master CV** — structured template (skills, experience, projects, education)
- **ATS tailor** — gap report + AI rewrite from master CV (no invented experience)
- **DOCX / Print PDF** — download `Company_Role.docx` per application
- **Interview prep** — JD, skills, tailored snapshot, notes on every job
- **Paste fallback** — Indeed / ZipRecruiter postings via Add Job + AI parse
- **Server-side AI & Adzuna** — keys stay off the browser (`/api/*`)

## Tech stack

| Tool | Purpose |
|------|---------|
| React 18 + Vite | Frontend |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Vercel Serverless | `/api/adzuna`, `/api/gemini` |
| Adzuna API | Canada job discovery |
| Google Gemini | Parse, tailor, cover letters |
| Supabase (optional) | Auth + sync; localStorage without it |

## Getting started

### 1. API keys

1. [Adzuna developer](https://developer.adzuna.com/) → App ID + App Key
2. [Google AI Studio](https://aistudio.google.com/apikey) → Gemini key

### 2. Configure environment

```bash
cp .env.example .env
```

```
ADZUNA_APP_ID=...
ADZUNA_APP_KEY=...
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash

# Optional cloud sync
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

If using Supabase, run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.

### 3. Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Local `/api/*` is handled by the Vite plugin (reads `.env`).

## Daily workflow

1. **Inbox** → Refresh → approve roles that fit (or dismiss)
2. **Job detail** → Gap check / Tailor from master CV → Download DOCX
3. Apply on Indeed / ZipRecruiter with that file
4. Move card to **Applied** / **Interview** — open Interview prep when someone calls

## Deploy (Vercel)

1. Root Directory: `job-tracker`
2. Env vars: `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, plus Supabase if used
3. Deploy (API routes under `api/` + Vite `dist`)

## Project structure

```
api/                 # Vercel serverless + shared handlers
src/
  api/               # Browser clients for /api/*
  hooks/             # Jobs, inbox, master CV, tailored docs
  lib/               # matchScore, docxExport, database mappers
  pages/             # Board, Inbox, Master CV, Detail, …
supabase/schema.sql  # v2 tables + RLS
```

## License

MIT — portfolio/educational use.
