# Architecture — Portfolio monorepo

This repo is a **monorepo of independent products**, not one embedded app.

```
C:\Dev\Portfolio/             ← repo root (open this folder in Cursor)
├── portfolio/              ← marketing site (about you, project links)
├── job-tracker/            ← ApplyTrack (standalone product)
├── ARCHITECTURE.md
├── DEPLOY.md
└── README.md
```

## Principles

1. **Each app is deployable on its own** — separate Vercel project, root directory, env vars, domain.
2. **Portfolio only links to products** — URLs in `portfolio/src/data/portfolio.ts` and env vars. No shared React code.
3. **Products never depend on the portfolio** — ApplyTrack must work at its own URL with no reference to the portfolio site.
4. **Same repo is fine** — split into separate GitHub repos only when a product needs its own public identity, collaborators, or SaaS ops.

## Local paths

```bash
# Portfolio site
cd portfolio && npm install && npm run dev

# ApplyTrack
cd job-tracker && npm install && npm run dev
```

## Adding a third project

1. Create a sibling folder: `Portfolio/my-new-app/`
2. Deploy as its own Vercel project (set Root Directory)
3. Add a card in `portfolio/src/data/portfolio.ts` with `liveUrl` and `githubUrl`

## When to extract a product to its own repo

- Custom domain and product branding (e.g. applytrack.app)
- Open source, issues, releases, or collaborators
- Billing, terms, privacy as a commercial SaaS

Until then, keep the monorepo and separate deploys.
