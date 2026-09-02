import type { HuntDay } from '../types/portal'
import { localDateKey } from '../types/portal'

export type HeatLevel = 0 | 1 | 2 | 3

/** 0 none · 1 partial · 2 all feeds · 3 all feeds + bonus (reserved) */
export function dayHeatLevel(
  day: HuntDay | undefined,
  activeFeedIds: string[]
): HeatLevel {
  if (!day || day.checkedFeedIds.length === 0 || activeFeedIds.length === 0) return 0
  const checked = new Set(day.checkedFeedIds)
  const hit = activeFeedIds.filter((id) => checked.has(id)).length
  if (hit === 0) return 0
  if (hit >= activeFeedIds.length) return 2
  return 1
}

export function isDayComplete(day: HuntDay | undefined, activeFeedIds: string[]): boolean {
  return dayHeatLevel(day, activeFeedIds) >= 2
}

/** Consecutive complete days ending today (or yesterday if today incomplete). */
export function computeStreak(
  daysByDate: Map<string, HuntDay>,
  activeFeedIds: string[],
  today = localDateKey()
): number {
  if (activeFeedIds.length === 0) return 0

  let cursor = new Date(`${today}T12:00:00`)
  // If today isn't complete yet, streak can still count through yesterday
  if (!isDayComplete(daysByDate.get(today), activeFeedIds)) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  for (let i = 0; i < 400; i++) {
    const key = localDateKey(cursor)
    if (!isDayComplete(daysByDate.get(key), activeFeedIds)) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/**
 * Build grid cells for a GitHub-style heatmap.
 * Always includes the current week (Sun–Sat) so today is never clipped off.
 */
export function buildHeatmapCells(
  weeks: number,
  daysByDate: Map<string, HuntDay>,
  activeFeedIds: string[],
  today = new Date()
): HeatCell[] {
  return buildHeatmapCellsFromLevel(weeks, (date) => dayHeatLevel(daysByDate.get(date), activeFeedIds), today)
}

export type HeatCell = {
  date: string
  level: HeatLevel
  weekIndex: number
  weekday: number
  /** True for days after today (current week padding) — render as empty outline, not “missed”. */
  isFuture: boolean
}

/** Shared calendar grid builder — last `weeks` weeks ending on the week that contains today. */
export function buildHeatmapCellsFromLevel(
  weeks: number,
  levelForDate: (date: string) => HeatLevel,
  today = new Date()
): HeatCell[] {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0)

  // Sunday of the week that contains today
  const thisSunday = new Date(end)
  thisSunday.setDate(thisSunday.getDate() - thisSunday.getDay())

  // Sunday `weeks - 1` weeks earlier
  const start = new Date(thisSunday)
  start.setDate(start.getDate() - (weeks - 1) * 7)

  return buildHeatmapRange(start, thisSunday, end, levelForDate)
}

/**
 * Full calendar year: Jan (week of Jan 1) through Dec (week of Dec 31).
 * Days after today are marked isFuture so they render as empty outlines, not "missed".
 */
export function buildYearHeatmapCellsFromLevel(
  levelForDate: (date: string) => HeatLevel,
  today = new Date()
): HeatCell[] {
  const todayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0)
  const jan1 = new Date(today.getFullYear(), 0, 1, 12, 0, 0, 0)
  const start = new Date(jan1)
  start.setDate(jan1.getDate() - jan1.getDay())

  const dec31 = new Date(today.getFullYear(), 11, 31, 12, 0, 0, 0)
  const endSunday = new Date(dec31)
  endSunday.setDate(dec31.getDate() - dec31.getDay())

  return buildHeatmapRange(start, endSunday, todayNoon, levelForDate)
}

function buildHeatmapRange(
  startSunday: Date,
  endSunday: Date,
  todayNoon: Date,
  levelForDate: (date: string) => HeatLevel
): HeatCell[] {
  const cells: HeatCell[] = []
  let weekIndex = 0

  while (weekIndex <= 60) {
    const weekStart = new Date(startSunday)
    weekStart.setDate(startSunday.getDate() + weekIndex * 7)
    if (weekStart.getTime() > endSunday.getTime()) break

    for (let weekday = 0; weekday < 7; weekday++) {
      const cellDate = new Date(weekStart)
      cellDate.setDate(weekStart.getDate() + weekday)
      const isFuture = cellDate.getTime() > todayNoon.getTime()
      cells.push({
        date: localDateKey(cellDate),
        level: isFuture ? 0 : levelForDate(localDateKey(cellDate)),
        weekIndex,
        weekday,
        isFuture,
      })
    }
    weekIndex += 1
  }

  return cells
}

export function countCompleteDaysInYear(
  daysByDate: Map<string, HuntDay>,
  activeFeedIds: string[],
  year: number
): number {
  let n = 0
  for (const [date, day] of daysByDate) {
    if (!date.startsWith(String(year))) continue
    if (isDayComplete(day, activeFeedIds)) n += 1
  }
  return n
}
