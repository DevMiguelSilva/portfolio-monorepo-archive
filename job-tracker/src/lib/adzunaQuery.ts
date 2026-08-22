/** Fold legacy combined Adzuna fields into a single query string. */
export function coalesceSearchQuery(input: {
  query?: string
  whatOr?: string
  whatAnd?: string
  whatPhrase?: string
}): string {
  const q = (input.query ?? '').trim()
  if (q) return q
  const parts = [
    (input.whatPhrase ?? '').trim(),
    (input.whatOr ?? '').replace(/\|/g, ' ').trim(),
    (input.whatAnd ?? '').trim(),
  ].filter(Boolean)
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}
