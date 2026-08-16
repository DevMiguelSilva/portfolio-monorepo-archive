# Deploy Guide — Miguel Silva Portfolio

Deploy all three apps for free using **Vercel** + **Supabase**.

## Overview

| App | Folder | Platform | Database |
|-----|--------|----------|----------|
| Portfolio | `portfolio/` | Vercel | — |
| Movie Discovery | `movie-discovery/` | Vercel | — (TMDB API) |
| ApplyTrack | `job-tracker/` | Vercel | Supabase |

---

## Step 1 — Push to GitHub

```bash
cd c:\Users\migue\Desktop\Prueba\Portafolio
git add .
git commit -m "Add portfolio site, Supabase job tracker, and deployment configs"
git push origin main
```

---

## Step 2 — Set up Supabase (job tracker database)

1. Create a free account at [supabase.com](https://supabase.com)
2. **New project** → pick a name, password, region (closest to Canada)
3. Go to **SQL Editor** → paste contents of `job-tracker/supabase/schema.sql` → **Run**
4. Go to **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
5. Go to **Authentication → Providers** → enable **Email** (enabled by default)

---

## Step 3 — Deploy on Vercel

Go to [vercel.com](https://vercel.com) → **Add New Project** → import `DevMiguelSilva/Portafolio`

Deploy **each app as a separate Vercel project** (recommended):

### Portfolio (`portfolio/`)

| Setting | Value |
|---------|-------|
| Root Directory | `portfolio` |
| Framework | Vite |

**Environment variables:**

```
VITE_MOVIE_APP_URL=https://your-movie-app.vercel.app
VITE_JOB_TRACKER_URL=https://your-job-tracker.vercel.app
VITE_GITHUB_URL=https://github.com/DevMiguelSilva
```

### Movie Discovery (`movie-discovery/`)

| Setting | Value |
|---------|-------|
| Root Directory | `movie-discovery` |

**Environment variables:**

```
VITE_TMDB_API_KEY=your_tmdb_key
```

### ApplyTrack (`job-tracker/`)

| Setting | Value |
|---------|-------|
| Root Directory | `job-tracker` |

**Environment variables:**

```
VITE_GEMINI_API_KEY=your_gemini_key
VITE_GEMINI_MODEL=gemini-3.5-flash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## Step 4 — Link portfolio to live demos

After deploying movie-discovery and job-tracker, copy their Vercel URLs and update the **portfolio** project's env vars:

```
VITE_MOVIE_APP_URL=https://movie-discovery-xxx.vercel.app
VITE_JOB_TRACKER_URL=https://job-tracker-xxx.vercel.app
```

Redeploy the portfolio (Vercel auto-redeploys on env change).

---

## Step 5 — Test everything

- [ ] Portfolio loads with both project cards
- [ ] Movie app: search works, details page loads
- [ ] Job tracker: sign up → sign in → add job → AI parse works
- [ ] Job tracker: data persists after refresh (Supabase sync ☁️ in header)

---

## Custom domains (optional)

In each Vercel project: **Settings → Domains** → add your domain.

---

## Costs

Everything above is **free** on personal/hobby tiers:
- Vercel: free for personal projects
- Supabase: 500MB database, 50k monthly active users free
- TMDB API: free
- Gemini API: free tier
