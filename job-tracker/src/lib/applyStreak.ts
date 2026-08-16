import type { JobApplication } from '../types/job'
import { localDateKey } from '../types/portal'
import type { HeatLevel } from './huntStreak'

const APPLY_STATUSES = new Set(['applied', 'interview', 'offer', 'rejected'])

/** Count applications per calendar day from appliedDate (YYYY-MM-DD). */
export function buildApplyCountsByDate(jobs: JobApplication[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const job of jobs) {
    // Only count jobs still in the apply pipeline (moving back to Saved undoes the apply)
    if (!APPLY_STATUSES.has(job.status)) continue
    const date = job.appliedDate?.trim()
    if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) continue
    const key = date.slice(0, 10)
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return map
}

export function applyCountToLevel(count: number): HeatLevel {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  return 3
}

export function computeApplyStreak(
  countsByDate: Map<string, number>,
  today = localDateKey()
): number {
  let cursor = new Date(`${today}T12:00:00`)
  if ((countsByDate.get(today) ?? 0) === 0) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  for (let i = 0; i < 400; i++) {
    const key = localDateKey(cursor)
    if ((countsByDate.get(key) ?? 0) === 0) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function countApplyDaysInYear(countsByDate: Map<string, number>, year: number): number {
  let n = 0
  for (const [date, count] of countsByDate) {
    if (!date.startsWith(String(year))) continue
    if (count > 0) n += 1
  }
  return n
}

export function applicationsToday(countsByDate: Map<string, number>, today = localDateKey()): number {
  return countsByDate.get(today) ?? 0
}
