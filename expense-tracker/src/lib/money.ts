/** Parse a dollar string like "1,250.50" or "$40" into cents. */
export function parseMoneyInput(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, '').trim()
  if (!cleaned) return null
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}

export function centsToInput(cents: number): string {
  if (!Number.isFinite(cents) || cents === 0) return ''
  return (cents / 100).toFixed(2)
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(cents / 100)
}

export function clampPercent(used: number, planned: number): number {
  if (planned <= 0) return used > 0 ? 100 : 0
  return Math.min(100, Math.round((used / planned) * 100))
}
