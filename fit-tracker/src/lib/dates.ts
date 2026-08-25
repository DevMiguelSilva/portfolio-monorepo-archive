/** Local calendar date YYYY-MM-DD */
export function localDateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function shiftDateKey(dateKey: string, days: number): string {
  const dt = parseDateKey(dateKey)
  dt.setDate(dt.getDate() + days)
  return localDateKey(dt)
}

export function formatLongDate(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString('en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function formatShortDate(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
  })
}

export function formatShortWeekday(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString('en-CA', { weekday: 'short' })
}

/** Monday of the week containing dateKey (local). */
export function mondayOf(dateKey: string): string {
  const dt = parseDateKey(dateKey)
  const day = dt.getDay()
  const diff = day === 0 ? -6 : 1 - day
  dt.setDate(dt.getDate() + diff)
  return localDateKey(dt)
}

export function sundayOf(mondayKey: string): string {
  return shiftDateKey(mondayKey, 6)
}

export function formatWeekLabel(mondayKey: string): string {
  return `${formatShortDate(mondayKey)} – ${formatShortDate(sundayOf(mondayKey))}`
}

export function isInWeek(dateKey: string, mondayKey: string): boolean {
  return dateKey >= mondayKey && dateKey <= sundayOf(mondayKey)
}

export function nowIso(): string {
  return new Date().toISOString()
}
