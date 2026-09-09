import type { JobStatus } from '../types/job'
import { localDateKey } from '../types/portal'

const APPLY_STATUSES = new Set<JobStatus>(['applied', 'interview', 'offer', 'rejected'])

/** Local calendar day for an ISO timestamp (browser timezone). */
export function localDayFromIso(iso: string | undefined): string | null {
  if (!iso?.trim()) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return localDateKey(d)
}

/**
 * Normalize appliedDate for streak / display.
 * - Saved → empty
 * - Apply pipeline → local YYYY-MM-DD, never after last activity day or today
 * - Repairs UTC bug where evening applies were stored as "tomorrow"
 */
export function resolveAppliedDate(
  status: JobStatus,
  appliedDate: string | undefined,
  updatedAt?: string
): string {
  if (!APPLY_STATUSES.has(status)) return ''

  const today = localDateKey()
  const activityDay = localDayFromIso(updatedAt) ?? today

  let d = (appliedDate ?? '').trim().slice(0, 10)
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return activityDay
  }

  // Stored date ahead of when the row was last touched locally (classic UTC skew).
  if (d > activityDay) d = activityDay
  if (d > today) d = today
  return d
}
