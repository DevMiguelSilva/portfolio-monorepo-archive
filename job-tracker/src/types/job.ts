export type JobStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected'

export interface JobApplication {
  id: string
  company: string
  role: string
  location: string
  jobUrl: string
  salary: string
  status: JobStatus
  appliedDate: string
  notes: string
  jobDescription: string
  extractedSkills: string[]
  extractedRequirements: string[]
  createdAt: string
  updatedAt: string
}

export interface UserProfile {
  name: string
  headline: string
  skills: string
  experienceSummary: string
}

export interface ParsedJobPosting {
  company: string
  role: string
  location: string
  skills: string[]
  requirements: string[]
  summary: string
}

export const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  saved: {
    label: 'Saved',
    color: 'text-slate-600 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-track-800',
    border: 'border-slate-300 dark:border-track-700',
  },
  applied: {
    label: 'Applied',
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    border: 'border-indigo-300 dark:border-indigo-800',
  },
  interview: {
    label: 'Interview',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-300 dark:border-amber-800',
  },
  offer: {
    label: 'Offer',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-300 dark:border-emerald-800',
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-300 dark:border-red-800',
  },
}

export const STATUS_ORDER: JobStatus[] = ['saved', 'applied', 'interview', 'offer', 'rejected']

export function createEmptyJob(overrides: Partial<JobApplication> = {}): JobApplication {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    company: '',
    role: '',
    location: '',
    jobUrl: '',
    salary: '',
    status: 'saved',
    appliedDate: '',
    notes: '',
    jobDescription: '',
    extractedSkills: [],
    extractedRequirements: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export const EMPTY_PROFILE: UserProfile = {
  name: '',
  headline: '',
  skills: '',
  experienceSummary: '',
}

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Miguel Silva',
  headline: 'Front-end Software Engineer | React · TypeScript · JavaScript',
  skills:
    'React, TypeScript, JavaScript, REST APIs, Agile, CI/CD, Power Apps, Power Automate, Dataverse, Accessible UI, Responsive Design',
  experienceSummary:
    'Front-end Software Engineer with 5+ years of experience crafting responsive, performant web applications using React, TypeScript, JavaScript, and modern UI frameworks. Adept at creating pixel-perfect, accessible interfaces and integrating REST APIs for dynamic user experiences. Experienced in Agile development environments, CI/CD workflows, and cross-functional collaboration with designers, backend teams, and stakeholders. Complemented by hands-on experience with Microsoft Power Platform (Power Apps, Power Automate, Dataverse), supporting hybrid applications where full-code and low-code solutions intersect. Passionate about clean code, scalable architecture, and delivering consistent, user-centered design at enterprise scale.',
}

export function isProfileEmpty(profile: UserProfile): boolean {
  return !profile.name.trim() && !profile.experienceSummary.trim()
}
