export interface LocationSearchLeg {
  /** Empty string = Canada-wide (no Adzuna `where`). */
  location: string
  /** True when this leg came from a Remote token. */
  isRemote: boolean
  label: string
}

const REMOTE_TOKENS = new Set([
  'remote',
  'remote canada',
  'canada remote',
  'anywhere',
  'anywhere in canada',
  'work from home',
  'wfh',
])

function isRemoteToken(token: string): boolean {
  const t = token.toLowerCase().replace(/\s+/g, ' ').trim()
  if (REMOTE_TOKENS.has(t)) return true
  // "Remote - Canada", "Remote (Canada)", etc.
  if (/^remote\b/.test(t) && t.length <= 40) return true
  return false
}

/**
 * Split a location field like "Toronto / Mississauga / Remote" into
 * separate Adzuna search legs. Remote → no `where` (country=ca only).
 */
export function expandSearchLocations(locationField: string): LocationSearchLeg[] {
  const raw = locationField.trim()
  if (!raw) {
    return [{ location: '', isRemote: false, label: 'Canada (any)' }]
  }

  const parts = raw
    .split(/[/|,]+/)
    .map((p) => p.trim())
    .filter(Boolean)

  if (parts.length === 0) {
    return [{ location: '', isRemote: false, label: 'Canada (any)' }]
  }

  const legs: LocationSearchLeg[] = []
  const seen = new Set<string>()

  for (const part of parts) {
    if (isRemoteToken(part)) {
      const key = '__remote__'
      if (seen.has(key)) continue
      seen.add(key)
      legs.push({ location: '', isRemote: true, label: 'Remote (Canada-wide)' })
      continue
    }

    const key = part.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    legs.push({ location: part, isRemote: false, label: part })
  }

  return legs.length > 0 ? legs : [{ location: '', isRemote: false, label: 'Canada (any)' }]
}
