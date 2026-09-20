import type { CvTrack } from './cv'

export type JobStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected'
export type InboxStatus = 'new' | 'approved' | 'dismissed'

export interface InterviewRound {
  id: string
  /** Local calendar day (YYYY-MM-DD). */
  date: string
  /** Round name, such as "Screen" or "Technical". Required. */
  label: string
  /** True after the call has happened. */
  done: boolean
}

/** Follow-up for the latest interview by date. */
export type InterviewFollowUp = 'pending' | 'waiting'

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
  /** Every scheduled round for this application. Kept if the job leaves Interview. */
  interviews: InterviewRound[]
  notes: string
  /** Full original job posting text — never replace with an AI summary. */
  jobDescription: string
  /** Short AI brief of the posting (separate from personal/interview notes). */
  jdSummary: string
  extractedSkills: string[]
  extractedRequirements: string[]
  /**
   * Gap-check skills the user confirmed they know (were "missing" on Master CV).
   * Used for coverage % and included when tailoring the resume for this job.
   */
  claimedSkills: string[]
  source: string
  externalId: string
  /** Saved search that surfaced this job (Adzuna inbox approve only). */
  savedSearchId: string | null
  matchScore: number | null
  cvTrack: CvTrack | null
  /**
   * False when JD is an API listing preview/snippet (Adzuna, etc.).
   * True after the full posting is parsed and scored.
   */
  jdComplete: boolean
  /**
   * True after an agent replaces the snippet with the full posting.
   * Scoring still waits for a manual Rescore. Cleared once that runs.
   */
  needsRescore: boolean
  /** Soft-delete timestamp — set when moved to Trash; null when active on the board. */
  deletedAt: string | null
  /**
   * Interview reached a decision and the candidate was not selected.
   * The job stays in Interview; it is not a rejection.
   */
  notSelected: boolean
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
  /** Adzuna `what_phrase` — exact phrase (one term / spelling per saved search). */
  query: string
  location: string
  country: string
  maxDaysOld: number
  /** Space-separated terms for Adzuna what_exclude (e.g. coop internship). */
  excludeTerms: string
  /** Which master CV to score against (auto = best of both). */
  track: SearchTrack
  active: boolean
  /** Manual list order (drag-and-drop). Lower runs / displays first. */
  sortOrder: number
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
   * How many inbox refreshes have returned this listing while it was still reviewable.
   * 1 = first time seen; >1 = matched again before dismiss/approve.
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
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-300 dark:border-sky-800',
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

const INTERVIEW_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function calendarToday(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Accepts the interviews list, or a legacy single `interviewDate` from older saves.
 */
export function resolveInterviews(input: {
  interviews?: unknown
  interviewDate?: string | null
}): InterviewRound[] {
  const rawList = Array.isArray(input.interviews) ? input.interviews : []
  const rounds: InterviewRound[] = []
  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue
    const raw = item as { id?: unknown; date?: unknown; label?: unknown; done?: unknown }
    const date = typeof raw.date === 'string' ? raw.date.slice(0, 10) : ''
    if (!INTERVIEW_DATE_RE.test(date)) continue
    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id : `interview-${date}-${rounds.length}`
    const label = typeof raw.label === 'string' ? raw.label.trim() : ''
    rounds.push({ id, date, label, done: raw.done === true })
  }
  if (rounds.length === 0) {
    const legacy = (input.interviewDate ?? '').slice(0, 10)
    if (INTERVIEW_DATE_RE.test(legacy)) {
      rounds.push({ id: `legacy-${legacy}`, date: legacy, label: '', done: false })
    }
  }
  rounds.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  return rounds
}

/** Next upcoming round, or the latest one when every date is in the past. */
export function interviewBoardLine(rounds: InterviewRound[], today = calendarToday()): string | null {
  if (rounds.length === 0) return null
  const upcoming = rounds.filter((round) => round.date >= today)
  const focus = upcoming[0] ?? rounds[rounds.length - 1]
  const name = focus.label || 'Interview'
  const when = formatInterviewDate(focus.date)
  const extra = upcoming.length > 1 ? ` · +${upcoming.length - 1}` : ''
  return `${name} · ${when}${extra}`
}

export function isUpcomingInterview(round: InterviewRound, today = calendarToday()): boolean {
  return round.date >= today
}

/** The last interview by date decides whether you are still pending or waiting on an answer. */
export function latestInterviewFollowUp(rounds: InterviewRound[]): InterviewFollowUp | null {
  if (rounds.length === 0) return null
  return rounds[rounds.length - 1].done ? 'waiting' : 'pending'
}

export const INTERVIEW_FOLLOW_UP_LABEL: Record<InterviewFollowUp, string> = {
  pending: 'Pending',
  waiting: 'Awaiting answer',
}

/** Inbox approve writes this into notes; it is not a personal comment. */
export function personalNotesText(notes: string): string {
  if (/^Approved from inbox\b/i.test(notes.trim())) return ''
  return notes
}

export function formatInterviewDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return value
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return value
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
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
    interviews: [],
    notes: '',
    jobDescription: '',
    jdSummary: '',
    extractedSkills: [],
    extractedRequirements: [],
    claimedSkills: [],
    source: 'indeed',
    externalId: '',
    savedSearchId: null,
    matchScore: null,
    cvTrack: null,
    jdComplete: true,
    needsRescore: false,
    deletedAt: null,
    notSelected: false,
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
    track: 'powerPlatform',
    active: true,
    sortOrder: 0,
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
    sortOrder: 0,
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
    sortOrder: 1,
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
    sortOrder: 2,
  },
  {
    label: 'Power Apps',
    query: 'Power Apps',
    location: 'Toronto / Mississauga / Remote',
    country: 'ca',
    maxDaysOld: 7,
    excludeTerms: '',
    track: 'powerPlatform',
    active: true,
    sortOrder: 3,
  },
  {
    label: 'Power Automate',
    query: 'Power Automate',
    location: 'Toronto / Mississauga / Remote',
    country: 'ca',
    maxDaysOld: 7,
    excludeTerms: '',
    track: 'powerPlatform',
    active: true,
    sortOrder: 4,
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
