import type { JobApplication } from '../types/job'

export function normalizeJobSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Host + path fragment for matching pasted listing URLs. */
export function jobUrlSearchKey(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  try {
    const u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
    return `${u.hostname}${u.pathname}`.toLowerCase().replace(/\/$/, '')
  } catch {
    return normalizeJobSearchText(trimmed)
  }
}

export function jobMatchesSearch(job: JobApplication, query: string): boolean {
  const q = normalizeJobSearchText(query)
  if (!q) return true

  const fields = [job.company, job.role, job.location, job.jobUrl, job.externalId, job.notes]
  if (fields.some((f) => normalizeJobSearchText(f).includes(q))) return true

  const urlKey = jobUrlSearchKey(job.jobUrl)
  const queryUrlKey = jobUrlSearchKey(query)
  if (urlKey && queryUrlKey && (urlKey.includes(queryUrlKey) || queryUrlKey.includes(urlKey))) {
    return true
  }

  return false
}

export function filterJobsBySearch(jobs: JobApplication[], query: string): JobApplication[] {
  const q = query.trim()
  if (!q) return jobs
  return jobs.filter((job) => jobMatchesSearch(job, q))
}

export type JobSearchHit = {
  job: JobApplication
  trashed: boolean
}

export function collectSearchHits(
  activeJobs: JobApplication[],
  trashedJobs: JobApplication[],
  query: string
): JobSearchHit[] {
  const q = query.trim()
  if (!q) return []
  const hits: JobSearchHit[] = []
  for (const job of activeJobs) {
    if (jobMatchesSearch(job, q)) hits.push({ job, trashed: false })
  }
  for (const job of trashedJobs) {
    if (jobMatchesSearch(job, q)) hits.push({ job, trashed: true })
  }
  return hits
}
