# Deploy Guide — Miguel Silva Portfolio

Deploy each app for free using **Vercel** + **Supabase**.

## Overview

| App | Folder | Platform | Database |
|-----|--------|----------|----------|
| Portfolio | `portfolio/` | Vercel | — |
| ApplyTrack | `job-tracker/` | Vercel | Supabase |
| FitTrack | `fit-tracker/` | Vercel | Supabase (separate project) |

---

## Step 1 — Push to GitHub

```bash
cd C:\Dev\Portfolio
git add .
git commit -m "Your commit message"
git push origin main
```

---

## Step 2 — Set up Supabase

Use **separate** Supabase projects for ApplyTrack and FitTrack.

### ApplyTrack

1. Create a free account at [supabase.com](https://supabase.com)
2. **New project** → pick a name, password, region (closest to Canada)
3. **SQL Editor** → paste `job-tracker/supabase/schema.sql` → **Run**
4. **Project Settings → API** — copy **Project URL** (`VITE_SUPABASE_URL`) and **anon** / **publishable** key (`VITE_SUPABASE_ANON_KEY`)
5. **Authentication → Providers** → **Email** enabled

### FitTrack

Same steps in a **second** Supabase project, using `fit-tracker/supabase/schema.sql`.

---

## Step 3 — Deploy on Vercel

Go to [vercel.com](https://vercel.com) → **Add New Project** → import `DevMiguelSilva/Portafolio` (or `Portfolio` if you renamed the remote)

Deploy **each app as a separate Vercel project**:

### Portfolio (`portfolio/`)

| Setting | Value |
|---------|-------|
| Root Directory | `portfolio` |
| Framework | Vite |

**Environment variables:**

```
VITE_JOB_TRACKER_URL=https://your-job-tracker.vercel.app
VITE_FIT_TRACKER_URL=https://your-fit-tracker.vercel.app
VITE_GITHUB_URL=https://github.com/DevMiguelSilva
VITE_LINKEDIN_URL=https://www.linkedin.com/in/miguel-silva-dev/
```

### ApplyTrack (`job-tracker/`)

| Setting | Value |
|---------|-------|
| Root Directory | `job-tracker` |

**Environment variables:**

```
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-3.5-flash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Re-run `job-tracker/supabase/schema.sql` after pulling schema updates.

### FitTrack (`fit-tracker/`)

| Setting | Value |
|---------|-------|
| Root Directory | `fit-tracker` |

**Environment variables:**

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_or_publishable_key
```

Re-run `fit-tracker/supabase/schema.sql` after pulling schema updates (includes `actual_loads` and `finished` on `sessions`).

---

## Step 4 — Link portfolio to live demos

After deploying the product apps, set the **portfolio** project env vars:

```
VITE_JOB_TRACKER_URL=https://job-tracker-xxx.vercel.app
VITE_FIT_TRACKER_URL=https://fit-tracker-xxx.vercel.app
```

Redeploy the portfolio (Vercel auto-redeploys on env change).

---

## Step 5 — Test everything

- [ ] Portfolio loads with ApplyTrack and FitTrack
- [ ] ApplyTrack: sign up → sign in → add job → AI parse works
- [ ] FitTrack: add a routine → start today → log kg → Progress shows the week
- [ ] Data persists after refresh when signed in (Synced badge)

---

## Custom domains (optional)

In each Vercel project: **Settings → Domains** → add your domain.

---

## Costs

Everything above is **free** on personal/hobby tiers:
- Vercel: free for personal projects
- Supabase: 500MB database, 50k monthly active users free
- Gemini API: free tier
