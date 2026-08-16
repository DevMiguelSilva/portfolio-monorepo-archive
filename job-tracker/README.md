# ApplyTrack — AI Job Application Tracker

Track your job search, manage applications on a Kanban board, and use AI to parse postings, draft cover letters, and generate tailored resume bullets. Built as portfolio project #2 for a software developer career in Canada.

![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![AI](https://img.shields.io/badge/AI-Gemini-8E75B2)

## Features

- **Kanban board** — drag jobs across Saved → Applied → Interview → Offer → Rejected
- **AI job parser** — paste a posting, AI extracts company, role, skills & requirements
- **AI cover letter** — tailored draft based on your profile + the job
- **AI resume bullets** — action-verb bullets matched to the posting
- **Profile page** — your skills & experience (AI stays honest, no invented history)
- **Stats dashboard** — count applications by stage
- **Dark / light theme**

## Tech stack

| Tool | Purpose |
|------|---------|
| React 18 + Vite | Frontend |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| React Router | Routing |
| Google Gemini API | AI features (free tier) |
| localStorage | Job & profile persistence |

## Getting started

### 1. Get a free Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with Google
3. Click **Create API key** — it's free

### 2. Configure environment

```bash
cp .env.example .env
```

Add your key to `.env`:

```
VITE_GEMINI_API_KEY=your_actual_key_here
```

### 3. Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

> **Note:** If movie-discovery is also running, this app may use port 5174.

## How to use

1. **Profile** — fill in your name, skills, and experience (used by AI)
2. **Add Job** — paste a job posting → click "Parse with AI" → save
3. **Board** — drag cards between columns as your application progresses
4. **Job detail** — use AI to generate a cover letter or resume bullets

## What this demonstrates (AI + software development)

- Integrating an LLM API with proper env vars and error handling
- Prompt engineering for structured JSON output (job parsing)
- AI as a **feature**, not a gimmick — clear inputs, outputs, and guardrails
- Honest AI usage — prompts instruct the model not to invent experience
- Full React app patterns: context, routing, forms, drag-and-drop

## Deploy (Vercel)

1. Push to GitHub
2. Import on [vercel.com](https://vercel.com)
3. Set **Root Directory** to `job-tracker`
4. Add env var: `VITE_GEMINI_API_KEY`
5. Deploy

## Project structure

```
src/
├── api/gemini.ts       # AI API calls & prompts
├── hooks/              # Jobs, profile, theme
├── components/         # Kanban, AI panel, cards
├── pages/              # Board, Add, Detail, Profile
└── types/job.ts        # TypeScript interfaces
```

## License

MIT — portfolio/educational use.
