import { getFitTrackerUrl, getJobTrackerUrl } from '../config/links'

export interface Project {
  id: string
  title: string
  tagline: string
  description: string
  stack: string[]
  highlights: string[]
  liveUrl: string
  githubUrl: string
  featured?: boolean
  accent: string
}

export const projects: Project[] = [
  {
    id: 'job-tracker',
    title: 'ApplyTrack',
    tagline: 'AI-powered job search workspace',
    description:
      'A full job-search operating system I built for my own hunt in Canada. ApplyTrack pulls Adzuna listings into an inbox, scores each role against dual Master CVs (React and Microsoft Power Platform), and lets me approve the best fits onto a Kanban board — Saved, Applied, Interview, Offer, and Rejected. API listings arrive with short snippets, so I paste the full job description when needed; match scores and AI tailoring only run once the posting is complete. From there I generate ATS-tailored resume bullets and cover letters, export DOCX, track apply streaks, and prep for interviews — all synced to Supabase with sign-in.',
    stack: ['React', 'TypeScript', 'Gemini AI', 'Supabase', 'Adzuna API', 'Tailwind', 'Vite'],
    highlights: [
      'Inbox + dual-track match scoring',
      'Kanban pipeline with apply streaks',
      'AI tailor, gap report & DOCX export',
      'JD enrichment for API listings',
      'Cloud sync & authenticated sessions',
    ],
    liveUrl: getJobTrackerUrl(),
    githubUrl: 'https://github.com/DevMiguelSilva/Portfolio/tree/main/job-tracker',
    featured: true,
    accent: 'teal',
  },
  {
    id: 'fit-tracker',
    title: 'FitTrack',
    tagline: 'Workouts and weekly body weight',
    description:
      'A personal training log I built to keep routines, daily sessions, and body weight in one place. Each week I pick a routine, check off exercises, and record lift loads in pounds for that session without changing the plan I use as a guide. Daily weigh-ins in kilograms roll into a weekly average that skips missed days instead of treating them as zero. Optional Supabase sign-in syncs across devices; without it, data stays on the device.',
    stack: ['React', 'TypeScript', 'Supabase', 'Tailwind', 'Vite'],
    highlights: [
      'Custom routines and a once-per-week session',
      'Session loads vs routine guide (lb)',
      'Daily kg log and weekly average',
      'Week goal from routines you had on Monday',
      'Cloud sync or local-only fallback',
    ],
    liveUrl: getFitTrackerUrl(),
    githubUrl: 'https://github.com/DevMiguelSilva/Portfolio/tree/main/fit-tracker',
    featured: true,
    accent: 'orange',
  },
]

export const skillGroups = [
  {
    label: 'Front-end',
    items: ['React', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'Accessible UI', 'Responsive design'],
  },
  {
    label: 'Back-end & data',
    items: ['REST APIs', 'Supabase', 'PostgreSQL', 'Gemini AI integrations'],
  },
  {
    label: 'Workflow',
    items: ['Git & CI/CD', 'Agile', 'Vercel deployments', 'Cross-functional collaboration'],
  },
  {
    label: 'Microsoft',
    items: ['Power Apps', 'Power Automate', 'Dataverse', 'Hybrid low-code + full-code'],
  },
]

export const stats = [
  { value: '6+', label: 'Years front-end experience' },
  { value: '2', label: 'Live portfolio apps' },
  { value: 'AI', label: 'Tailored job-search tooling' },
]

export const GITHUB_URL =
  import.meta.env.VITE_GITHUB_URL || 'https://github.com/DevMiguelSilva'

export const LINKEDIN_URL =
  import.meta.env.VITE_LINKEDIN_URL || 'https://www.linkedin.com/in/miguel-silva-dev/'
