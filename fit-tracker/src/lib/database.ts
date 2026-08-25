import type { Exercise, Routine, Session, WeekGoal, WeightEntry } from '../types/fit'

export interface RoutineRow {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface ExerciseRow {
  id: string
  user_id: string
  routine_id: string
  name: string
  sets: number
  reps: number
  load_lb: number | string | null
  sort_order: number
}

export interface SessionRow {
  id: string
  user_id: string
  day: string
  routine_id: string
  completed_sets: unknown
  actual_loads?: unknown
  finished?: boolean | null
  updated_at: string
}

export interface WeightRow {
  id: string
  user_id: string
  day: string
  kg: number | string
  updated_at: string
}

function asNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function asLoadMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, number> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const n = asNumber(raw as number | string | null)
    if (n != null) out[key] = n
  }
  return out
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

export function routineToRow(routine: Routine, userId: string): RoutineRow {
  return {
    id: routine.id,
    user_id: userId,
    name: routine.name,
    created_at: routine.createdAt,
    updated_at: routine.updatedAt,
  }
}

export function rowToRoutine(row: RoutineRow): Routine {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function exerciseToRow(exercise: Exercise, userId: string): ExerciseRow {
  return {
    id: exercise.id,
    user_id: userId,
    routine_id: exercise.routineId,
    name: exercise.name,
    sets: exercise.sets,
    reps: exercise.reps,
    load_lb: exercise.loadLb,
    sort_order: exercise.sortOrder,
  }
}

export function rowToExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    routineId: row.routine_id,
    name: row.name,
    sets: row.sets,
    reps: row.reps,
    loadLb: asNumber(row.load_lb),
    sortOrder: row.sort_order,
  }
}

export function sessionToRow(session: Session, userId: string) {
  return {
    id: session.id,
    user_id: userId,
    day: session.date,
    routine_id: session.routineId,
    completed_sets: session.completedSets,
    actual_loads: session.actualLoads ?? {},
    finished: session.finished ?? false,
    updated_at: session.updatedAt,
  }
}

export function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    date: row.day,
    routineId: row.routine_id,
    completedSets: asStringArray(row.completed_sets),
    actualLoads: asLoadMap(row.actual_loads),
    finished: Boolean(row.finished),
    updatedAt: row.updated_at,
  }
}

export function weightToRow(entry: WeightEntry, userId: string) {
  return {
    id: entry.id,
    user_id: userId,
    day: entry.date,
    kg: entry.kg,
    updated_at: entry.updatedAt,
  }
}

export function rowToWeight(row: WeightRow): WeightEntry {
  return {
    id: row.id,
    date: row.day,
    kg: asNumber(row.kg) ?? 0,
    updatedAt: row.updated_at,
  }
}

export interface WeekGoalRow {
  id: string
  user_id: string
  monday: string
  goal: number
}

export function weekGoalToRow(goal: WeekGoal, userId: string): WeekGoalRow {
  return {
    id: goal.id,
    user_id: userId,
    monday: goal.monday,
    goal: goal.goal,
  }
}

export function rowToWeekGoal(row: WeekGoalRow): WeekGoal {
  return {
    id: row.id,
    monday: row.monday,
    goal: row.goal,
  }
}
