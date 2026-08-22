import type { CvTrack } from './cv'

export type JobStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected'
export type InboxStatus = 'new' | 'approved' | 'dismissed'
export type SearchTrack = CvTrack | 'auto'

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
  /** Full original job posting text — never replace with an AI summary. */
  jobDescription: string
  /** Short AI brief of the posting (separate from personal/interview notes). */
  jdSummary: string
  extractedSkills: string[]
  extractedRequirements: string[]
  source: string
  externalId: string
  matchScore: number | null
  cvTrack: CvTrack | null
  /**
   * False when JD is an API listing preview/snippet (Adzuna, etc.).
   * True after manual paste of the full posting (Add Job or Job Detail enrich).
   */
  jdComplete: boolean
  /** Soft-delete timestamp — set when moved to Trash; null when active on the board. */
  deletedAt: string | null
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
  salary: string
  skills: string[]
  requirements: string[]
  summary: string
}

export interface SavedSearch {
  id: string
  /** Friendly name shown in the UI (e.g. "React Toronto"). */
  label: string
  query: string
  location: string
  country: string
  maxDaysOld: number
  excludeTerms: string
  /** Which master CV to score against (auto = best of both). */
  track: SearchTrack
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface InboxJob {
  id: string
  externalId: string
  source: string
  company: string
  role: string
  location: string
  jobUrl: string
  salary: string
  description: string
  matchScore: number
  matchReasons: string[]
  matchedTrack: CvTrack | null
  status: InboxStatus
  savedSearchId: string | null
  /**
   * How many inbox refreshes have returned this listing.
   * 1 = first time seen; >1 = matched again (dismissed ones can come back).
   */
  seenCount: number
  fetchedAt: string
  createdAt: string
  updatedAt: string
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

/** Board columns shown by default (Rejected is opt-in via the stats control). */
export const BOARD_STATUS_ORDER: JobStatus[] = ['saved', 'applied', 'interview', 'offer']

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
    jdSummary: '',
    extractedSkills: [],
    extractedRequirements: [],
    source: 'indeed',
    externalId: '',
    matchScore: null,
    cvTrack: null,
    jdComplete: true,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/** API providers that typically return listing previews, not a full pasted JD. */
const SNIPPET_SOURCES = new Set(['adzuna'])

/** Legacy rows without the flag: API snippets incomplete; portal/manual assumed full. */
export function resolveJdComplete(job: {
  jdComplete?: boolean | null
  source?: string | null
}): boolean {
  if (typeof job.jdComplete === 'boolean') return job.jdComplete
  const source = (job.source || 'manual').trim().toLowerCase()
  if (SNIPPET_SOURCES.has(source)) return false
  return true
}

/** Display labels for job/inbox provenance (APIs + portals). */
export const JOB_SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  adzuna: 'Adzuna',
  indeed: 'Indeed',
  ziprecruiter: 'ZipRecruiter',
  linkedin: 'LinkedIn',
  other: 'Other',
}

/**
 * Portal sources for jobs you paste yourself (Add Job).
 * Distinct from entry path: you always add those jobs manually; this is where the posting lived.
 */
export const PORTAL_JOB_SOURCE_OPTIONS = ['indeed', 'ziprecruiter', 'linkedin'] as const

export type PortalJobSource = (typeof PORTAL_JOB_SOURCE_OPTIONS)[number]

/** @deprecated use PORTAL_JOB_SOURCE_OPTIONS */
export const MANUAL_JOB_SOURCE_OPTIONS = PORTAL_JOB_SOURCE_OPTIONS

export function jobSourceLabel(source: string | null | undefined): string {
  const key = (source || 'manual').trim().toLowerCase()
  if (JOB_SOURCE_LABELS[key]) return JOB_SOURCE_LABELS[key]
  if (!key) return 'Manual'
  return key.charAt(0).toUpperCase() + key.slice(1)
}

/** Infer portal from a posting URL (unknown / empty → Indeed). */
export function guessJobSourceFromUrl(url: string): PortalJobSource {
  const u = url.trim().toLowerCase()
  if (u.includes('ziprecruiter.')) return 'ziprecruiter'
  if (u.includes('linkedin.')) return 'linkedin'
  return 'indeed'
}

export function createEmptySavedSearch(overrides: Partial<SavedSearch> = {}): SavedSearch {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    label: '',
    query: '',
    location: '',
    country: 'ca',
    maxDaysOld: 7,
    excludeTerms: '',
    track: 'auto',
    active: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export const DEFAULT_SAVED_SEARCHES: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    label: 'React Toronto',
    query: 'React TypeScript',
    location: 'Toronto',
    country: 'ca',
    maxDaysOld: 7,
    excludeTerms: '',
    track: 'frontend',
    active: true,
  },
  {
    label: 'FE Vancouver',
    query: 'Front End Engineer',
    location: 'Vancouver',
    country: 'ca',
    maxDaysOld: 7,
    excludeTerms: '',
    track: 'frontend',
    active: true,
  },
  {
    label: 'React Remote CA',
    query: 'Frontend React TypeScript',
    location: 'Remote',
    country: 'ca',
    maxDaysOld: 7,
    excludeTerms: '',
    track: 'frontend',
    active: true,
  },
  {
    label: 'Power Platform Toronto',
    query: 'Power Platform Power Apps',
    location: 'Toronto',
    country: 'ca',
    maxDaysOld: 7,
    excludeTerms: '',
    track: 'powerPlatform',
    active: true,
  },
  {
    label: 'Power Automate Remote',
    query: 'Power Automate Dataverse',
    location: 'Remote',
    country: 'ca',
    maxDaysOld: 7,
    excludeTerms: '',
    track: 'powerPlatform',
    active: true,
  },
]

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

export function profileSkillsList(profile: UserProfile): string[] {
  return profile.skills
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
