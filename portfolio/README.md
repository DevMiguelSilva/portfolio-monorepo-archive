# Miguel Silva — Portfolio Site

Personal portfolio showcasing software development projects built with React and TypeScript.

## Sections

- **Hero** — Introduction, LinkedIn & GitHub links
- **About** — Professional background
- **Projects** — ApplyTrack (featured) and FitTrack
- **Skills** — Tech stack
- **Contact** — LinkedIn & GitHub

## Run locally

```bash
npm install
npm run dev
```

## Environment variables

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `VITE_JOB_TRACKER_URL` | Deployed job tracker URL |
| `VITE_FIT_TRACKER_URL` | Deployed FitTrack URL |
| `VITE_GITHUB_URL` | Your GitHub profile |
| `VITE_LINKEDIN_URL` | Your LinkedIn profile |

## Deploy

Deploy on Vercel with **Root Directory** set to `portfolio`.

See [../DEPLOY.md](../DEPLOY.md) for the full guide.
