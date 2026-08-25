# FitTrack — Workouts & weekly weight

Plan a few easy routines, pick which one you are doing today, check off sets, and log body weight in **kg**. Lift loads are stored in **lb**. Weekly reports use the average kg for the week (Monday–Sunday), not a single noisy day.

Empty on first launch — you add your own routines. Cloud login is optional (Supabase). Without env keys, everything stays in `localStorage` (`fittrack-v1`).

## Units

| What | Unit |
|------|------|
| Body weight | kilograms (kg) |
| Exercise load | pounds (lb) |

## Run

```bash
cd fit-tracker
npm install
npm run dev
```

[http://localhost:5175](http://localhost:5175)

Copy `.env.example` → `.env` and add Supabase keys when you want cloud sync. Run `supabase/schema.sql` in that project’s SQL editor first.
