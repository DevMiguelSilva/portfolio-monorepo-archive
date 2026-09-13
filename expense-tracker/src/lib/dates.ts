/** Local calendar month key YYYY-MM */
export function monthKeyFromDate(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function monthKeyFromIsoDate(isoDate: string): string {
  return isoDate.slice(0, 7)
}

export function localDateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number)
  const next = new Date(year, month - 1 + delta, 1)
  return monthKeyFromDate(next)
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-CA', {
    month: 'long',
    year: 'numeric',
  })
}

export function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
  })
}

export function daysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

export function dayOfMonth(isoDate: string): number {
  return Number(isoDate.slice(8, 10))
}

export function isCurrentMonth(monthKey: string): boolean {
  return monthKey === monthKeyFromDate()
}

/** 1-based day; if viewing a past/future month, use last/first day for pace. */
export function referenceDay(monthKey: string): number {
  if (isCurrentMonth(monthKey)) return new Date().getDate()
  const todayKey = monthKeyFromDate()
  return monthKey < todayKey ? daysInMonth(monthKey) : 1
}
