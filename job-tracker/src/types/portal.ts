export type PortalSource = 'indeed' | 'ziprecruiter' | 'linkedin' | 'other'

export interface PortalFeed {
  id: string
  name: string
  url: string
  source: PortalSource
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/** One calendar day of portal-check activity (local timezone date). */
export interface HuntDay {
  date: string
  checkedFeedIds: string[]
  updatedAt: string
}

export const PORTAL_SOURCE_LABELS: Record<PortalSource, string> = {
  indeed: 'Indeed',
  ziprecruiter: 'ZipRecruiter',
  linkedin: 'LinkedIn',
  other: 'Other',
}

export function createEmptyPortalFeed(overrides: Partial<PortalFeed> = {}): PortalFeed {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: '',
    url: '',
    source: 'indeed',
    active: true,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/** Local calendar date YYYY-MM-DD */
export function localDateKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function guessPortalSource(url: string): PortalSource {
  const u = url.toLowerCase()
  if (u.includes('indeed.')) return 'indeed'
  if (u.includes('ziprecruiter.')) return 'ziprecruiter'
  if (u.includes('linkedin.')) return 'linkedin'
  return 'other'
}
