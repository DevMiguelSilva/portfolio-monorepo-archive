import { getJobTrackerUrl } from '../config/links'

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
  { value: '1', label: 'Live portfolio app' },
  { value: 'AI', label: 'Tailored job-search tooling' },
]

export const GITHUB_URL =
  import.meta.env.VITE_GITHUB_URL || 'https://github.com/DevMiguelSilva'

export const LINKEDIN_URL =
  import.meta.env.VITE_LINKEDIN_URL || 'https://www.linkedin.com/in/miguel-silva-dev/'
