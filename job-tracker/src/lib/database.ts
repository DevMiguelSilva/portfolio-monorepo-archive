import type { CvTrack, GapReport, MasterCv, TailoredDocument } from '../types/cv'
import { EMPTY_GAP_REPORT } from '../types/cv'
import type { InboxJob, JobApplication, SavedSearch, SearchTrack, UserProfile } from '../types/job'
import { resolveJdComplete } from '../types/job'

export interface JobRow {
  id: string
  user_id: string
  company: string
  role: string
  location: string
  job_url: string
  salary: string
  status: JobApplication['status']
  applied_date: string
  notes: string
  job_description: string
  jd_summary?: string
  extracted_skills: string[]
  extracted_requirements: string[]
  source?: string
  external_id?: string
  match_score?: number | null
  cv_track?: string | null
  jd_complete?: boolean | null
  created_at: string
  updated_at: string
}

export interface ProfileRow {
  id: string
  name: string
  headline: string
  skills: string
  experience_summary: string
  updated_at: string
}

export interface SavedSearchRow {
  id: string
  user_id: string
  label?: string
  query: string
  location: string
  country: string
  max_days_old: number
  exclude_terms: string
  track?: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface InboxRow {
  id: string
  user_id: string
  external_id: string
  source: string
  company: string
  role: string
  location: string
  job_url: string
  salary: string
  description: string
  match_score: number
  match_reasons: string[]
  matched_track?: string | null
  status: InboxJob['status']
  saved_search_id: string | null
  fetched_at: string
  created_at: string
  updated_at: string
}

export interface MasterCvRow {
  id: string
  user_id: string
  document: unknown
  updated_at: string
}

export interface TailoredDocumentRow {
  id: string
  user_id: string
  job_application_id: string
  master_cv_snapshot: MasterCv
  tailored_cv: MasterCv
  cover_letter: string
  gap_report: GapReport
  match_score: number | null
  created_at: string
  updated_at: string
}

function asCvTrack(value: string | null | undefined): CvTrack | null {
  if (value === 'frontend' || value === 'powerPlatform') return value
  return null
}

function asSearchTrack(value: string | null | undefined): SearchTrack {
  if (value === 'frontend' || value === 'powerPlatform' || value === 'auto') return value
  return 'auto'
}

export function rowToJob(row: JobRow): JobApplication {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    location: row.location,
    jobUrl: row.job_url,
    salary: row.salary,
    status: row.status,
    appliedDate: row.applied_date,
    notes: row.notes,
    jobDescription: row.job_description,
    jdSummary: row.jd_summary ?? '',
    extractedSkills: row.extracted_skills ?? [],
    extractedRequirements: row.extracted_requirements ?? [],
    source: row.source ?? 'manual',
    externalId: row.external_id ?? '',
    matchScore: row.match_score ?? null,
    cvTrack: asCvTrack(row.cv_track),
    jdComplete: resolveJdComplete({
      jdComplete: row.jd_complete ?? undefined,
      source: row.source ?? 'manual',
    }),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function jobToRow(job: JobApplication, userId: string): Omit<JobRow, 'created_at' | 'updated_at'> {
  return {
    id: job.id,
    user_id: userId,
    company: job.company,
    role: job.role,
    location: job.location,
    job_url: job.jobUrl,
    salary: job.salary,
    status: job.status,
    applied_date: job.appliedDate,
    notes: job.notes,
    job_description: job.jobDescription,
    jd_summary: job.jdSummary,
    extracted_skills: job.extractedSkills,
    extracted_requirements: job.extractedRequirements,
    source: job.source,
    external_id: job.externalId,
    match_score: job.matchScore,
    cv_track: job.cvTrack,
    jd_complete: job.jdComplete,
  }
}

export function rowToProfile(row: ProfileRow): UserProfile {
  return {
    name: row.name,
    headline: row.headline,
    skills: row.skills,
    experienceSummary: row.experience_summary,
  }
}

export function profileToRow(profile: UserProfile, userId: string) {
  return {
    id: userId,
    name: profile.name,
    headline: profile.headline,
    skills: profile.skills,
    experience_summary: profile.experienceSummary,
    updated_at: new Date().toISOString(),
  }
}

export function rowToSavedSearch(row: SavedSearchRow): SavedSearch {
  return {
    id: row.id,
    label: row.label ?? '',
    query: row.query,
    location: row.location,
    country: row.country,
    maxDaysOld: row.max_days_old,
    excludeTerms: row.exclude_terms,
    track: asSearchTrack(row.track),
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function savedSearchToRow(
  search: SavedSearch,
  userId: string
): Omit<SavedSearchRow, 'created_at' | 'updated_at'> & { updated_at: string } {
  return {
    id: search.id,
    user_id: userId,
    label: search.label ?? '',
    query: search.query,
    location: search.location,
    country: search.country,
    max_days_old: search.maxDaysOld,
    exclude_terms: search.excludeTerms,
    track: search.track,
    active: search.active,
    updated_at: new Date().toISOString(),
  }
}

export function rowToInboxJob(row: InboxRow): InboxJob {
  return {
    id: row.id,
    externalId: row.external_id,
    source: row.source,
    company: row.company,
    role: row.role,
    location: row.location,
    jobUrl: row.job_url,
    salary: row.salary,
    description: row.description,
    matchScore: row.match_score,
    matchReasons: row.match_reasons ?? [],
    matchedTrack: asCvTrack(row.matched_track),
    status: row.status,
    savedSearchId: row.saved_search_id,
    fetchedAt: row.fetched_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function inboxJobToRow(
  job: InboxJob,
  userId: string
): Omit<InboxRow, 'created_at' | 'updated_at'> & { updated_at: string } {
  return {
    id: job.id,
    user_id: userId,
    external_id: job.externalId,
    source: job.source,
    company: job.company,
    role: job.role,
    location: job.location,
    job_url: job.jobUrl,
    salary: job.salary,
    description: job.description,
    match_score: job.matchScore,
    match_reasons: job.matchReasons,
    matched_track: job.matchedTrack,
    status: job.status,
    saved_search_id: job.savedSearchId,
    fetched_at: job.fetchedAt,
    updated_at: new Date().toISOString(),
  }
}

export function rowToTailoredDocument(row: TailoredDocumentRow): TailoredDocument {
  return {
    id: row.id,
    jobApplicationId: row.job_application_id,
    masterCvSnapshot: row.master_cv_snapshot,
    tailoredCv: row.tailored_cv,
    coverLetter: row.cover_letter ?? '',
    gapReport: row.gap_report ?? EMPTY_GAP_REPORT,
    matchScore: row.match_score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function tailoredDocumentToRow(doc: TailoredDocument, userId: string) {
  return {
    id: doc.id,
    user_id: userId,
    job_application_id: doc.jobApplicationId,
    master_cv_snapshot: doc.masterCvSnapshot,
    tailored_cv: doc.tailoredCv,
    cover_letter: doc.coverLetter,
    gap_report: doc.gapReport,
    match_score: doc.matchScore,
    updated_at: new Date().toISOString(),
  }
}
