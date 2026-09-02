import { useEffect, useMemo, useRef } from 'react'
import { applyCountToLevel } from '../lib/applyStreak'
import {
  buildHeatmapCells,
  buildHeatmapCellsFromLevel,
  buildYearHeatmapCellsFromLevel,
  dayHeatLevel,
  type HeatCell,
  type HeatLevel,
} from '../lib/huntStreak'
import type { HuntDay } from '../types/portal'

const LEVEL_CLASS: Record<HeatLevel, string> = {
  // Past empty — subtle fill (not the same as future outlines)
  0: 'bg-slate-100 dark:bg-track-800',
  // Clear steps so 1 / 2 / 3+ reads as distinct intensity
  1: 'bg-emerald-200 dark:bg-emerald-900/55',
  2: 'bg-emerald-500 dark:bg-emerald-600',
  3: 'bg-emerald-800 dark:bg-emerald-300',
}

const FUTURE_CLASS =
  'border border-dashed border-slate-300/90 bg-transparent dark:border-track-600 dark:bg-transparent'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface PortalHeatmapProps {
  variant: 'portal'
  daysByDate: Map<string, HuntDay>
  activeFeedIds: string[]
  /** Default: full calendar year (future weeks as empty outlines). */
  mode?: 'year' | 'rolling'
  weeks?: number
}

interface ApplyHeatmapProps {
  variant: 'apply'
  countsByDate: Map<string, number>
  mode?: 'year' | 'rolling'
  weeks?: number
}

type ActivityHeatmapProps = PortalHeatmapProps | ApplyHeatmapProps

export function ActivityHeatmap(props: ActivityHeatmapProps) {
  const mode = props.mode ?? 'year'
  const weeks = props.weeks ?? 26
  const year = new Date().getFullYear()
  const todayWeekRef = useRef<HTMLDivElement>(null)

  const cells = useMemo(() => {
    if (props.variant === 'portal') {
      if (mode === 'year') {
        return buildYearHeatmapCellsFromLevel((date) =>
          dayHeatLevel(props.daysByDate.get(date), props.activeFeedIds)
        )
      }
      return buildHeatmapCells(weeks, props.daysByDate, props.activeFeedIds)
    }
    const levelFor = (date: string) => applyCountToLevel(props.countsByDate.get(date) ?? 0)
    if (mode === 'year') return buildYearHeatmapCellsFromLevel(levelFor)
    return buildHeatmapCellsFromLevel(weeks, levelFor)
  }, [props, mode, weeks])

  const legend =
    props.variant === 'portal'
      ? 'Partial · All portals checked'
      : '1 apply · 2 applies · 3+ applies'

  const titleFor = (cell: HeatCell) => {
    if (cell.isFuture) return `${cell.date}: Upcoming`
    if (props.variant === 'portal') {
      const level = dayHeatLevel(props.daysByDate.get(cell.date), props.activeFeedIds)
      return `${cell.date}: ${
        level === 0
          ? 'No check-in'
          : level === 1
            ? 'Partial — some portals checked'
            : 'Complete — all portals checked'
      }`
    }
    const n = props.countsByDate.get(cell.date) ?? 0
    return `${cell.date}: ${n === 0 ? 'No applications' : `${n} application${n === 1 ? '' : 's'}`}`
  }

  const byWeek = useMemo(() => {
    const map = new Map<number, HeatCell[]>()
    for (const cell of cells) {
      const list = map.get(cell.weekIndex) ?? []
      list.push(cell)
      map.set(cell.weekIndex, list)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [cells])

  const todayWeekIndex = useMemo(() => {
    let best = -1
    for (const cell of cells) {
      if (!cell.isFuture) best = cell.weekIndex
    }
    return best
  }, [cells])

  useEffect(() => {
    todayWeekRef.current?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: 'instant',
    })
  }, [todayWeekIndex, cells.length])

  return (
    <div className="space-y-3">
      {mode === 'year' && (
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{year}</p>
      )}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <div className="flex flex-col justify-between py-1 text-[10px] text-slate-400">
          {WEEKDAYS.map((d, i) => (
            <span key={d} className={i % 2 === 1 ? 'invisible' : ''}>
              {d}
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          {byWeek.map(([weekIndex, weekCells]) => (
            <div
              key={weekIndex}
              ref={weekIndex === todayWeekIndex ? todayWeekRef : undefined}
              className="flex flex-col gap-1"
            >
              {weekCells.map((cell) => (
                <div
                  key={cell.date}
                  title={titleFor(cell)}
                  className={`h-3 w-3 rounded-sm ${
                    cell.isFuture ? FUTURE_CLASS : LEVEL_CLASS[cell.level]
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>Less</span>
        <span className={`h-3 w-3 rounded-sm ${LEVEL_CLASS[0]}`} />
        <span className={`h-3 w-3 rounded-sm ${LEVEL_CLASS[1]}`} />
        <span className={`h-3 w-3 rounded-sm ${LEVEL_CLASS[2]}`} />
        {props.variant === 'apply' && (
          <span className={`h-3 w-3 rounded-sm ${LEVEL_CLASS[3]}`} />
        )}
        <span>More</span>
        <span className="ml-2 text-slate-400">{legend}</span>
      </div>
    </div>
  )
}
