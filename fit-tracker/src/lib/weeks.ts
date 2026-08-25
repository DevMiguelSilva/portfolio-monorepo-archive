import { isExerciseComplete, type Exercise, type FitState, type Session } from '../types/fit'
import { isInWeek, mondayOf, sundayOf } from './dates'

export interface WeekReport {
  monday: string
  sunday: string
  avgKg: number | null
  weighIns: number
  deltaKg: number | null
  daysTrained: number
  trainingGoal: number | null
  exercisesCompleted: number
  exercisesPlanned: number
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, n) => sum + n, 0) / values.length
}

function plannedExercisesForSession(session: Session, exercises: Exercise[]): number {
  return exercises.filter((ex) => ex.routineId === session.routineId).length
}

function completedExercisesForSession(session: Session, exercises: Exercise[]): number {
  return exercises.filter(
    (ex) => ex.routineId === session.routineId && isExerciseComplete(session, ex.id)
  ).length
}

export function buildWeekReports(state: FitState, todayKey: string): WeekReport[] {
  const currentMonday = mondayOf(todayKey)
  const mondaySet = new Set<string>([currentMonday])
  for (const entry of state.weights) mondaySet.add(mondayOf(entry.date))
  for (const session of state.sessions) mondaySet.add(mondayOf(session.date))

  const mondays = [...mondaySet].sort((a, b) => (a < b ? 1 : -1))

  const reports: WeekReport[] = mondays.map((monday) => {
    const weekWeights = state.weights.filter((w) => isInWeek(w.date, monday)).map((w) => w.kg)
    const weekSessions = state.sessions.filter((s) => isInWeek(s.date, monday))
    const trainedDates = new Set(weekSessions.map((s) => s.date))
    return {
      monday,
      sunday: sundayOf(monday),
      avgKg: mean(weekWeights),
      weighIns: weekWeights.length,
      deltaKg: null,
      daysTrained: trainedDates.size,
      trainingGoal: state.weekGoals.find((g) => g.monday === monday)?.goal ?? null,
      exercisesCompleted: weekSessions.reduce(
        (sum, session) => sum + completedExercisesForSession(session, state.exercises),
        0
      ),
      exercisesPlanned: weekSessions.reduce(
        (sum, session) => sum + plannedExercisesForSession(session, state.exercises),
        0
      ),
    }
  })

  for (let i = 0; i < reports.length; i++) {
    const older = reports[i + 1]
    if (reports[i].avgKg != null && older?.avgKg != null) {
      reports[i].deltaKg = reports[i].avgKg! - older.avgKg
    }
  }

  return reports
}

export function formatKg(kg: number): string {
  const rounded = Math.round(kg * 10) / 10
  return `${rounded.toFixed(1)} kg`
}

export function formatLb(lb: number): string {
  const rounded = Math.round(lb * 10) / 10
  return Number.isInteger(rounded) ? `${rounded} lb` : `${rounded} lb`
}

export function parsePositiveNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.')
  if (!trimmed) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

/** First date this week a routine was started, if any. */
export function routineUsedOn(state: FitState, monday: string, routineId: string): string | null {
  const hit = state.sessions.find((s) => s.routineId === routineId && isInWeek(s.date, monday))
  return hit?.date ?? null
}

export function weekGoalFor(state: FitState, monday: string): number | null {
  return state.weekGoals.find((g) => g.monday === monday)?.goal ?? null
}
